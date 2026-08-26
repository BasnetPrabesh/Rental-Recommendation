# rental_backend/items/utils.py

import math
import re
import time
from collections import Counter

import numpy as np
import requests


# ──────────────────────────────────────────────────────────────────
# Haversine distance
# ──────────────────────────────────────────────────────────────────

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two GPS points on Earth's surface.
    Returns distance in kilometers.
    """
    R = 6371.0

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(dlon / 2) ** 2)

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def bounding_box(lat, lon, radius_km):
    """
    Given a center point and a radius in km, returns an approximate
    (min_lat, max_lat, min_lon, max_lon) box that fully contains the
    circle of that radius — used as a cheap DB-level pre-filter before
    running the exact Haversine formula.
    """
    lat_delta = radius_km / 111.0
    cos_lat = max(math.cos(math.radians(lat)), 0.01)
    lon_delta = radius_km / (111.0 * cos_lat)

    return (
        lat - lat_delta, lat + lat_delta,
        lon - lon_delta, lon + lon_delta,
    )


# ──────────────────────────────────────────────────────────────────
# Geocoding — with a simple in-memory cache + rate limiting
# ──────────────────────────────────────────────────────────────────

_geocode_cache = {}
_last_geocode_call = 0.0
_MIN_GEOCODE_INTERVAL = 1.0


def geocode_location(location_text):
    """
    Convert a text address into (latitude, longitude) using Nominatim.
    Cached by normalized query text; rate-limited to respect Nominatim's
    ~1 request/second usage policy.
    """
    global _last_geocode_call

    cache_key = location_text.strip().lower()
    if cache_key in _geocode_cache:
        return _geocode_cache[cache_key]

    elapsed = time.monotonic() - _last_geocode_call
    if elapsed < _MIN_GEOCODE_INTERVAL:
        time.sleep(_MIN_GEOCODE_INTERVAL - elapsed)

    url = "https://nominatim.openstreetmap.org/search"
    search_query = f"{location_text}, Kathmandu, Nepal"
    params = {
        "q": search_query,
        "format": "json",
        "limit": 1,
        "countrycodes": "np",
    }
    headers = {"User-Agent": "RoomFinderApp/1.0"}

    try:
        _last_geocode_call = time.monotonic()
        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()
        results = response.json()

        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            _geocode_cache[cache_key] = (lat, lon)
            return lat, lon
        else:
            _geocode_cache[cache_key] = (None, None)
            return None, None

    except requests.RequestException as e:
        print(f"Geocoding failed: {e}")
        return None, None


# ──────────────────────────────────────────────────────────────────
# Tokenizing
# ──────────────────────────────────────────────────────────────────

STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "in", "on", "at",
    "to", "for", "of", "and", "or", "with", "this", "that", "it",
    "as", "by", "from", "be", "been", "being",
}


def tokenize(text, strip_stopwords=True):
    """
    Breaks text into lowercase words, stripping punctuation. Numbers
    stay attached to adjacent letters (e.g. "2bhk" stays whole).
    """
    text = text.lower()
    tokens = re.findall(r"[a-z0-9]+", text)
    if strip_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS]
    return tokens


# ──────────────────────────────────────────────────────────────────
# TF-IDF + Cosine Similarity
# Formulas hand-written; numpy used only for array arithmetic.
# ──────────────────────────────────────────────────────────────────

def build_vocabulary(tokenized_documents):
    """
    Collects every unique word across all documents into a fixed,
    sorted list (the vocabulary), and a lookup from word -> its index.
    """
    vocab = sorted({word for tokens in tokenized_documents for word in tokens})
    word_index = {word: i for i, word in enumerate(vocab)}
    return vocab, word_index


def compute_idf_vector(tokenized_documents, vocab, word_index):
    """
    Inverse Document Frequency, one value per vocabulary word.
    Smoothed IDF: log((n_docs+1)/(df+1)) + 1.
    """
    n_docs = len(tokenized_documents)
    df = np.zeros(len(vocab))
    for tokens in tokenized_documents:
        for word in set(tokens):
            df[word_index[word]] += 1
    return np.log((n_docs + 1) / (df + 1)) + 1


def document_to_tfidf_vector(tokens, vocab, word_index, idf):
    """
    Builds one document's TF-IDF vector: tf = count / total_words,
    vec[word's index] = tf * idf.
    """
    vec = np.zeros(len(vocab))
    if not tokens:
        return vec
    counts = Counter(tokens)
    total = len(tokens)
    for word, count in counts.items():
        idx = word_index.get(word)
        if idx is not None:
            vec[idx] = (count / total) * idf[idx]
    return vec


def cosine_similarity_matrix(matrix, query_vec):
    """
    Cosine similarity between query_vec and EVERY row of matrix at
    once — same formula as always, just vectorized.
    """
    dots = matrix @ query_vec
    doc_norms = np.linalg.norm(matrix, axis=1)
    query_norm = np.linalg.norm(query_vec)
    if query_norm == 0:
        return np.zeros(matrix.shape[0])
    denom = doc_norms * query_norm
    denom[denom == 0] = 1
    return dots / denom


_tfidf_cache = {"key": None, "vocab": None, "word_index": None, "idf": None, "matrix": None}


def _get_tfidf_matrix(documents):
    cache_key = hash(tuple(documents))
    if _tfidf_cache["key"] == cache_key:
        c = _tfidf_cache
        return c["vocab"], c["word_index"], c["idf"], c["matrix"]

    tokenized_docs = [tokenize(doc) for doc in documents]
    vocab, word_index = build_vocabulary(tokenized_docs)
    idf = compute_idf_vector(tokenized_docs, vocab, word_index)
    matrix = np.array([
        document_to_tfidf_vector(tokens, vocab, word_index, idf)
        for tokens in tokenized_docs
    ])

    _tfidf_cache.update(key=cache_key, vocab=vocab, word_index=word_index, idf=idf, matrix=matrix)
    return vocab, word_index, idf, matrix


def tfidf_search(query, documents):
    """
    Returns a list of similarity scores — one per document, aligned
    with `documents` — for how relevant each is to the query.
    """
    vocab, word_index, idf, matrix = _get_tfidf_matrix(documents)
    query_vec = document_to_tfidf_vector(tokenize(query), vocab, word_index, idf)
    scores = cosine_similarity_matrix(matrix, query_vec)
    return scores.tolist()


def find_similar_documents(target_index, documents, top_n=4):
    """
    Returns the top_n documents most similar to documents[target_index],
    as (index, score) tuples, score > 0 only.
    """
    vocab, word_index, idf, matrix = _get_tfidf_matrix(documents)
    target_vec = matrix[target_index]
    scores = cosine_similarity_matrix(matrix, target_vec)
    scores[target_index] = -1

    top_indices = np.argsort(scores)[::-1][:top_n]
    return [(int(i), float(scores[i])) for i in top_indices if scores[i] > 0]


def build_user_profile_vector(liked_indices, matrix):
    """
    Averages the TF-IDF vectors of every listing a user has liked into
    one "profile vector" describing what they tend to like.
    """
    return matrix[liked_indices].mean(axis=0)


def recommend_for_user(liked_listing_ids, all_listings, documents, top_n=8):
    """
    Ranks every listing a user HASN'T liked by cosine similarity to
    their averaged taste profile.
    """
    vocab, word_index, idf, matrix = _get_tfidf_matrix(documents)

    liked_indices = [i for i, l in enumerate(all_listings) if l.id in liked_listing_ids]
    if not liked_indices:
        return []

    profile_vector = build_user_profile_vector(liked_indices, matrix)
    scores = cosine_similarity_matrix(matrix, profile_vector)
    for i in liked_indices:
        scores[i] = -1

    top_indices = np.argsort(scores)[::-1][:top_n]
    return [(int(i), float(scores[i])) for i in top_indices if scores[i] > 0]


# ──────────────────────────────────────────────────────────────────
# Multi-factor recommendation
# Combines the existing TF-IDF text similarity with price, location,
# and category closeness — recommend_for_user() above only looked at
# text, so two rooms with similar-sounding descriptions but very
# different prices or locations were scored as equally "similar".
# ──────────────────────────────────────────────────────────────────

RECOMMEND_WEIGHTS = {
    "text": 0.15,          # TF-IDF similarity of title/location/category/description
    "price": 0.32,         # how close the price is
    "location": 0.28,      # how close the GPS coordinates are
    "category": 0.10,      # exact category match (1BHK, Hostel, etc.)
    "collaborative": 0.15, # "users with similar taste also liked/visited this" — see item_cooccurrence_similarity()
}

# Human-readable reason shown to the user for why a room was
# recommended — whichever weighted factor contributed the most to
# that room's score gets used as the label.
REASON_LABELS = {
    "text": "Similar to rooms you've shown interest in",
    "price": "Similar price range",
    "location": "Close to a room you liked",
    "category": "Same room type",
    "collaborative": "Popular with users who liked similar rooms",
}


def price_closeness(price_a, price_b, max_price_diff=15000):
    """
    1.0 = identical price, fading to 0.0 as the gap grows past
    max_price_diff (in the same currency units as Listing.price).
    """
    diff = abs(float(price_a) - float(price_b))
    return max(0.0, 1 - diff / max_price_diff)


def location_closeness(lat_a, lon_a, lat_b, lon_b, max_km=10):
    """
    1.0 = same spot, fading to 0.0 as distance grows past max_km.
    Returns 0.0 (not an error) if either point is missing coordinates,
    so ungeocoded listings just don't get a location boost.
    """
    if None in (lat_a, lon_a, lat_b, lon_b):
        return 0.0
    dist = haversine_distance(lat_a, lon_a, lat_b, lon_b)
    return max(0.0, 1 - dist / max_km)


def category_match(category_a, category_b):
    return 1.0 if category_a == category_b else 0.0


# ──────────────────────────────────────────────────────────────────
# Collaborative filtering (item-based)
# Everything above compares ROOM ATTRIBUTES (price, location, wording).
# This compares PEOPLE'S BEHAVIOR instead: "which rooms tend to get
# liked/visited by the same users" — a signal the attribute-based
# factors structurally cannot see, since two rooms can be nothing
# alike on paper yet consistently appeal to the same people.
#
# This needs interaction data across the WHOLE platform (not just one
# user) to mean anything, so it's built separately and only activated
# once there's enough overlapping data — see min_users below.
# ──────────────────────────────────────────────────────────────────

def build_user_item_weights(like_pairs, visit_pairs, like_weight=1.0, visit_weight=3.0):
    """
    like_pairs / visit_pairs: iterables of (user_id, listing_id), e.g.
        RoomLike.objects.values_list("user_id", "listing_id")
        VisitRequest.objects.values_list("seeker_id", "listing_id")
    Returns {(user_id, listing_id): combined_weight} across everyone on
    the platform — the raw material for the user-item interaction
    matrix below.
    """
    weights = {}
    for user_id, listing_id in like_pairs:
        key = (user_id, listing_id)
        weights[key] = weights.get(key, 0.0) + like_weight
    for user_id, listing_id in visit_pairs:
        key = (user_id, listing_id)
        weights[key] = weights.get(key, 0.0) + visit_weight
    return weights


def item_cooccurrence_similarity(all_listings, user_item_weights, min_users=3):
    """
    Builds a (users x rooms) interaction matrix from every user's
    likes/visits platform-wide, then computes item-item cosine
    similarity between every pair of rooms — two rooms are "similar"
    here if the same users tended to like/visit both, regardless of
    what the rooms actually look like.

    Returns (similarity_matrix, id_to_index, has_enough_data).
    has_enough_data is False when fewer than `min_users` distinct users
    have any recorded interaction — with that little data the
    collaborative signal is just noise, so callers should skip this
    layer entirely (weight it at 0) rather than use it. This is what
    lets the system safely grow into collaborative filtering as real
    users start liking/visiting rooms, without ever breaking on a
    freshly-seeded database.
    """
    id_to_index = {l.id: i for i, l in enumerate(all_listings)}
    n = len(all_listings)

    user_ids = sorted({user_id for user_id, _ in user_item_weights.keys()})
    if len(user_ids) < min_users or n == 0:
        return None, id_to_index, False

    user_row = {u: i for i, u in enumerate(user_ids)}
    matrix = np.zeros((len(user_ids), n))
    for (user_id, listing_id), w in user_item_weights.items():
        row, col = user_row.get(user_id), id_to_index.get(listing_id)
        if row is not None and col is not None:
            matrix[row, col] = w

    # Item-item cosine similarity: treat each room as a column vector
    # of "which users interacted with it, how strongly" and compare
    # columns to each other.
    col_norms = np.linalg.norm(matrix, axis=0)
    col_norms[col_norms == 0] = 1  # avoid divide-by-zero for untouched rooms
    normalized = matrix / col_norms
    similarity = normalized.T @ normalized  # n x n, symmetric, diagonal = 1.0

    return similarity, id_to_index, True


def multi_factor_recommend_for_user(
    interactions, all_listings, documents, weights=None, top_n=8,
    max_price_diff=15000, max_km=10, with_reasons=False,
    item_similarity=None, similarity_id_to_index=None,
):
    """
    Ranks every listing the user hasn't interacted with by a blended
    score against the listings they HAVE interacted with — text
    similarity (TF-IDF), price closeness, location closeness, category
    match, and (optionally) collaborative filtering, combined with
    `weights`.

    interactions: dict of {Listing: weight}. Weight reflects how strong
        a signal that interaction is — e.g. a like might be 1.0 while a
        visit request is 3.0, since actually requesting to see a room
        is much stronger evidence of genuine interest than a like tap.
        Every score below is averaged across interactions using these
        weights, so rooms the user showed stronger interest in pull the
        recommendation profile toward them harder than rooms they only
        lightly liked.
    all_listings / documents: same aligned lists used elsewhere in this
        module (documents[i] is the text blob for all_listings[i]).
    item_similarity / similarity_id_to_index: output of
        item_cooccurrence_similarity(). Pass None (the default) to skip
        the collaborative factor entirely — e.g. when there isn't
        enough platform-wide interaction data yet for it to mean
        anything. The other four factors work fine on their own.
    with_reasons: if True, also returns which single factor (text,
        price, location, category, or collaborative) contributed the
        most to each result's score — used to show the user a short
        "why" label.
    """
    weights = weights or RECOMMEND_WEIGHTS
    if not interactions:
        return []

    interacted_ids = {l.id for l in interactions}
    total_weight = sum(interactions.values())
    id_to_index = {l.id: i for i, l in enumerate(all_listings)}

    vocab, word_index, idf, matrix = _get_tfidf_matrix(documents)

    # Weighted profile vector: rooms with a higher interaction weight
    # (e.g. a visit request) pull the text profile toward them harder
    # than a room that was only liked.
    weighted_vec = np.zeros(matrix.shape[1])
    for listing, w in interactions.items():
        idx = id_to_index.get(listing.id)
        if idx is not None:
            weighted_vec += matrix[idx] * w
    profile_vector = weighted_vec / total_weight
    text_scores = cosine_similarity_matrix(matrix, profile_vector)

    collab_available = item_similarity is not None and similarity_id_to_index is not None

    scored = []
    for i, candidate in enumerate(all_listings):
        if candidate.id in interacted_ids:
            continue

        price_total, loc_total, cat_total = 0.0, 0.0, 0.0
        for listing, w in interactions.items():
            price_total += price_closeness(candidate.price, listing.price, max_price_diff) * w
            loc_total += location_closeness(
                candidate.latitude, candidate.longitude, listing.latitude, listing.longitude, max_km
            ) * w
            cat_total += category_match(candidate.category, listing.category) * w

        factor_scores = {
            "text": weights["text"] * text_scores[i],
            "price": weights["price"] * (price_total / total_weight),
            "location": weights["location"] * (loc_total / total_weight),
            "category": weights["category"] * (cat_total / total_weight),
        }

        if collab_available:
            cand_row = similarity_id_to_index.get(candidate.id)
            collab_total = 0.0
            if cand_row is not None:
                for listing, w in interactions.items():
                    other_row = similarity_id_to_index.get(listing.id)
                    if other_row is not None:
                        collab_total += item_similarity[cand_row, other_row] * w
            factor_scores["collaborative"] = weights.get("collaborative", 0.0) * (collab_total / total_weight)

        blended = sum(factor_scores.values())

        if with_reasons:
            top_factor = max(factor_scores, key=factor_scores.get)
            scored.append((i, float(blended), top_factor))
        else:
            scored.append((i, float(blended)))

    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:top_n]


# ──────────────────────────────────────────────────────────────────
# Fuzzy matching — pure Python, no library
# ──────────────────────────────────────────────────────────────────

def levenshtein_distance(s1, s2):
    """
    Damerau-Levenshtein distance: standard Levenshtein (insert, delete,
    substitute) plus transposition — swapping two adjacent characters
    counts as ONE edit instead of two. "form" vs "from" is one
    accidental key-swap away; plain Levenshtein scores it as distance 2
    and understates how close they actually are. This is a small
    extension over classic Levenshtein: same DP table, plus one extra
    check per cell for an adjacent transposition.
    """
    if s1 == s2:
        return 0
    if len(s1) == 0:
        return len(s2)
    if len(s2) == 0:
        return len(s1)

    len1, len2 = len(s1), len(s2)
    d = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    for i in range(len1 + 1):
        d[i][0] = i
    for j in range(len2 + 1):
        d[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            d[i][j] = min(
                d[i - 1][j] + 1,      # deletion
                d[i][j - 1] + 1,      # insertion
                d[i - 1][j - 1] + cost,  # substitution
            )
            if i > 1 and j > 1 and s1[i - 1] == s2[j - 2] and s1[i - 2] == s2[j - 1]:
                d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)  # transposition

    return d[len1][len2]


def fuzzy_ratio(s1, s2):
    """
    FuzzyWuzzy-style similarity ratio on a 0-100 scale:
        ratio = (sum_len - distance) / sum_len * 100
    """
    if not s1 and not s2:
        return 100.0
    sum_len = len(s1) + len(s2)
    if sum_len == 0:
        return 100.0
    distance = levenshtein_distance(s1, s2)
    return ((sum_len - distance) / sum_len) * 100


def fuzzy_best_match(word, vocabulary, threshold=75):
    """
    Finds the closest word to `word` inside `vocabulary` by fuzzy_ratio.
    Returns (best_word, score) if the best score is >= threshold,
    otherwise (None, best_score_found).
    """
    best_word = None
    best_score = 0.0

    for candidate in vocabulary:
        if candidate == word:
            return candidate, 100.0
        if abs(len(candidate) - len(word)) > max(3, len(word) // 2):
            continue
        score = fuzzy_ratio(word, candidate)
        if score > best_score:
            best_score = score
            best_word = candidate

    if best_word is not None and best_score >= threshold:
        return best_word, best_score
    return None, best_score


def fuzzy_correct_tokens(query_tokens, vocabulary, threshold=75):
    """
    Swaps any query token not found verbatim in `vocabulary` for its
    closest fuzzy match, if one scores at or above `threshold`.
    """
    corrected = []
    for token in query_tokens:
        if token in vocabulary:
            corrected.append(token)
            continue
        match, _score = fuzzy_best_match(token, vocabulary, threshold=threshold)
        corrected.append(match if match else token)
    return corrected


def smart_search(query, documents, fuzzy_threshold=75):
    """
    Typo-tolerant search: fuzzy-corrects the query against the real
    vocabulary found in listings, then runs it through tfidf_search.

    Returns (scores, corrected_tokens).
    """
    tokenized_docs = [tokenize(doc) for doc in documents]
    vocabulary = {word for tokens in tokenized_docs for word in tokens}

    query_tokens = tokenize(query)
    corrected_tokens = fuzzy_correct_tokens(query_tokens, vocabulary, threshold=fuzzy_threshold)
    corrected_query = " ".join(corrected_tokens)

    scores = tfidf_search(corrected_query, documents)
    return scores, corrected_tokens
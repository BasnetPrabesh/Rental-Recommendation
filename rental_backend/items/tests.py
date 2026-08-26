# items/tests.py
from django.test import TestCase
from unittest.mock import patch
from .utils import (
    haversine_distance,
    geocode_location,
    tfidf_search,
    tokenize,
    compute_tf,
    compute_idf,
    cosine_similarity_manual,
)


class HaversineDistanceTests(TestCase):
    """Tests for the haversine_distance() function."""

    def test_same_point_returns_zero(self):
        """Distance between a point and itself should be 0."""
        distance = haversine_distance(27.7172, 85.3240, 27.7172, 85.3240)
        self.assertAlmostEqual(distance, 0, places=2)

    def test_known_distance_kathmandu_to_lalitpur(self):
        """
        Kathmandu Durbar Square to Patan Durbar Square (Lalitpur)
        is roughly 3-4 km apart in real life.
        """
        distance = haversine_distance(27.7040, 85.3070, 27.6710, 85.3247)
        self.assertGreater(distance, 2)
        self.assertLess(distance, 6)

    def test_distance_is_symmetric(self):
        """Distance A→B should equal distance B→A."""
        d1 = haversine_distance(27.7172, 85.3240, 27.6710, 85.3247)
        d2 = haversine_distance(27.6710, 85.3247, 27.7172, 85.3240)
        self.assertAlmostEqual(d1, d2, places=5)

    def test_none_input_raises_error(self):
        """Passing None instead of a number should raise TypeError."""
        with self.assertRaises(TypeError):
            haversine_distance(27.7172, 85.3240, None, None)

    def test_far_apart_points(self):
        """Kathmandu to Pokhara is roughly 130-140 km apart."""
        distance = haversine_distance(27.7172, 85.3240, 28.2096, 83.9856)
        self.assertGreater(distance, 100)
        self.assertLess(distance, 160)


class GeocodeLocationTests(TestCase):
    """
    Tests for geocode_location(). We mock the actual API call so tests
    don't depend on internet access or Nominatim's live rate limits.
    """

    @patch("items.utils.requests.get")
    def test_successful_geocode(self, mock_get):
        """Should return (lat, lon) when Nominatim finds a match."""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = [
            {"lat": "27.7172", "lon": "85.3240"}
        ]
        mock_get.return_value.raise_for_status = lambda: None

        lat, lon = geocode_location("Thamel, Kathmandu")
        self.assertAlmostEqual(lat, 27.7172)
        self.assertAlmostEqual(lon, 85.3240)

    @patch("items.utils.requests.get")
    def test_no_results_found(self, mock_get):
        """Should return (None, None) when Nominatim finds nothing."""
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = []
        mock_get.return_value.raise_for_status = lambda: None

        lat, lon = geocode_location("asdkjaskjdaskjd nonsense place")
        self.assertIsNone(lat)
        self.assertIsNone(lon)

    @patch("items.utils.requests.get")
    def test_network_error_returns_none(self, mock_get):
        """Should return (None, None) gracefully if the request fails."""
        import requests
        mock_get.side_effect = requests.exceptions.Timeout

        lat, lon = geocode_location("Baneshwor, Kathmandu")
        self.assertIsNone(lat)
        self.assertIsNone(lon)


class TokenizeTests(TestCase):
    """Tests for the tokenize() function."""

    def test_basic_tokenization(self):
        result = tokenize("Cozy Room, near college!")
        self.assertEqual(result, ["cozy", "room", "near", "college"])

    def test_lowercases_text(self):
        result = tokenize("THAMEL KATHMANDU")
        self.assertEqual(result, ["thamel", "kathmandu"])

    def test_keeps_alphanumeric_tokens_together(self):
        result = tokenize("2bhk apartment")
        self.assertEqual(result, ["2bhk", "apartment"])

    def test_empty_string_returns_empty_list(self):
        result = tokenize("")
        self.assertEqual(result, [])

    def test_strips_punctuation(self):
        result = tokenize("Hello, world! Is this... a test?")
        self.assertEqual(result, ["hello", "world", "is", "this", "a", "test"])


class ComputeTfTests(TestCase):
    """Tests for the compute_tf() function."""

    def test_term_frequency_calculation(self):
        tokens = ["room", "room", "cozy"]
        tf = compute_tf(tokens)
        self.assertAlmostEqual(tf["room"], 2 / 3)
        self.assertAlmostEqual(tf["cozy"], 1 / 3)

    def test_empty_tokens_returns_empty_dict(self):
        tf = compute_tf([])
        self.assertEqual(tf, {})

    def test_single_token(self):
        tf = compute_tf(["room"])
        self.assertEqual(tf, {"room": 1.0})


class ComputeIdfTests(TestCase):
    """Tests for the compute_idf() function."""

    def test_word_in_every_document_gets_low_idf(self):
        docs = [["room", "cozy"], ["room", "spacious"], ["room", "quiet"]]
        idf = compute_idf(docs)
        # "room" appears in all 3 docs, so its IDF should be low
        # compared to words that appear in only 1 doc
        self.assertLess(idf["room"], idf["cozy"])

    def test_rare_word_gets_higher_idf_than_common_word(self):
        docs = [
            ["room", "furnished", "quiet"],
            ["room", "spacious"],
            ["room", "cozy"],
        ]
        idf = compute_idf(docs)
        # "room" is in all 3 docs (common), "furnished" only in 1 (rare)
        self.assertGreater(idf["furnished"], idf["room"])


class CosineSimilarityManualTests(TestCase):
    """Tests for the cosine_similarity_manual() function."""

    def test_identical_vectors_have_similarity_one(self):
        vector = {"room": 0.5, "cozy": 0.5}
        similarity = cosine_similarity_manual(vector, vector)
        self.assertAlmostEqual(similarity, 1.0, places=5)

    def test_completely_different_vectors_have_similarity_zero(self):
        vector_a = {"room": 0.5, "cozy": 0.5}
        vector_b = {"apartment": 0.5, "spacious": 0.5}
        similarity = cosine_similarity_manual(vector_a, vector_b)
        self.assertAlmostEqual(similarity, 0.0, places=5)

    def test_empty_vector_returns_zero(self):
        similarity = cosine_similarity_manual({}, {"room": 0.5})
        self.assertEqual(similarity, 0.0)

    def test_partial_overlap_gives_score_between_zero_and_one(self):
        vector_a = {"room": 0.5, "cozy": 0.5}
        vector_b = {"room": 0.5, "spacious": 0.5}
        similarity = cosine_similarity_manual(vector_a, vector_b)
        self.assertGreater(similarity, 0.0)
        self.assertLess(similarity, 1.0)


class TfidfSearchTests(TestCase):
    """
    Tests for the main tfidf_search() function — the one actually used
    by the /api/listings/search/ endpoint.
    """

    def setUp(self):
        self.documents = [
            "Cozy furnished room near Thamel, close to college",
            "Spacious 2BHK apartment in Pepsicola for family",
            "Quiet room in Lalitpur, walking distance to Patan Durbar Square",
        ]

    def test_most_relevant_document_scores_highest(self):
        scores = tfidf_search("furnished room near college", self.documents)
        # Document 0 shares the most words with the query, should score highest
        self.assertEqual(scores.index(max(scores)), 0)

    def test_unrelated_document_scores_lowest(self):
        scores = tfidf_search("furnished room near college", self.documents)
        # Document 1 (Pepsicola apartment) shares no words with the query
        self.assertAlmostEqual(scores[1], 0.0, places=5)

    def test_returns_one_score_per_document(self):
        scores = tfidf_search("room", self.documents)
        self.assertEqual(len(scores), len(self.documents))

    def test_empty_query_returns_all_zero_scores(self):
        scores = tfidf_search("", self.documents)
        for score in scores:
            self.assertEqual(score, 0.0)

    def test_empty_documents_list(self):
        scores = tfidf_search("room", [])
        self.assertEqual(scores, [])

    def test_all_scores_between_zero_and_one(self):
        scores = tfidf_search("furnished room near college", self.documents)
        for score in scores:
            self.assertGreaterEqual(score, 0.0)
            self.assertLessEqual(score, 1.0)
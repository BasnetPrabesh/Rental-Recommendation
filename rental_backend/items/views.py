# items/views.py
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import Listing, RoomImage, VisitRequest, Notification, RoomLike
from .serializers import ListingSerializer, RoomImageSerializer, VisitRequestSerializer, NotificationSerializer
from .utils import (
    geocode_location,
    haversine_distance,
    bounding_box,
    tfidf_search,
    find_similar_documents,
    smart_search,
    recommend_for_user,
    multi_factor_recommend_for_user,
    build_user_item_weights,
    item_cooccurrence_similarity,
    REASON_LABELS,
)


# ─── Helper ───────────────────────────────────────────────────────────────────
def notify(user, title, body, visit_request=None):
    Notification.objects.create(user=user, title=title, body=body, visit_request=visit_request)


def build_document_text(listing):
    """
    Builds the searchable text blob for one listing. Title, location,
    and category are repeated to weight them more heavily than
    description — a match in the title or category is a stronger
    signal of what the listing actually IS than the same word buried
    in a long description paragraph. This is a simplified stand-in for
    real field-weighted TF-IDF (which would build separate vectors per
    field and combine them with explicit weights); repetition achieves
    a similar effect within the same single-vector-per-document
    approach the rest of the pipeline already uses.

    Used by search_listings(), similar_listings(), and
    RecommendationsAPI — one function, so all three stay consistent.
    """
    return (
        f"{(listing.title + ' ') * 3}"
        f"{(listing.location + ' ') * 4}"
        f"{(listing.category + ' ') * 2}"
        f"{(listing.room_type + ' ') * 2}"
        f"{listing.description} "
        f"{listing.furnished} {listing.bathroom} {listing.parking} {listing.internet}"
    )


# ─── Listing views ────────────────────────────────────────────────────────────

class ListingListAPI(generics.ListCreateAPIView):
    """
    GET  /api/listings/  — public, no auth required
    POST /api/listings/  — listers only
    """
    serializer_class = ListingSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Listing.objects.all().order_by("-created_at")

    def perform_create(self, serializer):
        lat = self.request.data.get("latitude")
        lon = self.request.data.get("longitude")
        listing = serializer.save(
            owner=self.request.user,
            latitude=float(lat) if lat else None,
            longitude=float(lon) if lon else None,
        )
        images = self.request.FILES.getlist("images")
        for img in images:
            RoomImage.objects.create(listing=listing, image=img)


class ListingDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/listings/<pk>/  — public
    PUT/PATCH/DELETE — owner only
    """
    serializer_class = ListingSerializer
    queryset         = Listing.objects.all()

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        listing = serializer.save()
        images  = self.request.FILES.getlist("images")
        for img in images:
            RoomImage.objects.create(listing=listing, image=img)


class RoomImageDeleteAPI(generics.DestroyAPIView):
    serializer_class   = RoomImageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RoomImage.objects.filter(listing__owner=self.request.user)


# ─── Likes / Recommendations ───────────────────────────────────────────────────

class ToggleLikeAPI(generics.GenericAPIView):
    """
    POST /api/listings/<pk>/like/
    Toggles a like: creates it if it doesn't exist, removes it if it does.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        like, created = RoomLike.objects.get_or_create(user=request.user, listing=listing)
        if not created:
            like.delete()
            return Response({"liked": False})
        return Response({"liked": True})


class RecommendationsAPI(generics.GenericAPIView):
    """
    GET /api/recommendations/  ("Rooms you may like")

    Ranks every listing the user hasn't interacted with against the
    listings they HAVE interacted with, blending four factors:
      - text similarity (TF-IDF over title/location/category/description)
      - price closeness
      - GPS distance closeness (Haversine)
      - exact category match (1BHK, Hostel, etc.)
    Weights live in utils.RECOMMEND_WEIGHTS.

    A "like" and a "visit request" are not treated as equal evidence —
    requesting to actually see a room is a much stronger signal of
    genuine interest than tapping a like button, so visit requests are
    weighted 3x as heavily as likes when building the taste profile.

    A fifth, collaborative-filtering factor also kicks in automatically
    once enough users have liked/visited rooms platform-wide — "rooms
    the same kind of people also liked" — but silently contributes
    nothing (rather than erroring) while the platform is too new for
    that signal to be meaningful. See MIN_USERS_FOR_COLLABORATIVE.

    Each result also carries a match_reason — the single factor
    (text/price/location/category/collaborative) that contributed most
    to its score — so the frontend can show a short "why this room"
    label instead of a bare number.

    Falls back to newest listings for a user with no likes or visit
    requests yet (cold start).
    """
    permission_classes = [permissions.IsAuthenticated]

    LIKE_WEIGHT = 1.0
    VISIT_WEIGHT = 3.0
    MIN_USERS_FOR_COLLABORATIVE = 3  # below this, collaborative data is too sparse to trust

    def get(self, request):
        liked_ids = set(RoomLike.objects.filter(user=request.user).values_list("listing_id", flat=True))
        visited_ids = set(
            VisitRequest.objects.filter(seeker=request.user).values_list("listing_id", flat=True)
        )

        interaction_weight_by_id = {}
        for lid in liked_ids:
            interaction_weight_by_id[lid] = interaction_weight_by_id.get(lid, 0.0) + self.LIKE_WEIGHT
        for lid in visited_ids:
            interaction_weight_by_id[lid] = interaction_weight_by_id.get(lid, 0.0) + self.VISIT_WEIGHT

        if not interaction_weight_by_id:
            fallback = Listing.objects.order_by("-created_at")[:8]
            data = ListingSerializer(fallback, many=True, context={"request": request}).data
            return Response(data)

        interacted_listings = Listing.objects.filter(id__in=interaction_weight_by_id.keys())
        interactions = {listing: interaction_weight_by_id[listing.id] for listing in interacted_listings}

        all_listings = list(Listing.objects.all().order_by("id"))
        documents = [build_document_text(l) for l in all_listings]

        # Collaborative factor: built from EVERY user's likes/visits on
        # the platform, not just this user's — this is what lets it spot
        # "people with similar taste to you" rather than just "rooms
        # like the ones you already liked".
        platform_like_pairs = RoomLike.objects.values_list("user_id", "listing_id")
        platform_visit_pairs = VisitRequest.objects.values_list("seeker_id", "listing_id")
        platform_weights = build_user_item_weights(
            platform_like_pairs, platform_visit_pairs,
            like_weight=self.LIKE_WEIGHT, visit_weight=self.VISIT_WEIGHT,
        )
        item_similarity, sim_id_to_index, has_enough_data = item_cooccurrence_similarity(
            all_listings, platform_weights, min_users=self.MIN_USERS_FOR_COLLABORATIVE,
        )

        recs = multi_factor_recommend_for_user(
            interactions, all_listings, documents, with_reasons=True,
            item_similarity=item_similarity if has_enough_data else None,
            similarity_id_to_index=sim_id_to_index if has_enough_data else None,
        )
        results = []
        for idx, score, top_factor in recs:
            data = ListingSerializer(all_listings[idx], context={"request": request}).data
            data["match_score"] = round(score, 4)
            data["match_reason"] = REASON_LABELS.get(top_factor, "")
            results.append(data)
        return Response(results)


# ─── Visit Request views ──────────────────────────────────────────────────────

class VisitRequestCreateAPI(generics.CreateAPIView):
    """
    POST /api/visits/
    Seeker schedules a visit for a listing.
    """
    serializer_class   = VisitRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        from .models import VisitRequest

        listing = serializer.validated_data["listing"]

        if listing.owner == self.request.user:
            raise ValidationError("You cannot schedule a visit to your own listing.")

        already_taken = VisitRequest.objects.filter(
            listing=listing,
            status__in=[VisitRequest.Status.PENDING, VisitRequest.Status.CONFIRMED],
        ).exclude(seeker=self.request.user).exists()
        if already_taken:
            raise ValidationError(
                "This room currently has a visit scheduled by another user. Please check back later."
            )

        visit = serializer.save(seeker=self.request.user)

        notify(
            user          = listing.owner,
            title         = "New Visit Request 📅",
            body          = f"{self.request.user.username} wants to visit '{listing.title}' on {visit.visit_date} at {visit.visit_time.strftime('%I:%M %p')}.",
            visit_request = visit,
        )


class SeekerVisitsAPI(generics.ListAPIView):
    """
    GET /api/visits/my/
    All visit requests made by the logged-in seeker.
    """
    serializer_class   = VisitRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VisitRequest.objects.filter(seeker=self.request.user).order_by("-created_at")


class OwnerVisitsAPI(generics.ListAPIView):
    """
    GET /api/visits/owner/
    All visit requests for the owner's listings.
    """
    serializer_class   = VisitRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return VisitRequest.objects.filter(listing__owner=self.request.user).order_by("-created_at")


class VisitActionAPI(generics.UpdateAPIView):
    """
    PATCH /api/visits/<pk>/action/
    Actions: confirm | decline | cancel
    Owner: confirm / decline
    Seeker: cancel
    """
    serializer_class   = VisitRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset           = VisitRequest.objects.all()

    def patch(self, request, *args, **kwargs):
        visit     = self.get_object()
        action    = request.data.get("action")
        owner_note = request.data.get("owner_note", "")
        user      = request.user
        is_owner  = visit.listing.owner == user
        is_seeker = visit.seeker == user

        if action == "confirm":
            if not is_owner:
                return Response({"error": "Only the owner can confirm."}, status=status.HTTP_403_FORBIDDEN)
            if visit.status != VisitRequest.Status.PENDING:
                return Response({"error": "Only pending visits can be confirmed."}, status=status.HTTP_400_BAD_REQUEST)
            visit.status     = VisitRequest.Status.CONFIRMED
            visit.owner_note = owner_note
            visit.save()
            notify(
                user          = visit.seeker,
                title         = "Visit Confirmed! 🎉",
                body          = f"Your visit to '{visit.listing.title}' on {visit.visit_date} at {visit.visit_time.strftime('%I:%M %p')} has been confirmed. The owner's contact and exact address are now available.",
                visit_request = visit,
            )

        elif action == "decline":
            if not is_owner:
                return Response({"error": "Only the owner can decline."}, status=status.HTTP_403_FORBIDDEN)
            if visit.status != VisitRequest.Status.PENDING:
                return Response({"error": "Only pending visits can be declined."}, status=status.HTTP_400_BAD_REQUEST)
            visit.status     = VisitRequest.Status.DECLINED
            visit.owner_note = owner_note
            visit.save()
            notify(
                user          = visit.seeker,
                title         = "Visit Request Declined",
                body          = f"Your visit request for '{visit.listing.title}' was declined by the owner."
                                + (f" Note: {owner_note}" if owner_note else ""),
                visit_request = visit,
            )

        elif action == "cancel":
            if not (is_owner or is_seeker):
                return Response({"error": "Not authorised."}, status=status.HTTP_403_FORBIDDEN)
            if visit.status in [VisitRequest.Status.DECLINED, VisitRequest.Status.CANCELLED]:
                return Response({"error": "This visit request is already closed."}, status=status.HTTP_400_BAD_REQUEST)
            visit.status = VisitRequest.Status.CANCELLED
            visit.save()
            if is_seeker:
                notify(
                    user          = visit.listing.owner,
                    title         = "Visit Cancelled",
                    body          = f"{visit.seeker.username} cancelled their visit request for '{visit.listing.title}'.",
                    visit_request = visit,
                )
            else:
                notify(
                    user          = visit.seeker,
                    title         = "Visit Cancelled by Owner",
                    body          = f"The owner cancelled your scheduled visit to '{visit.listing.title}'.",
                    visit_request = visit,
                )

        else:
            return Response({"error": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = VisitRequestSerializer(visit, context={"request": request})
        return Response(serializer.data)


# ─── Notification views ───────────────────────────────────────────────────────

class NotificationListAPI(generics.ListAPIView):
    serializer_class   = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({"status": "ok"})


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def clear_notifications(request):
    Notification.objects.filter(user=request.user).delete()
    return Response({"status": "ok"})


# ─── Search & nearby ──────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def geocode_check(request):
    location_text = request.data.get("location", "").strip()
    if not location_text:
        return Response({"error": "Location text is required."}, status=status.HTTP_400_BAD_REQUEST)
    lat, lon = geocode_location(location_text)
    if lat is not None and lon is not None:
        return Response({"found": True, "latitude": lat, "longitude": lon})
    return Response({"found": False, "latitude": None, "longitude": None})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def nearby_listings(request):
    lat_param    = request.query_params.get("lat")
    lng_param    = request.query_params.get("lng")
    radius_param = request.query_params.get("radius", 10)

    if not lat_param or not lng_param:
        return Response({"error": "lat and lng are required."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_lat  = float(lat_param)
        user_lng  = float(lng_param)
        radius_km = float(radius_param)
    except ValueError:
        return Response({"error": "Invalid numbers."}, status=status.HTTP_400_BAD_REQUEST)

    min_lat, max_lat, min_lon, max_lon = bounding_box(user_lat, user_lng, radius_km)
    listings = Listing.objects.filter(
        latitude__isnull=False, longitude__isnull=False,
        latitude__range=(min_lat, max_lat),
        longitude__range=(min_lon, max_lon),
    )

    results  = []
    for listing in listings:
        distance = haversine_distance(user_lat, user_lng, listing.latitude, listing.longitude)
        if distance <= radius_km:
            data = ListingSerializer(listing, context={"request": request}).data
            data["distance_km"] = round(distance, 2)
            results.append(data)

    results.sort(key=lambda x: x["distance_km"])
    return Response(results)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def search_listings(request):
    query = request.query_params.get("q", "").strip()
    if not query:
        return Response({"error": "Query parameter 'q' is required."}, status=status.HTTP_400_BAD_REQUEST)

    listings = list(Listing.objects.all())
    if not listings:
        return Response([])

    documents = [build_document_text(listing) for listing in listings]

    scores, corrected_tokens = smart_search(query, documents)
    results = []

    MIN_RELEVANCE_SCORE = 0.15

    for listing, score in zip(listings, scores):
        if score >= MIN_RELEVANCE_SCORE:
            data = ListingSerializer(listing, context={"request": request}).data
            data["relevance_score"] = round(score, 4)
            results.append(data)

    results.sort(key=lambda x: x["relevance_score"], reverse=True)

    response = Response(results)
    corrected_query = " ".join(corrected_tokens)
    if corrected_query and corrected_query.lower() != query.lower():
        response["X-Corrected-Query"] = corrected_query
    return response


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def similar_listings(request, pk):
    """
    GET /api/listings/<pk>/similar/?limit=4  — public
    """
    try:
        target = Listing.objects.get(pk=pk)
    except Listing.DoesNotExist:
        return Response({"error": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)

    try:
        limit = int(request.query_params.get("limit", 4))
    except ValueError:
        limit = 4
    limit = max(1, min(limit, 20))

    all_listings = list(Listing.objects.all().order_by("id"))
    if len(all_listings) < 2:
        return Response([])

    documents = [build_document_text(l) for l in all_listings]

    target_index = next(
        (i for i, l in enumerate(all_listings) if l.id == target.id), None
    )
    if target_index is None:
        return Response([])

    similar = find_similar_documents(target_index, documents, top_n=limit)

    results = []
    for idx, score in similar:
        data = ListingSerializer(all_listings[idx], context={"request": request}).data
        data["similarity_score"] = round(score, 4)
        results.append(data)

    return Response(results)
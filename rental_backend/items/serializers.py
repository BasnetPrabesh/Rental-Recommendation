# items/serializers.py
from rest_framework import serializers
from .models import Listing, RoomImage, VisitRequest, Notification


def resolve_contact_number(listing):
    """
    A listing can optionally override the contact number via
    Listing.phone_number, but most owners never fill that in — their
    real number already lives on UserProfile.phone_number (collected,
    and required for listers, at registration). This is the single
    place that decides what number actually gets shown to a confirmed
    seeker, so the listing-level field and the account-level field
    can never silently disagree.
    """
    if listing.phone_number:
        return listing.phone_number
    profile = getattr(listing.owner, "profile", None)
    return profile.phone_number if profile else None


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RoomImage
        fields = ["id", "image"]


class ListingSerializer(serializers.ModelSerializer):
    owner_username      = serializers.CharField(source="owner.username", read_only=True)
    images               = RoomImageSerializer(many=True, read_only=True)
    # Phone number only returned when explicitly requested via context
    phone_number         = serializers.SerializerMethodField()
    is_liked              = serializers.SerializerMethodField()
    has_confirmed_visit  = serializers.SerializerMethodField()
    has_active_visit     = serializers.SerializerMethodField()
    own_visit_status     = serializers.SerializerMethodField()

    class Meta:
        model  = Listing
        fields = [
            "id", "owner", "owner_username",
            "title", "price", "location",
            "latitude", "longitude", "description",
            "image", "images", "is_booked",
            "room_type", "category",
            "furnished", "bathroom", "parking", "internet",
            "bills_included", "available_from",
            "phone_number", "is_liked", "has_confirmed_visit",
            "has_active_visit", "own_visit_status",
            "created_at",
        ]
        read_only_fields = ["owner", "created_at", "is_booked"]

    def get_phone_number(self, obj):
        """
        Only reveal the phone number if:
        - The requester is the owner, OR
        - The requester has a CONFIRMED visit request for this listing
        """
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None

        user = request.user

        if obj.owner == user:
            return resolve_contact_number(obj)

        has_confirmed = VisitRequest.objects.filter(
            listing=obj,
            seeker=user,
            status=VisitRequest.Status.CONFIRMED,
        ).exists()

        return resolve_contact_number(obj) if has_confirmed else None

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return obj.liked_by.filter(user=request.user).exists()

    def get_has_confirmed_visit(self, obj):
        """
        Single source of truth for "should this viewer see the real
        map/location for this listing" — True for the owner always,
        True for a seeker with a CONFIRMED visit request, False
        otherwise (including for guests). Separate from phone_number
        so the frontend has one clean signal instead of inferring
        confirmation from whether phone_number happens to be truthy
        (which breaks if an owner never set a phone number at all).
        """
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return False

        user = request.user
        if obj.owner == user:
            return True

        return VisitRequest.objects.filter(
            listing=obj,
            seeker=user,
            status=VisitRequest.Status.CONFIRMED,
        ).exists()

    def get_has_active_visit(self, obj):
        """
        True if ANY seeker (not just the current viewer) has a
        PENDING or CONFIRMED visit request for this listing. Used to
        show a "Scheduled" badge and to stop other seekers from
        piling on more visit requests for a room that's already
        spoken for.
        """
        return VisitRequest.objects.filter(
            listing=obj,
            status__in=[VisitRequest.Status.PENDING, VisitRequest.Status.CONFIRMED],
        ).exists()

    def get_own_visit_status(self, obj):
        """
        The current viewer's own active (PENDING/CONFIRMED) visit
        request status for this listing, if any — lets the frontend
        tell "you already requested this" apart from "someone else
        already requested this" instead of lumping both under
        has_active_visit.
        """
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None

        visit = VisitRequest.objects.filter(
            listing=obj,
            seeker=request.user,
            status__in=[VisitRequest.Status.PENDING, VisitRequest.Status.CONFIRMED],
        ).first()
        return visit.status if visit else None


class VisitRequestSerializer(serializers.ModelSerializer):
    seeker_username  = serializers.CharField(source="seeker.username",   read_only=True)
    listing_title    = serializers.CharField(source="listing.title",     read_only=True)
    listing_location = serializers.CharField(source="listing.location",  read_only=True)
    listing_price    = serializers.DecimalField(
        source="listing.price", max_digits=10, decimal_places=2, read_only=True
    )
    listing_image    = serializers.SerializerMethodField()
    listing_latitude  = serializers.SerializerMethodField()
    listing_longitude = serializers.SerializerMethodField()
    listing_phone    = serializers.SerializerMethodField()

    class Meta:
        model  = VisitRequest
        fields = [
            "id", "listing", "listing_title", "listing_location",
            "listing_price", "listing_image",
            "listing_latitude", "listing_longitude", "listing_phone",
            "seeker", "seeker_username",
            "status", "visit_date", "visit_time", "message", "owner_note",
            "created_at", "updated_at",
        ]
        read_only_fields = ["seeker", "status", "owner_note", "created_at", "updated_at"]

    def validate_visit_date(self, value):
        import datetime
        today = datetime.date.today()
        max_date = today + datetime.timedelta(days=7)
        if value < today:
            raise serializers.ValidationError("Visit date can't be in the past.")
        if value > max_date:
            raise serializers.ValidationError(
                "Visits can only be scheduled up to a week in advance."
            )
        return value

    def get_listing_image(self, obj):
        request = self.context.get("request")
        first   = obj.listing.images.first()
        if first:
            return request.build_absolute_uri(first.image.url) if request else first.image.url
        if obj.listing.image:
            return request.build_absolute_uri(obj.listing.image.url) if request else obj.listing.image.url
        return None

    def _is_confirmed(self, obj):
        return obj.status == VisitRequest.Status.CONFIRMED

    def get_listing_latitude(self, obj):
        return obj.listing.latitude if self._is_confirmed(obj) else None

    def get_listing_longitude(self, obj):
        return obj.listing.longitude if self._is_confirmed(obj) else None

    def get_listing_phone(self, obj):
        return resolve_contact_number(obj.listing) if self._is_confirmed(obj) else None


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = ["id", "title", "body", "is_read", "visit_request", "created_at"]
        read_only_fields = ["title", "body", "visit_request", "created_at"]
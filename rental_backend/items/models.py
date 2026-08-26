# items/models.py
from django.contrib.auth.models import User
from django.db import models


class Listing(models.Model):

    class RoomType(models.TextChoices):
        ROOM_IN_HOUSE  = "room_in_house",   "Room in existing house"
        WHOLE_FLAT     = "whole_flat",      "Whole flat/house"
        STUDENT_HOSTEL = "student_hostel",  "Student hostel"
        HOMESTAY       = "homestay",        "Homestay"

    class Category(models.TextChoices):
        ROOM      = "room",      "Room"
        BK        = "1bk",      "1BK"
        BHK       = "1bhk",     "1BHK"
        TWO_BHK   = "2bhk",     "2BHK"
        APARTMENT = "apartment", "Apartment"
        HOUSE     = "house",     "House"
        FLAT      = "flat",      "Flat"
        HOSTEL    = "hostel",    "Hostel"
        HOTEL     = "hotel",     "Hotel"
        COTTAGE   = "cottage",   "Cottage"

    class Furnished(models.TextChoices):
        FURNISHED   = "furnished",   "Furnished"
        UNFURNISHED = "unfurnished", "Unfurnished"
        PARTIAL     = "partial",     "Partially furnished"

    class Bathroom(models.TextChoices):
        PRIVATE = "private",  "Private"
        SHARED  = "shared",   "Shared"
        ENSUITE = "ensuite",  "Ensuite"

    class Parking(models.TextChoices):
        YES      = "yes",      "Yes"
        NO       = "no",       "No"
        FLEXIBLE = "flexible", "Flexible"

    class Internet(models.TextChoices):
        YES      = "yes",      "Yes"
        NO       = "no",       "No"
        FLEXIBLE = "flexible", "Flexible"

    owner          = models.ForeignKey(User, on_delete=models.CASCADE, related_name="listings", null=True, blank=True)
    title          = models.CharField(max_length=255)
    price          = models.DecimalField(max_digits=10, decimal_places=2)
    location       = models.CharField(max_length=255)
    latitude       = models.FloatField(null=True, blank=True)
    longitude      = models.FloatField(null=True, blank=True)
    description    = models.TextField(blank=True)
    image          = models.ImageField(upload_to="listings/", null=True, blank=True)
    is_booked      = models.BooleanField(default=False)

    # Categorisation
    room_type      = models.CharField(max_length=20,  choices=RoomType.choices,  default=RoomType.ROOM_IN_HOUSE)
    category       = models.CharField(max_length=15,  choices=Category.choices,  default=Category.ROOM)

    # Details
    furnished      = models.CharField(max_length=15,  choices=Furnished.choices, default=Furnished.FURNISHED)
    bathroom       = models.CharField(max_length=10,  choices=Bathroom.choices,  default=Bathroom.SHARED)
    parking        = models.CharField(max_length=10,  choices=Parking.choices,   default=Parking.NO)
    internet       = models.CharField(max_length=10,  choices=Internet.choices,  default=Internet.YES)
    bills_included = models.BooleanField(default=False)
    available_from = models.DateField(null=True, blank=True)

    # Contact — hidden until visit is confirmed
    phone_number   = models.CharField(max_length=20, blank=True)

    created_at     = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return self.title


class RoomImage(models.Model):
    listing     = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image       = models.ImageField(upload_to="listings/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.listing.title}"


class VisitRequest(models.Model):
    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        DECLINED  = "DECLINED",  "Declined"
        CANCELLED = "CANCELLED", "Cancelled"

    listing      = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="visit_requests")
    seeker       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="visit_requests")
    status       = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    visit_date   = models.DateField()
    visit_time   = models.TimeField()
    message      = models.TextField(blank=True, help_text="Message from seeker to owner")
    owner_note   = models.TextField(blank=True, help_text="Owner response / suggested time")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        # Only blocks a duplicate while an existing request from this
        # seeker for this listing is still PENDING or CONFIRMED — once
        # it's DECLINED or CANCELLED, they're free to request again.
        # (Plain unique_together would block that permanently, since it
        # applies regardless of status.)
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "seeker"],
                condition=models.Q(status__in=["PENDING", "CONFIRMED"]),
                name="one_active_visit_request_per_seeker_per_listing",
            )
        ]

    def __str__(self):
        return f"{self.seeker.username} → {self.listing.title} on {self.visit_date} ({self.status})"


class Notification(models.Model):
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title        = models.CharField(max_length=255)
    body         = models.TextField()
    is_read      = models.BooleanField(default=False)
    visit_request = models.ForeignKey(
        VisitRequest, on_delete=models.CASCADE,
        related_name="notifications", null=True, blank=True
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"→ {self.user.username}: {self.title}"


class RoomLike(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="liked_listings")
    listing    = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="liked_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "listing")]

    def __str__(self):
        return f"{self.user.username} ♥ {self.listing.title}"
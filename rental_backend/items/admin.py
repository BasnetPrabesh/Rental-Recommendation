# items/admin.py
from django.contrib import admin
from .models import Listing, RoomImage, VisitRequest, Notification


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display    = ["title", "owner", "category", "location", "price", "is_booked", "created_at"]
    list_filter     = ["category", "room_type", "is_booked", "furnished", "created_at"]
    search_fields   = ["title", "location", "owner__username"]


@admin.register(RoomImage)
class RoomImageAdmin(admin.ModelAdmin):
    list_display    = ["listing", "uploaded_at"]


@admin.register(VisitRequest)
class VisitRequestAdmin(admin.ModelAdmin):
    list_display    = ["listing", "seeker", "visit_date", "visit_time", "status", "created_at"]
    list_filter     = ["status", "visit_date"]
    search_fields   = ["listing__title", "seeker__username"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display    = ["user", "title", "is_read", "created_at"]
    list_filter     = ["is_read"]
    search_fields   = ["user__username", "title"]
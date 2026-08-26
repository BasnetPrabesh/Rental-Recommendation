# items/urls.py
from django.urls import path
from .views import (
    ListingListAPI,
    ListingDetailAPI,
    RoomImageDeleteAPI,
    ToggleLikeAPI,
    RecommendationsAPI,
    VisitRequestCreateAPI,
    SeekerVisitsAPI,
    OwnerVisitsAPI,
    VisitActionAPI,
    NotificationListAPI,
    mark_notifications_read,
    clear_notifications,
    geocode_check,
    nearby_listings,
    search_listings,
    similar_listings,
)

urlpatterns = [
    # Listings — public browsing
    path("listings/nearby/",           nearby_listings,              name="nearby_listings"),
    path("listings/search/",           search_listings,              name="search_listings"),
    path("listings/<int:pk>/similar/", similar_listings,             name="similar_listings"),
    path("listings/<int:pk>/like/",    ToggleLikeAPI.as_view(),      name="toggle_like"),
    path("listings/",                  ListingListAPI.as_view(),     name="listing_list"),
    path("listings/<int:pk>/",         ListingDetailAPI.as_view(),   name="listing_detail"),

    # Recommendations
    path("recommendations/",           RecommendationsAPI.as_view(), name="recommendations"),

    # Images
    path("room-images/<int:pk>/",      RoomImageDeleteAPI.as_view(), name="room_image_delete"),

    # Visit Requests
    path("visits/",                    VisitRequestCreateAPI.as_view(), name="visit_create"),
    path("visits/my/",                 SeekerVisitsAPI.as_view(),       name="visit_my"),
    path("visits/owner/",              OwnerVisitsAPI.as_view(),         name="visit_owner"),
    path("visits/<int:pk>/action/",    VisitActionAPI.as_view(),         name="visit_action"),

    # Notifications
    path("notifications/",             NotificationListAPI.as_view(),  name="notifications"),
    path("notifications/read/",        mark_notifications_read,         name="notifications_read"),
    path("notifications/clear/",       clear_notifications,             name="notifications_clear"),

    # Geocode
    path("geocode-check/",             geocode_check,                name="geocode_check"),
]
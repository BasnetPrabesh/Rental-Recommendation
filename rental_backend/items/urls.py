from django.urls import path
from . import views

urlpatterns = [
    path('listings/', views.ListingListAPI.as_view(), name='listing-list'),
]
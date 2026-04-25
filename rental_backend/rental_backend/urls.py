# project/urls.py  (your main urls.py)
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth endpoints: register, token obtain/refresh, profile
    path("api/auth/", include("accounts.urls")),

    # Room listing endpoints
    path("api/", include("items.urls")),
]
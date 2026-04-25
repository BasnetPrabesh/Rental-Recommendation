from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import ProfileView, RegisterView

urlpatterns = [
    # POST { username, email, password, password2 }  →  creates account
    path("register/", RegisterView.as_view(), name="auth_register"),

    # POST { username, password }  →  { access, refresh }
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),

    # POST { refresh }  →  { access }
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # GET (bearer token required)  →  user info
    path("profile/", ProfileView.as_view(), name="auth_profile"),
]
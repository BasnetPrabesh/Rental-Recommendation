# accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from .views import ProfileView, RegisterView
from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


urlpatterns = [
    path("register/",      RegisterView.as_view(),           name="auth_register"),
    path("token/",         CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(),       name="token_refresh"),
    path("profile/",       ProfileView.as_view(),            name="auth_profile"),
]
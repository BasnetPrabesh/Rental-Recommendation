# accounts/views.py
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Open to all. Creates a new user with role + phone and returns their info.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class   = RegisterSerializer


class ProfileView(APIView):
    """
    GET /api/auth/profile/
    Returns the currently authenticated user's profile including role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
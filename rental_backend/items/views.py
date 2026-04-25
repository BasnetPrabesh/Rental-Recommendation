from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Listing
from .serializers import ListingSerializer


class ListingListAPI(generics.ListCreateAPIView):
    """
    GET  /api/listings/  – list all rooms  (authenticated users only)
    POST /api/listings/  – create a room   (authenticated users only)
    """
    queryset = Listing.objects.all().order_by("-created_at")
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]   # ← require login

    def perform_create(self, serializer):
        # Automatically attach the logged-in user as owner
        serializer.save(owner=self.request.user)


class ListingDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/PATCH/DELETE /api/listings/<pk>/
    Only the owner can modify or delete their listing.
    """
    queryset = Listing.objects.all()
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]
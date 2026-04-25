from rest_framework import serializers
from .models import Listing   


class ListingSerializer(serializers.ModelSerializer):
    # show the owner's username (read-only)
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id", "owner", "owner_username",
            "title", "price", "location",
            "latitude", "longitude", "description",
            "created_at",
        ]
        # owner is set automatically in the view – never trust client input
        read_only_fields = ["owner", "created_at"]
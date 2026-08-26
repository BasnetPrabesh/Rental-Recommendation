# accounts/serializers.py
from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import UserProfile


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        # Include role in JWT so frontend knows immediately
        try:
            token["role"] = user.profile.role
            token["phone_number"] = user.profile.phone_number
        except UserProfile.DoesNotExist:
            token["role"] = "seeker"
            token["phone_number"] = ""
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password     = serializers.CharField(write_only=True, min_length=8)
    password2    = serializers.CharField(write_only=True, label="Confirm Password")
    role         = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        default=UserProfile.Role.SEEKER,
        write_only=True,
    )
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True, write_only=True)

    class Meta:
        model  = User
        fields = ["id", "username", "email", "password", "password2", "role", "phone_number"]
        extra_kwargs = {"email": {"required": False, "allow_blank": True}}

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        # Listers must provide a phone number
        if attrs.get("role") == "lister" and not attrs.get("phone_number", "").strip():
            raise serializers.ValidationError({"phone_number": "Phone number is required for listers."})
        return attrs

    def create(self, validated_data):
        role         = validated_data.pop("role", "seeker")
        phone_number = validated_data.pop("phone_number", "")
        validated_data.pop("password2")

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )

        # Update the auto-created profile
        profile = user.profile
        profile.role         = role
        profile.phone_number = phone_number
        profile.save()

        return user


class UserSerializer(serializers.ModelSerializer):
    role         = serializers.CharField(source="profile.role",         read_only=True)
    phone_number = serializers.CharField(source="profile.phone_number", read_only=True)

    class Meta:
        model  = User
        fields = ["id", "username", "email", "first_name", "last_name", "date_joined", "role", "phone_number"]
        read_only_fields = ["id", "date_joined"]
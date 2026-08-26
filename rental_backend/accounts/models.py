# accounts/models.py
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class UserProfile(models.Model):
    class Role(models.TextChoices):
        SEEKER = "seeker", "Room Seeker"
        LISTER = "lister", "Room Lister"

    user         = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role         = models.CharField(max_length=10, choices=Role.choices, default=Role.SEEKER)
    phone_number = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


# Auto-create a profile whenever a new User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)
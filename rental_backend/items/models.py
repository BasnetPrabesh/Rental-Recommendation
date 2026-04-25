from django.contrib.auth.models import User
from django.db import models


class Listing(models.Model):
    # ── NEW: track who created each room ──────────────────────────────────────
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="listings",
        null=True,   # null/blank=True lets you migrate without breaking existing rows
        blank=True,
    )
    # ── existing fields (unchanged) ───────────────────────────────────────────
    title = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return self.title
// src/components/EditRoomModal.js
import React, { useState } from "react";
import axios from "axios";
import { getImageUrl } from "../utils/imageUrl";
import LocationPicker from "./LocationPicker";
import {
  OptionCard,
  PillGroup,
  ToggleSwitch,
  inputCls,
  ROOM_TYPE_OPTIONS,
  CATEGORY_OPTIONS,
  FURNISHED_OPTIONS,
  BATHROOM_OPTIONS,
  PARKING_OPTIONS,
  INTERNET_OPTIONS,
} from "./RoomFormControls";

export default function EditRoomModal({ room, onClose, onSuccess }) {
  // Same field set as AddRoomWizard — pre-filled from the existing listing
  const [form, setForm] = useState({
    room_type: room.room_type || "room_in_house",
    category: room.category || "room",
    title: room.title || "",
    description: room.description || "",
    phone_number: room.phone_number || "",
    furnished: room.furnished || "furnished",
    bathroom: room.bathroom || "shared",
    parking: room.parking || "no",
    internet: room.internet || "yes",
    bills_included: !!room.bills_included,
    available_from: room.available_from || "",
    location: room.location || "",
    price: room.price ?? "",
  });

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // Existing images already saved on the server (from room.images, or the legacy single room.image)
  const initialExisting =
    room.images && room.images.length > 0
      ? room.images
      : room.image
        ? [{ id: null, image: room.image }] // legacy field has no id — can't be deleted via the image endpoint
        : [];

  const [existingImages, setExistingImages] = useState(initialExisting);
  const [newImages, setNewImages] = useState([]); // new File objects to upload
  const [newPreviews, setNewPreviews] = useState([]); // object URLs for the new files
  const [removingId, setRemovingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Geocoding state — seeded from the room's existing coordinates, if any
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(
    room.latitude != null && room.longitude != null ? "found" : null,
  );
  const [coords, setCoords] = useState({
    latitude: room.latitude ?? null,
    longitude: room.longitude ?? null,
  });

  const handleLocationChange = (e) => {
    set("location", e.target.value);
    setLocationStatus(null);
    setCoords({ latitude: null, longitude: null });
  };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewImages((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
    e.target.value = "";
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Deletes an already-saved image right away via the API
  const removeExistingImage = async (img) => {
    if (img.id === null) {
      // Legacy single `image` field — nothing to call, just hide it locally.
      setExistingImages((prev) => prev.filter((i) => i !== img));
      return;
    }
    if (!window.confirm("Remove this photo?")) return;
    setRemovingId(img.id);
    try {
      await axios.delete(`/api/room-images/${img.id}/`);
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
    } catch {
      alert("Could not remove this photo. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckLocation = async () => {
    if (!form.location.trim()) return;
    setCheckingLocation(true);
    setLocationStatus(null);

    try {
      const res = await axios.post("/api/geocode-check/", {
        location: form.location,
      });

      if (res.data.found) {
        setLocationStatus("found");
        setCoords({
          latitude: res.data.latitude,
          longitude: res.data.longitude,
        });
      } else {
        setLocationStatus("not_found");
        setCoords({ latitude: null, longitude: null });
      }
    } catch {
      setLocationStatus("not_found");
      setCoords({ latitude: null, longitude: null });
    } finally {
      setCheckingLocation(false);
    }
  };

  const handleMapLocationSelect = (lat, lng) => {
    setCoords({ latitude: lat, longitude: lng });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!form.title.trim()) {
      setErrors({ title: ["Room title is required."] });
      return;
    }
    if (!form.price) {
      setErrors({ price: ["Monthly price is required."] });
      return;
    }
    // Block submission if we don't have coordinates yet
    if (!coords.latitude || !coords.longitude) {
      setErrors({
        non_field_errors: [
          "Please confirm your location before saving (click 'Confirm' or select it on the map).",
        ],
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("room_type", form.room_type);
    formData.append("category", form.category);
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("phone_number", form.phone_number);
    formData.append("furnished", form.furnished);
    formData.append("bathroom", form.bathroom);
    formData.append("parking", form.parking);
    formData.append("internet", form.internet);
    formData.append("bills_included", form.bills_included);
    if (form.available_from)
      formData.append("available_from", form.available_from);
    formData.append("location", form.location);
    formData.append("price", parseFloat(form.price));
    formData.append("latitude", coords.latitude);
    formData.append("longitude", coords.longitude);

    // Newly added photos — appended to the gallery on save
    newImages.forEach((file) => formData.append("images", file));

    try {
      await axios.patch(`/api/listings/${room.id}/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err) {
      setErrors(
        err.response?.data || { non_field_errors: ["Something went wrong."] },
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldErrorCls = (field) =>
    errors[field] ? "border-red-400 focus:ring-red-300 bg-red-50" : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-border flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-primary font-bold text-lg">Edit Listing</h2>
            <p className="text-muted text-sm mt-0.5">
              Update your room details
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-muted hover:text-primary hover:bg-surface transition text-xl"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-6 overflow-y-auto flex-1"
        >
          {errors.non_field_errors && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {errors.non_field_errors[0]}
            </div>
          )}

          {/* Room type */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Type of place
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROOM_TYPE_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.value}
                  icon={opt.icon}
                  label={opt.label}
                  sublabel={opt.sublabel}
                  selected={form.room_type === opt.value}
                  onClick={() => set("room_type", opt.value)}
                />
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Category
            </label>
            <PillGroup
              value={form.category}
              onChange={(v) => set("category", v)}
              options={CATEGORY_OPTIONS}
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Listing Title <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              className={`${inputCls} ${fieldErrorCls("title")}`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title[0]}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Monthly Price (Rs) <span className="text-accent">*</span>
            </label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              required
              className={`${inputCls} ${fieldErrorCls("price")}`}
            />
            {errors.price && (
              <p className="mt-1 text-xs text-red-500">{errors.price[0]}</p>
            )}
          </div>

          {/* Location field with check button */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Location <span className="text-accent">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.location}
                onChange={handleLocationChange}
                required
                className={`${inputCls} ${fieldErrorCls("location")}`}
              />
              <button
                type="button"
                onClick={handleCheckLocation}
                disabled={checkingLocation || !form.location.trim()}
                className="whitespace-nowrap px-4 rounded-xl bg-surface border border-border
                           text-sm text-primary hover:border-accent transition disabled:opacity-50"
              >
                {checkingLocation ? "Checking..." : "Confirm"}
              </button>
            </div>
            {errors.location && (
              <p className="mt-1 text-xs text-red-500">{errors.location[0]}</p>
            )}
            {locationStatus === "found" && (
              <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                ✓ Location confirmed
              </p>
            )}
            {locationStatus === "not_found" && (
              <p className="mt-1.5 text-xs text-orange-500">
                Location not found automatically — pin it on the map below
              </p>
            )}
          </div>

          {/* Leaflet map fallback shown only if geocoding failed */}
          {locationStatus === "not_found" && (
            <LocationPicker onLocationSelect={handleMapLocationSelect} />
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none ${fieldErrorCls("description")}`}
            />
          </div>

          {/* Phone number */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Contact Phone Number
            </label>
            <input
              type="tel"
              value={form.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              placeholder="98XXXXXXXX"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-muted">
              Hidden from seekers until you confirm a visit request.
            </p>
          </div>

          {/* Furnished */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Furnished
            </label>
            <PillGroup
              value={form.furnished}
              onChange={(v) => set("furnished", v)}
              options={FURNISHED_OPTIONS}
            />
          </div>

          {/* Bathroom */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Bathroom
            </label>
            <PillGroup
              value={form.bathroom}
              onChange={(v) => set("bathroom", v)}
              options={BATHROOM_OPTIONS}
            />
          </div>

          {/* Parking / Internet */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Parking
              </label>
              <PillGroup
                value={form.parking}
                onChange={(v) => set("parking", v)}
                options={PARKING_OPTIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Internet
              </label>
              <PillGroup
                value={form.internet}
                onChange={(v) => set("internet", v)}
                options={INTERNET_OPTIONS}
              />
            </div>
          </div>

          {/* Bills included */}
          <ToggleSwitch
            checked={form.bills_included}
            onChange={(v) => set("bills_included", v)}
            label="Bills included in rent"
          />

          {/* Available from */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Available From
            </label>
            <input
              type="date"
              value={form.available_from || ""}
              onChange={(e) => set("available_from", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Existing photos */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Room Photos
            </label>

            {existingImages.length > 0 && (
              <div className="mb-2 grid grid-cols-3 gap-2">
                {existingImages.map((img) => (
                  <div
                    key={img.id ?? img.image}
                    className="relative h-24 rounded-xl overflow-hidden bg-surface border border-border group"
                  >
                    <img
                      src={getImageUrl(img.image)}
                      alt="Room"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(img)}
                      disabled={removingId === img.id}
                      className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center
                                 bg-black/60 hover:bg-black/80 text-white rounded-lg text-sm
                                 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                    >
                      {removingId === img.id ? "…" : "×"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Newly added photos (not yet saved) */}
            {newPreviews.length > 0 && (
              <div className="mb-2 grid grid-cols-3 gap-2">
                {newPreviews.map((src, i) => (
                  <div
                    key={i}
                    className="relative h-24 rounded-xl overflow-hidden bg-surface border-2 border-accent-light group"
                  >
                    <img
                      src={src}
                      alt={`New ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 bg-accent text-white text-[10px] px-1.5 py-0.5 rounded">
                      new
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNewImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center
                                 bg-black/60 hover:bg-black/80 text-white rounded-lg text-sm
                                 opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed
                              border-border hover:border-accent rounded-xl py-4 cursor-pointer
                              text-muted hover:text-accent transition text-sm bg-surface"
            >
              <span>📷</span>
              <span>
                {newImages.length > 0
                  ? `${newImages.length} new photo${newImages.length > 1 ? "s" : ""} — add more`
                  : "Click to add more photos"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddImages}
                className="hidden"
              />
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 bg-card">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-border
                             text-white font-semibold rounded-xl py-3 text-sm
                             transition-all duration-200 shadow-sm"
          >
            {loading ? "Saving…" : "✏️ Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// src/components/AddRoomModal.js
import React, { useState } from "react";
import axios from "axios";
import LocationPicker from "./LocationPicker";

const EMPTY = {
  title: "",
  price: "",
  location: "",
  description: "",
};

export default function AddRoomModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]); // array of File objects
  const [previews, setPreviews] = useState([]); // array of object URLs
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Geocoding state
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState(null); // null | "found" | "not_found"
  const [coords, setCoords] = useState({ latitude: null, longitude: null });

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    // Reset location confirmation if the user edits the location text again
    if (e.target.name === "location") {
      setLocationStatus(null);
      setCoords({ latitude: null, longitude: null });
    }
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setImages((prev) => [...prev, ...files]);
    setPreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);

    // Allow selecting the same file(s) again later if removed and re-added
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
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
    } catch (err) {
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

    // Block submission if we don't have coordinates yet
    if (!coords.latitude || !coords.longitude) {
      setErrors({
        non_field_errors: [
          "Please confirm your location before publishing (click 'Check Location' or select it on the map).",
        ],
      });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("price", parseFloat(form.price));
    formData.append("location", form.location);
    formData.append("description", form.description);
    formData.append("latitude", coords.latitude);
    formData.append("longitude", coords.longitude);

    // Append each image under the same "images" key —
    // Django's request.FILES.getlist("images") picks all of these up
    images.forEach((file) => formData.append("images", file));

    try {
      await axios.post("/api/listings/", formData, {
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

  const inputClass = (field) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm bg-surface
     focus:outline-none focus:ring-2 focus:border-transparent transition placeholder:text-muted/60
     ${errors[field] ? "border-red-400 focus:ring-red-300 bg-red-50" : "border-border focus:ring-accent"}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-primary font-bold text-lg">List a Room</h2>
            <p className="text-muted text-sm mt-0.5">
              Fill in the details below
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

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {errors.non_field_errors && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {errors.non_field_errors[0]}
            </div>
          )}

          {[
            {
              name: "title",
              label: "Room Title",
              placeholder: "e.g. Cozy room in Thamel",
              required: true,
            },
            {
              name: "price",
              label: "Monthly Price (Rs)",
              placeholder: "e.g. 8000",
              type: "number",
              required: true,
            },
          ].map(({ name, label, placeholder, type = "text", required }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-primary mb-1.5">
                {label}
                {required && <span className="text-accent ml-0.5">*</span>}
              </label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                required={required}
                placeholder={placeholder}
                className={inputClass(name)}
              />
              {errors[name] && (
                <p className="mt-1 text-xs text-red-500">{errors[name][0]}</p>
              )}
            </div>
          ))}

          {/* Location field with check button */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Location <span className="text-accent">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                required
                placeholder="e.g. Thamel, Kathmandu"
                className={inputClass("location")}
              />
              <button
                type="button"
                onClick={handleCheckLocation}
                disabled={checkingLocation || !form.location.trim()}
                className="whitespace-nowrap px-4 rounded-xl bg-surface border border-border
                           text-sm text-primary hover:border-accent transition disabled:opacity-50"
              >
                {checkingLocation ? "Checking..." : "Check Location"}
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
          </div>

          {/* Leaflet map fallback shown only if geocoding failed */}
          {locationStatus === "not_found" && (
            <LocationPicker onLocationSelect={handleMapLocationSelect} />
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Description <span className="text-accent">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe the room, amenities, rules..."
              className={`${inputClass("description")} resize-none`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">
                {errors.description[0]}
              </p>
            )}
          </div>

          {/* Image upload — multiple */}
          <div>
            <label className="block text-sm font-medium text-primary mb-1.5">
              Room Photos{" "}
              <span className="text-muted font-normal">
                (optional, multiple allowed)
              </span>
            </label>

            {previews.length > 0 && (
              <div className="mb-2 grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="relative h-24 rounded-xl overflow-hidden bg-surface border border-border group"
                  >
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
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
                {images.length > 0
                  ? `${images.length} photo${images.length > 1 ? "s" : ""} selected — add more`
                  : "Click to upload photos"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-border
                             text-white font-semibold rounded-xl py-3 text-sm
                             transition-all duration-200 shadow-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Publishing…
              </span>
            ) : (
              "🏠 Publish Listing"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

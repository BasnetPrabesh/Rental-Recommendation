// src/components/AddRoomWizard.js
import React, { useState } from "react";
import axios from "axios";
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

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Type", icon: "🏠" },
  { id: 2, label: "Details", icon: "📋" },
  { id: 3, label: "Location", icon: "📍" },
  { id: 4, label: "Photos", icon: "📷" },
  { id: 5, label: "Price", icon: "💰" },
];

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div className="w-full bg-border rounded-full h-1.5">
      <div
        className="bg-accent h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${(current / total) * 100}%` }}
      />
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddRoomWizard({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    room_type: "room_in_house",
    category: "room",
    title: "",
    description: "",
    furnished: "furnished",
    bathroom: "shared",
    parking: "no",
    internet: "yes",
    bills_included: false,
    available_from: "",
    location: "",
    price: "",
    phone_number: "",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [coords, setCoords] = useState({ latitude: null, longitude: null });
  const [locationStatus, setLocationStatus] = useState(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // ── Image handlers ──
  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImages((p) => [...p, ...files]);
    setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };
  const removeImage = (i) => {
    setImages((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => {
      URL.revokeObjectURL(p[i]);
      return p.filter((_, idx) => idx !== i);
    });
  };

  // ── Location ──
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
    } finally {
      setCheckingLocation(false);
    }
  };

  // ── Validation per step ──
  const validateStep = () => {
    if (step === 1 && !form.room_type) return "Please select a room type.";
    if (step === 1 && !form.category) return "Please select a category.";
    if (step === 2 && !form.title.trim()) return "Room title is required.";
    if (step === 3 && (!coords.latitude || !coords.longitude))
      return "Please confirm your location before continuing.";
    if (step === 5 && !form.price) return "Monthly price is required.";
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) {
      setErrors({ step: err });
      return;
    }
    setErrors({});
    setStep((s) => s + 1);
  };

  const back = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== "" && v !== null && v !== undefined) formData.append(k, v);
    });
    formData.set("bills_included", form.bills_included);
    formData.append("latitude", coords.latitude);
    formData.append("longitude", coords.longitude);
    images.forEach((f) => formData.append("images", f));
    try {
      await axios.post("/api/listings/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess();
    } catch (err) {
      setErrors(
        err.response?.data || {
          step: "Something went wrong. Please try again.",
        },
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Step content ──
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                Step 1 of 5
              </p>
              <h2 className="text-xl font-bold text-primary">
                What type of place are you listing?
              </h2>
              <p className="text-muted text-sm mt-1">
                Choose the option that best describes your property
              </p>
            </div>
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                Step 2 of 5
              </p>
              <h2 className="text-xl font-bold text-primary">
                Tell us about your place
              </h2>
              <p className="text-muted text-sm mt-1">
                Add details that help tenants find the right room
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Listing Title <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Cozy 1BHK near Patan Dhoka"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="Describe the room, nearby amenities, house rules..."
                className={`${inputCls} resize-none`}
              />
            </div>

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

            <ToggleSwitch
              checked={form.bills_included}
              onChange={(v) => set("bills_included", v)}
              label="Bills included in rent"
            />

            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Available From
              </label>
              <input
                type="date"
                value={form.available_from}
                onChange={(e) => set("available_from", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                Step 3 of 5
              </p>
              <h2 className="text-xl font-bold text-primary">
                Where is your place?
              </h2>
              <p className="text-muted text-sm mt-1">
                Enter the area or neighbourhood — we'll pin it on the map
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Location <span className="text-accent">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => {
                    set("location", e.target.value);
                    setLocationStatus(null);
                    setCoords({ latitude: null, longitude: null });
                  }}
                  placeholder="e.g. Baneshwor, Kathmandu"
                  className={inputCls}
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
              {locationStatus === "found" && (
                <p className="mt-1.5 text-xs text-green-600 font-medium">
                  ✓ Location confirmed on map
                </p>
              )}
              {locationStatus === "not_found" && (
                <p className="mt-1.5 text-xs text-orange-500">
                  Location not found automatically — pin it on the map below
                </p>
              )}
            </div>

            {locationStatus === "not_found" && (
              <LocationPicker
                onLocationSelect={(lat, lng) =>
                  setCoords({ latitude: lat, longitude: lng })
                }
              />
            )}

            {coords.latitude && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                📍 Pinned at {coords.latitude.toFixed(4)},{" "}
                {coords.longitude.toFixed(4)}
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                Step 4 of 5
              </p>
              <h2 className="text-xl font-bold text-primary">
                Add photos of your place
              </h2>
              <p className="text-muted text-sm mt-1">
                Listings with photos get 3× more enquiries
              </p>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div
                    key={i}
                    className="relative h-28 rounded-xl overflow-hidden bg-surface border border-border group"
                  >
                    <img
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center
                               bg-black/60 hover:bg-black/80 text-white rounded-lg text-sm
                               opacity-0 group-hover:opacity-100 transition"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <label
              className="flex flex-col items-center justify-center gap-3 w-full border-2 border-dashed
                            border-border hover:border-accent rounded-2xl py-10 cursor-pointer
                            text-muted hover:text-accent transition bg-surface"
            >
              <span className="text-4xl">📷</span>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {images.length > 0
                    ? `${images.length} photo${images.length > 1 ? "s" : ""} added — click to add more`
                    : "Click to upload photos"}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  JPG, PNG up to 10MB each
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImages}
                className="hidden"
              />
            </label>
          </div>
        );

      case 5: {
        const categoryLabel =
          CATEGORY_OPTIONS.find((c) => c.value === form.category)?.label ||
          form.category;
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">
                Step 5 of 5
              </p>
              <h2 className="text-xl font-bold text-primary">Set your price</h2>
              <p className="text-muted text-sm mt-1">
                You can always update this later
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1.5">
                Monthly Rent (Rs) <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">
                  Rs
                </span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="e.g. 12000"
                  className={`${inputCls} pl-10`}
                />
              </div>
              {form.bills_included && (
                <p className="mt-1.5 text-xs text-green-600">
                  ✓ Bills are included in this price
                </p>
              )}
            </div>

            {/* Summary card */}
            <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-primary">
                Listing summary
              </h3>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-muted">Type</span>
                <span className="text-primary font-medium capitalize">
                  {form.room_type.replace("_", " ")}
                </span>
                <span className="text-muted">Category</span>
                <span className="text-primary font-medium">
                  {categoryLabel}
                </span>
                <span className="text-muted">Title</span>
                <span className="text-primary font-medium truncate">
                  {form.title || "—"}
                </span>
                <span className="text-muted">Location</span>
                <span className="text-primary font-medium truncate">
                  {form.location || "—"}
                </span>
                <span className="text-muted">Phone</span>
                <span className="text-primary font-medium">
                  {form.phone_number || "—"}
                </span>
                <span className="text-muted">Furnished</span>
                <span className="text-primary font-medium capitalize">
                  {form.furnished}
                </span>
                <span className="text-muted">Bathroom</span>
                <span className="text-primary font-medium capitalize">
                  {form.bathroom}
                </span>
                <span className="text-muted">Parking</span>
                <span className="text-primary font-medium capitalize">
                  {form.parking}
                </span>
                <span className="text-muted">Internet</span>
                <span className="text-primary font-medium capitalize">
                  {form.internet}
                </span>
                <span className="text-muted">Bills</span>
                <span className="text-primary font-medium">
                  {form.bills_included ? "Included" : "Not included"}
                </span>
                <span className="text-muted">Photos</span>
                <span className="text-primary font-medium">
                  {images.length} uploaded
                </span>
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {STEPS.map((s) => (
                <div key={s.id} className="flex items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                   ${
                                     step === s.id
                                       ? "bg-accent text-white"
                                       : step > s.id
                                         ? "bg-green-500 text-white"
                                         : "bg-border text-muted"
                                   }`}
                  >
                    {step > s.id ? "✓" : s.id}
                  </div>
                  {s.id < STEPS.length && (
                    <div
                      className={`w-6 h-0.5 ${step > s.id ? "bg-green-500" : "bg-border"}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg
                         text-muted hover:text-primary hover:bg-surface transition text-xl"
            >
              ×
            </button>
          </div>
          <ProgressBar current={step} total={STEPS.length} />
        </div>

        {/* Step content */}
        <div className="p-6 overflow-y-auto flex-1">
          {errors.step && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
              {errors.step}
            </div>
          )}
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between gap-3 shrink-0 bg-card">
          <button
            onClick={step === 1 ? onClose : back}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium
                       text-primary hover:bg-surface transition"
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>

          {step < 5 ? (
            <button
              onClick={next}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover
                         text-white text-sm font-semibold transition shadow-sm"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:bg-border
                         text-white text-sm font-semibold transition shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
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
                </>
              ) : (
                "🏠 Publish Listing"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

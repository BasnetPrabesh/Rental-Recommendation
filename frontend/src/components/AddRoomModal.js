// src/components/AddRoomModal.js
import React, { useState } from "react";
import axios from "axios";

const EMPTY = {
  title: "",
  price: "",
  location: "",
  latitude: "",
  longitude: "",
  description: "",
};

export default function AddRoomModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [image, setImage] = useState(null); // ← image file
  const [preview, setPreview] = useState(null); // ← preview URL
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file)); // show preview instantly
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    // Use FormData instead of JSON because we're sending a file
    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("price", parseFloat(form.price));
    formData.append("location", form.location);
    formData.append("description", form.description);
    if (form.latitude) formData.append("latitude", parseFloat(form.latitude));
    if (form.longitude)
      formData.append("longitude", parseFloat(form.longitude));
    if (image) formData.append("image", image);

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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">List a Room</h2>
            <p className="text-emerald-100 text-sm mt-0.5">
              Fill in the details below
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl leading-none transition"
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
            {
              name: "location",
              label: "Location",
              placeholder: "e.g. Thamel, Kathmandu",
              required: true,
            },
          ].map(({ name, label, placeholder, type = "text", required }) => (
            <div key={name}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {label}
                {required && <span className="text-emerald-500 ml-0.5">*</span>}
              </label>
              <input
                type={type}
                name={name}
                value={form[name]}
                onChange={handleChange}
                required={required}
                placeholder={placeholder}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:border-transparent transition
                            ${
                              errors[name]
                                ? "border-red-400 focus:ring-red-300 bg-red-50"
                                : "border-slate-200 focus:ring-emerald-400 bg-slate-50"
                            }`}
              />
              {errors[name] && (
                <p className="mt-1 text-xs text-red-500">{errors[name][0]}</p>
              )}
            </div>
          ))}

          {/* Lat/Lng */}
          <div className="grid grid-cols-2 gap-3">
            {["latitude", "longitude"].map((name) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </label>
                <input
                  type="number"
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder={
                    name === "latitude" ? "e.g. 27.7172" : "e.g. 85.3240"
                  }
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm
                             bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-400
                             focus:border-transparent transition"
                />
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Description <span className="text-emerald-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe the room, amenities, rules..."
              className={`w-full border rounded-xl px-3.5 py-2.5 text-sm resize-none
                          focus:outline-none focus:ring-2 focus:border-transparent transition
                          ${
                            errors.description
                              ? "border-red-400 focus:ring-red-300 bg-red-50"
                              : "border-slate-200 focus:ring-emerald-400 bg-slate-50"
                          }`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">
                {errors.description[0]}
              </p>
            )}
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Room Photo <span className="text-slate-400">(optional)</span>
            </label>

            {/* Preview */}
            {preview && (
              <div className="mb-2 rounded-xl overflow-hidden h-40 bg-slate-100">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <label
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed
                              border-slate-300 hover:border-emerald-400 rounded-xl py-4 cursor-pointer
                              text-slate-400 hover:text-emerald-500 transition text-sm"
            >
              <span>📷</span>
              <span>{image ? image.name : "Click to upload a photo"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500
                       hover:from-emerald-600 hover:to-teal-600
                       disabled:from-slate-300 disabled:to-slate-300
                       text-white font-semibold rounded-xl py-3 text-sm
                       transition-all duration-200 shadow-lg shadow-emerald-200
                       focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
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

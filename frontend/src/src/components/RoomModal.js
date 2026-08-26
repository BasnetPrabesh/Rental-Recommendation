// src/components/RoomModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { getImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "./ConfirmModal";

const ROOM_TYPE_LABELS = {
  room_in_house: "Room in existing house",
  whole_flat: "Whole flat/house",
  student_hostel: "Student hostel",
  homestay: "Homestay",
};

export default function RoomModal({
  room,
  onClose,
  onEdit,
  onDelete,
  deleteLoading,
}) {
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitMessage, setVisitMessage] = useState("");
  const [visitStatus, setVisitStatus] = useState(null);
  const [visitError, setVisitError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setVisitStatus(null);
    setVisitDate("");
    setVisitTime("");
    setVisitMessage("");
    setVisitError("");
    setShowDeleteConfirm(false);
  }, [room]);

  if (!room) return null;

  const isOwner = user?.username === room.owner_username;

  const gallery =
    room.images && room.images.length > 0
      ? room.images.map((img) => img.image)
      : room.image
        ? [room.image]
        : [];

  const activeImage = gallery[activeIndex];

  const goPrev = (e) => {
    e.stopPropagation();
    setActiveIndex((i) => (i - 1 + gallery.length) % gallery.length);
  };
  const goNext = (e) => {
    e.stopPropagation();
    setActiveIndex((i) => (i + 1) % gallery.length);
  };

  const handleScheduleVisit = async () => {
    if (!visitDate || !visitTime) {
      setVisitStatus("error");
      setVisitError("Please choose a date and time for your visit.");
      return;
    }
    setVisitStatus("loading");
    setVisitError("");
    try {
      await axios.post("/api/visits/", {
        listing: room.id,
        visit_date: visitDate,
        visit_time: visitTime,
        message: visitMessage,
      });
      setVisitStatus("success");
    } catch (err) {
      const detail =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        Object.values(err.response?.data || {})[0]?.[0] ||
        "Could not send visit request.";
      if (
        detail.toLowerCase().includes("unique") ||
        detail.toLowerCase().includes("already")
      ) {
        setVisitStatus("already");
      } else {
        setVisitStatus("error");
        setVisitError(detail);
      }
    }
  };

  // Visits can only be scheduled from today onward
  const today = new Date().toISOString().split("T")[0];

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-NP", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const DetailChip = ({ icon, label }) => (
    <div className="flex items-center gap-2 bg-surface border border-border rounded-xl px-3 py-2">
      <span className="text-base">{icon}</span>
      <span className="text-xs text-primary font-medium">{label}</span>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-card rounded-2xl w-full max-w-lg shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "slideUp 0.2s ease" }}
        >
          {/* Gallery */}
          <div className="relative shrink-0">
            {activeImage ? (
              <div className="h-60 relative overflow-hidden">
                <img
                  src={getImageUrl(activeImage)}
                  alt={room.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                {gallery.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                                 bg-black/30 hover:bg-black/50 text-white rounded-full text-lg transition"
                    >
                      ‹
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                                 bg-black/30 hover:bg-black/50 text-white rounded-full text-lg transition"
                    >
                      ›
                    </button>
                    <div className="absolute top-3 right-12 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                      {activeIndex + 1} / {gallery.length}
                    </div>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center
                             bg-black/30 hover:bg-black/50 text-white rounded-lg text-xl transition"
                >
                  ×
                </button>

                <div className="absolute bottom-4 left-4 right-4">
                  {room.room_type && (
                    <span
                      className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-semibold
                                     px-2.5 py-1 rounded-lg mb-2"
                    >
                      {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <h2 className="text-white font-bold text-xl leading-tight">
                      {room.title}
                    </h2>
                    {room.is_booked && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shrink-0">
                        Booked
                      </span>
                    )}
                  </div>
                  <p className="text-white/70 text-sm mt-0.5">
                    📍 {room.location}
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 border-b border-border flex items-start justify-between bg-surface">
                <div>
                  {room.room_type && (
                    <span
                      className="inline-block bg-accent-light text-accent text-xs font-semibold
                                     px-2.5 py-1 rounded-lg mb-1.5"
                    >
                      {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <h2 className="text-primary font-bold text-xl">
                      {room.title}
                    </h2>
                    {room.is_booked && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
                        Booked
                      </span>
                    )}
                  </div>
                  <p className="text-muted text-sm mt-0.5">
                    📍 {room.location}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-muted hover:text-primary hover:bg-border transition text-xl"
                >
                  ×
                </button>
              </div>
            )}

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-card border-b border-border">
                {gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    className={`shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition
                                ${i === activeIndex ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img
                      src={getImageUrl(img)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Price */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">
                    Rs {Number(room.price).toLocaleString()}
                  </span>
                  <span className="text-muted text-sm">/ month</span>
                </div>
                {room.bills_included && (
                  <span className="text-xs text-green-600 font-medium">
                    ✓ Bills included
                  </span>
                )}
              </div>
              {room.available_from ? (
                <div className="text-right">
                  <p className="text-xs text-muted">Available from</p>
                  <p className="text-sm font-semibold text-primary">
                    {formatDate(room.available_from)}
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-xl">
                  ✓ Available now
                </div>
              )}
            </div>

            {/* Detail chips */}
            <div className="grid grid-cols-2 gap-2">
              {room.furnished && (
                <DetailChip
                  icon={
                    room.furnished === "furnished"
                      ? "🛋️"
                      : room.furnished === "unfurnished"
                        ? "📦"
                        : "🪑"
                  }
                  label={
                    room.furnished === "furnished"
                      ? "Furnished"
                      : room.furnished === "unfurnished"
                        ? "Unfurnished"
                        : "Partially furnished"
                  }
                />
              )}
              {room.bathroom && (
                <DetailChip
                  icon={
                    room.bathroom === "private"
                      ? "🔒"
                      : room.bathroom === "ensuite"
                        ? "✨"
                        : "🚿"
                  }
                  label={
                    room.bathroom === "private"
                      ? "Private bathroom"
                      : room.bathroom === "ensuite"
                        ? "Ensuite"
                        : "Shared bathroom"
                  }
                />
              )}
              {room.parking && (
                <DetailChip
                  icon="🚗"
                  label={
                    room.parking === "yes"
                      ? "Parking available"
                      : room.parking === "no"
                        ? "No parking"
                        : "Parking flexible"
                  }
                />
              )}
              {room.internet && (
                <DetailChip
                  icon="📶"
                  label={
                    room.internet === "yes"
                      ? "Internet included"
                      : "No internet"
                  }
                />
              )}
            </div>

            {/* Description */}
            {room.description && (
              <div>
                <h4 className="text-sm font-semibold text-primary mb-2">
                  About this place
                </h4>
                <p className="text-muted text-sm leading-relaxed">
                  {room.description}
                </p>
              </div>
            )}

            {/* Listed by */}
            {room.owner_username && (
              <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">
                    {room.owner_username[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted">Listed by</p>
                  <p className="text-sm font-semibold text-primary">
                    {room.owner_username}
                  </p>
                </div>
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="flex gap-2 border-t border-border pt-4">
                <button
                  onClick={onEdit}
                  className="flex-1 text-sm font-medium text-accent bg-accent-light
                             hover:bg-amber-200 rounded-xl py-2.5 transition"
                >
                  ✏️ Edit Listing
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="flex-1 text-sm font-medium text-red-600 bg-red-50
                             hover:bg-red-100 disabled:opacity-50 rounded-xl py-2.5 transition"
                >
                  {deleteLoading ? "Deleting…" : "🗑️ Delete"}
                </button>
              </div>
            )}

            {/* Tenant: schedule a visit */}
            {!isOwner && (
              <div className="border-t border-border pt-4 space-y-3">
                {room.is_booked ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center font-medium">
                    🔒 This room is currently booked
                  </div>
                ) : visitStatus === "success" ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center">
                    <p className="text-2xl mb-1">📅</p>
                    <p className="text-sm font-semibold text-green-700">
                      Visit request sent!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      The owner will review and confirm your visit shortly.
                    </p>
                  </div>
                ) : visitStatus === "already" ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 text-center">
                    ⚠️ You already have a visit request for this room.
                  </div>
                ) : (
                  <>
                    <h4 className="text-sm font-semibold text-primary">
                      📅 Schedule a Visit
                    </h4>
                    {visitStatus === "error" && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                        {visitError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={visitDate}
                        min={today}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface
                                   focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                                   transition"
                      />
                      <input
                        type="time"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-surface
                                   focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                                   transition"
                      />
                    </div>
                    <textarea
                      value={visitMessage}
                      onChange={(e) => setVisitMessage(e.target.value)}
                      placeholder="Message to owner (e.g. questions about the room)..."
                      rows={2}
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface
                                 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent
                                 transition resize-none placeholder:text-muted/60"
                    />
                    <button
                      onClick={handleScheduleVisit}
                      disabled={visitStatus === "loading"}
                      className="w-full bg-accent hover:bg-accent-hover disabled:bg-border
                                 text-white font-semibold rounded-xl py-3 text-sm
                                 transition-all duration-200 shadow-sm"
                    >
                      {visitStatus === "loading"
                        ? "Sending request…"
                        : "📅 Schedule a Visit"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Listing?"
        message={`"${room.title}" will be permanently deleted along with all its photos and visit request history. This cannot be undone.`}
        confirmText="Delete"
        cancelText="Keep it"
        variant="danger"
        loading={deleteLoading}
        onConfirm={() => {
          onDelete();
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

// src/components/RoomCard.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";

const ROOM_TYPE_LABELS = {
  room_in_house: "Room in house",
  whole_flat: "Whole flat",
  student_hostel: "Student hostel",
  homestay: "Homestay",
};

export default function RoomCard({ room, onClick, onLikeChange }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(!!room.is_liked);
  const [likeLoading, setLikeLoading] = useState(false);

  const gallery =
    room.images && room.images.length > 0
      ? room.images.map((img) => img.image)
      : room.image
        ? [room.image]
        : [];

  const thumbnail = gallery[0];

  const formatDate = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return date.toLocaleDateString("en-NP", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleToggleLike = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);
    const next = !liked;
    setLiked(next); // optimistic
    try {
      const res = await axios.post(`/api/listings/${room.id}/like/`);
      setLiked(res.data.liked);
      onLikeChange?.(room, res.data.liked);
    } catch {
      setLiked(!next); // revert on failure
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div
      onClick={() => onClick(room)}
      className="bg-card rounded-2xl border border-border
                 hover:border-accent hover:-translate-y-0.5 transition-all duration-200
                 cursor-pointer overflow-hidden group"
    >
      <div className="h-48 relative overflow-hidden bg-surface">
        {thumbnail ? (
          <img
            src={getImageUrl(thumbnail)}
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent-light">
            <span className="text-5xl opacity-20">🏠</span>
          </div>
        )}

        {room.is_booked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-primary text-sm font-bold px-4 py-2 rounded-xl">
              🔒 Booked
            </span>
          </div>
        )}

        {!room.is_booked && room.has_active_visit && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-primary text-sm font-bold px-4 py-2 rounded-xl">
              📅 Visit Scheduled
            </span>
          </div>
        )}

        {room.room_type && (
          <div className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/95 text-primary border border-border">
            {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
          </div>
        )}

        {room.distance_km !== undefined && (
          <div className="absolute top-3 left-3 mt-8 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/90 text-white">
            📍 {room.distance_km} km
          </div>
        )}

        {/* Like button */}
        <button
          onClick={handleToggleLike}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 border border-border
                     flex items-center justify-center transition hover:scale-110 active:scale-95"
        >
          <span
            className={liked ? "text-red-500" : "text-muted"}
            style={{ fontSize: "16px" }}
          >
            {liked ? "♥" : "♡"}
          </span>
        </button>

        {gallery.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-lg">
            📷 {gallery.length}
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-white rounded-xl px-3 py-1.5 border border-border">
          <span className="text-primary font-bold text-sm">
            Rs {Number(room.price).toLocaleString()}
          </span>
          <span className="text-muted text-xs">/mo</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-primary truncate text-base group-hover:text-accent transition-colors">
          {room.title}
        </h3>
        <p className="text-muted text-sm mt-1 flex items-center gap-1 truncate">
          <span>📍</span> {room.location}
        </p>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {room.furnished && (
            <span className="text-xs bg-surface border border-border text-muted px-2 py-0.5 rounded-lg">
              {room.furnished === "furnished"
                ? "🛋️ Furnished"
                : room.furnished === "unfurnished"
                  ? "📦 Unfurnished"
                  : "🪑 Partial"}
            </span>
          )}
          {room.bathroom && (
            <span className="text-xs bg-surface border border-border text-muted px-2 py-0.5 rounded-lg">
              {room.bathroom === "private"
                ? "🔒 Private bath"
                : room.bathroom === "ensuite"
                  ? "✨ Ensuite"
                  : "🚿 Shared bath"}
            </span>
          )}
          {room.internet === "yes" && (
            <span className="text-xs bg-surface border border-border text-muted px-2 py-0.5 rounded-lg">
              📶 WiFi
            </span>
          )}
          {room.bills_included && (
            <span className="text-xs bg-surface border border-border text-primary px-2 py-0.5 rounded-lg">
              ✓ Bills included
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
          <div>
            {room.available_from ? (
              <p className="text-xs text-muted">
                Available{" "}
                <span className="text-primary font-medium">
                  {formatDate(room.available_from)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted font-medium">✓ Available now</p>
            )}
          </div>
          {room.owner_username && (
            <p className="text-xs text-muted">
              by{" "}
              <span className="font-medium text-primary">
                {room.owner_username}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
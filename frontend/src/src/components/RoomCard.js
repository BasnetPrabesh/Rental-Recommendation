// src/components/RoomCard.js
import React from "react";
import { getImageUrl } from "../utils/imageUrl";

const ROOM_TYPE_LABELS = {
  room_in_house: "Room in house",
  whole_flat: "Whole flat",
  student_hostel: "Student hostel",
  homestay: "Homestay",
};

const ROOM_TYPE_COLORS = {
  room_in_house: "bg-blue-100 text-blue-700",
  whole_flat: "bg-purple-100 text-purple-700",
  student_hostel: "bg-yellow-100 text-yellow-700",
  homestay: "bg-green-100 text-green-700",
};

export default function RoomCard({ room, onClick }) {
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

  return (
    <div
      onClick={() => onClick(room)}
      className="bg-card rounded-2xl border border-border shadow-sm
                 hover:shadow-lg hover:-translate-y-1 transition-all duration-200
                 cursor-pointer overflow-hidden group"
    >
      {/* Image */}
      <div className="h-48 relative overflow-hidden bg-surface">
        {thumbnail ? (
          <img
            src={getImageUrl(thumbnail)}
            alt={room.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-accent-light">
            <span className="text-5xl opacity-30">🏠</span>
          </div>
        )}

        {/* Booked overlay */}
        {room.is_booked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-xl">
              🔒 Booked
            </span>
          </div>
        )}

        {/* Room type badge */}
        {room.room_type && (
          <div
            className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-lg
                           ${ROOM_TYPE_COLORS[room.room_type] || "bg-gray-100 text-gray-600"}`}
          >
            {ROOM_TYPE_LABELS[room.room_type] || room.room_type}
          </div>
        )}

        {/* Photo count */}
        {gallery.length > 1 && (
          <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs font-medium px-2 py-1 rounded-lg">
            📷 {gallery.length}
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-white rounded-xl px-3 py-1.5 shadow-sm border border-border">
          <span className="text-primary font-bold text-sm">
            Rs {Number(room.price).toLocaleString()}
          </span>
          <span className="text-muted text-xs">/mo</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-semibold text-primary truncate text-base group-hover:text-accent transition-colors">
          {room.title}
        </h3>
        <p className="text-muted text-sm mt-1 flex items-center gap-1 truncate">
          <span>📍</span> {room.location}
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {room.furnished && (
            <span className="text-xs bg-surface border border-border text-muted px-2 py-0.5 rounded-lg capitalize">
              {room.furnished === "furnished"
                ? "🛋️ Furnished"
                : room.furnished === "unfurnished"
                  ? "📦 Unfurnished"
                  : "🪑 Partial"}
            </span>
          )}
          {room.bathroom && (
            <span className="text-xs bg-surface border border-border text-muted px-2 py-0.5 rounded-lg capitalize">
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
            <span className="text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-lg">
              ✓ Bills included
            </span>
          )}
        </div>

        {/* Footer */}
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
              <p className="text-xs text-green-600 font-medium">
                ✓ Available now
              </p>
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

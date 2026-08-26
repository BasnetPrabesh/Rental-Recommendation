// src/pages/MyListings.js
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import RoomCard from "../components/RoomCard";
import RoomModal from "../components/RoomModal";
import AddRoomWizard from "../components/AddRoomWizard";
import { useAuth } from "../context/AuthContext";

export default function MyListings() {
  const { user, isLister } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddWizard, setShowAddWizard] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    setError("");
    try {
      // NOTE: no dedicated "mine" endpoint exists yet, so this filters
      // client-side. If you add one later (e.g. /api/listings/mine/),
      // swap this for that call.
      const res = await axios.get("/api/listings/");
      setRooms(res.data.filter((r) => r.owner_username === user?.username));
    } catch {
      setError("Could not load your listings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLister) fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLister]);

  const stats = useMemo(
    () => ({
      total: rooms.length,
      booked: rooms.filter((r) => r.is_booked).length,
      available: rooms.filter((r) => !r.is_booked).length,
    }),
    [rooms],
  );

  if (!isLister) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 text-center">
        <p className="text-4xl mb-3">🏘️</p>
        <p className="text-primary font-medium">
          This page is for property listers
        </p>
        <p className="text-muted text-sm mt-1">
          Your account is registered as a seeker.
        </p>
        <Link
          to="/"
          className="mt-4 text-accent text-sm font-semibold hover:underline"
        >
          ← Back to browsing
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary border-b border-primary/20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">My Listings</h1>
            <p className="text-white/50 text-xs mt-0.5">
              {stats.total} total · {stats.available} available · {stats.booked}{" "}
              booked
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddWizard(true)}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold
                         px-4 py-2 rounded-xl shadow-sm transition-all duration-200"
            >
              + Add Room
            </button>
            <Link
              to="/"
              className="text-white/60 hover:text-white text-sm px-3 py-2 hover:bg-white/10 rounded-xl transition"
            >
              ← All rooms
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border h-64 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && rooms.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4 opacity-40">🏠</p>
            <p className="text-primary font-medium">
              You haven't listed anything yet
            </p>
            <p className="text-muted text-sm mt-1">
              Add your first room to start receiving visit requests
            </p>
            <button
              onClick={() => setShowAddWizard(true)}
              className="mt-4 bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
            >
              + Add Room
            </button>
          </div>
        )}

        {!loading && !error && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => setSelectedRoom(room)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedRoom && (
        <RoomModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onUpdated={fetchRooms}
        />
      )}

      {showAddWizard && (
        <AddRoomWizard
          onClose={() => setShowAddWizard(false)}
          onSuccess={() => {
            setShowAddWizard(false);
            fetchRooms();
          }}
        />
      )}
    </div>
  );
}

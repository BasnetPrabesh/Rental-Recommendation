// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";

// ─── Protected Route ──────────────────────────────────────────────────────────
/**
 * Wrap any route you want to guard behind authentication.
 * Shows a spinner while we're still reading localStorage,
 * redirects to /login if not authenticated.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin h-8 w-8 border-4 border-stone-300 border-t-stone-700 rounded-full" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-bold text-stone-800 tracking-tight">
        🏠 RoomFinder
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-stone-500">
          Signed in as{" "}
          <span className="font-medium text-stone-700">{user?.username}</span>
        </span>
        <button
          onClick={logout}
          className="text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium
                     px-3 py-1.5 rounded-lg transition"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

// ─── Room Card ────────────────────────────────────────────────────────────────
function RoomCard({ room, onClick }) {
  return (
    <div
      onClick={() => onClick(room)}
      className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md
                 transition cursor-pointer overflow-hidden group"
    >
      <div className="h-40 bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
        <span className="text-4xl">🏠</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-stone-800 truncate group-hover:text-stone-600 transition">
          {room.title}
        </h3>
        <p className="text-sm text-stone-500 mt-0.5">📍 {room.location}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-stone-800">
            ${Number(room.price).toLocaleString()}
            <span className="text-xs font-normal text-stone-400">/mo</span>
          </span>
          {room.owner_username && (
            <span className="text-xs text-stone-400">
              by {room.owner_username}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ room, onClose }) {
  if (!room) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-stone-800">{room.title}</h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-stone-500 text-sm mb-2">📍 {room.location}</p>
        <p className="text-2xl font-bold text-stone-800 mb-4">
          ${Number(room.price).toLocaleString()}
          <span className="text-sm font-normal text-stone-400">/mo</span>
        </p>
        {room.description && (
          <p className="text-stone-600 text-sm leading-relaxed">
            {room.description}
          </p>
        )}
        {room.owner_username && (
          <p className="mt-4 text-xs text-stone-400">
            Listed by {room.owner_username}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Home (protected) ─────────────────────────────────────────────────────────
function Home() {
  const [rooms, setRooms] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("/api/listings/")
      .then(({ data }) => setRooms(data))
      .catch(() => setError("Could not load listings. Please try again."))
      .finally(() => setFetching(false));
  }, []);

  const filtered = rooms.filter(
    (r) =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.location.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or location…"
            className="w-full max-w-md border border-stone-300 rounded-xl px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-transparent transition"
          />
        </div>

        {/* States */}
        {fetching && (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-stone-300 border-t-stone-700 rounded-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {!fetching && !error && filtered.length === 0 && (
          <p className="text-center text-stone-400 py-20">No rooms found.</p>
        )}

        {/* Grid */}
        {!fetching && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((room) => (
              <RoomCard key={room.id} room={room} onClick={setSelected} />
            ))}
          </div>
        )}
      </main>

      <Modal room={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          {/* Catch-all → home (will redirect to login if not authed) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

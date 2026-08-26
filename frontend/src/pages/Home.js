// src/pages/Home.js
import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import Header from "../components/Header";
import RoomCard from "../components/RoomCard";
import RoomModal from "../components/RoomModal";
import AddRoomWizard from "../components/AddRoomWizard";
import { useAuth } from "../context/AuthContext";
import {
  CATEGORY_OPTIONS,
  ROOM_TYPE_OPTIONS,
  FURNISHED_OPTIONS,
} from "../components/RoomFormControls";

// Maps each backend match_reason string to a small icon, so the reason
// pill under a recommended room reads at a glance (💰 = price match,
// 📍 = location match, etc.) instead of forcing the user to read text.
const REASON_ICONS = {
  "Similar price range": "💰",
  "Close to a room you liked": "📍",
  "Same room type": "🏷️",
  "Similar to rooms you've shown interest in": "📝",
  "Popular with users who liked similar rooms": "👥",
};

const CATEGORIES = [
  { value: "", label: "All", icon: "🏠" },
  ...CATEGORY_OPTIONS,
];

const ROOM_TYPE_FILTER_OPTIONS = [
  { value: "", label: "Any type" },
  ...ROOM_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "distance", label: "Nearest first" },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterFurnished, setFilterFurnished] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddWizard, setShowAddWizard] = useState(false);

  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState("");

  const [recommended, setRecommended] = useState([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const recommendedRailRef = useRef(null);

  const fetchRooms = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("/api/listings/");
      setRooms(res.data);
    } catch {
      setError("Could not load rooms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRecommended = async () => {
    setRecommendedLoading(true);
    try {
      const res = await axios.get("/api/recommendations/");
      setRecommended(res.data);
    } catch {
      setRecommended([]); // fail quietly — this is a bonus section, not the main list
    } finally {
      setRecommendedLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) fetchRecommended();
    else setRecommended([]);
  }, [isAuthenticated]);

  const handleLikeChange = () => {
    if (isAuthenticated) fetchRecommended();
  };

  const scrollRail = (direction) => {
    const el = recommendedRailRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 320, behavior: "smooth" });
  };

  const handleNearMe = () => {
    if (nearMeActive) {
      setNearMeActive(false);
      setSortBy("newest");
      fetchRooms();
      return;
    }
    if (!navigator.geolocation) {
      setNearMeError("Your browser doesn't support location access.");
      return;
    }
    setNearMeLoading(true);
    setNearMeError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await axios.get("/api/listings/nearby/", {
            params: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          setRooms(res.data);
          setNearMeActive(true);
          setSortBy("distance");
        } catch {
          setNearMeError("Could not load nearby rooms.");
        } finally {
          setNearMeLoading(false);
        }
      },
      () => {
        setNearMeError(
          "Location access denied. Enable it in your browser to use Near Me.",
        );
        setNearMeLoading(false);
      },
    );
  };

  const filtered = useMemo(() => {
    let result = [...rooms];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q),
      );
    }
    if (filterCategory)
      result = result.filter((r) => r.category === filterCategory);
    if (filterType) result = result.filter((r) => r.room_type === filterType);
    if (filterFurnished)
      result = result.filter((r) => r.furnished === filterFurnished);
    if (filterMaxPrice)
      result = result.filter((r) => Number(r.price) <= Number(filterMaxPrice));

    if (sortBy === "price_asc")
      result.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "price_desc")
      result.sort((a, b) => Number(b.price) - Number(a.price));
    else if (sortBy === "distance" && nearMeActive)
      result.sort((a, b) => Number(a.distance_km) - Number(b.distance_km));
    else result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return result;
  }, [
    rooms,
    search,
    filterCategory,
    filterType,
    filterFurnished,
    filterMaxPrice,
    sortBy,
    nearMeActive,
  ]);

  const activeFilters = [
    filterCategory,
    filterType,
    filterFurnished,
    filterMaxPrice,
  ].filter(Boolean);

  const clearFilters = () => {
    setFilterCategory("");
    setFilterType("");
    setFilterFurnished("");
    setFilterMaxPrice("");
  };

  return (
    <div className="min-h-screen bg-surface">
      <Header onAddRoom={() => setShowAddWizard(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isAuthenticated && (recommendedLoading || recommended.length > 0) && (
          <div className="mb-8 relative">
            {(() => {
              const isPersonalized =
                recommended.length > 0 && recommended[0].match_reason !== undefined;
              return (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
                      {isPersonalized ? (
                        <>✨ Rooms you may like</>
                      ) : (
                        <>🆕 New on RoomFinder</>
                      )}
                    </h2>
                    {!recommendedLoading && recommended.length > 3 && (
                      <div className="hidden sm:flex gap-2">
                        <button
                          onClick={() => scrollRail(-1)}
                          aria-label="Scroll left"
                          className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center
                                     text-muted hover:text-primary hover:border-accent transition"
                        >
                          ‹
                        </button>
                        <button
                          onClick={() => scrollRail(1)}
                          aria-label="Scroll right"
                          className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center
                                     text-muted hover:text-primary hover:border-accent transition"
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>

                  {!isPersonalized && !recommendedLoading && (
                    <p className="text-xs text-muted mb-3 -mt-2">
                      Like a few rooms and this section will start matching your taste.
                    </p>
                  )}

                  {recommendedLoading ? (
                    <div className="flex gap-4 overflow-x-auto pb-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="shrink-0 w-64 bg-card rounded-2xl border border-border h-64 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div
                      ref={recommendedRailRef}
                      className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth"
                    >
                      {recommended.map((room, i) => (
                        <div key={room.id} className="shrink-0 w-64 relative">
                          {isPersonalized && i === 0 && (
                            <div
                              className="absolute -top-2 left-3 z-10 bg-primary text-white text-[11px] font-semibold
                                         px-2.5 py-1 rounded-full shadow-sm"
                            >
                              🏆 Top match
                            </div>
                          )}
                          <RoomCard
                            room={room}
                            onClick={() => setSelectedRoom(room)}
                            onLikeChange={handleLikeChange}
                          />
                          {room.match_reason && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-medium text-accent
                                         bg-accent-light px-2 py-1 rounded-full mt-2"
                            >
                              {REASON_ICONS[room.match_reason] || "💡"} {room.match_reason}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, location, or description…"
              className="w-full border border-border rounded-xl pl-11 pr-4 py-3 text-sm bg-card
                         focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition
                         placeholder:text-muted/60"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleNearMe}
              disabled={nearMeLoading}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium border transition whitespace-nowrap
                          ${nearMeActive ? "bg-accent text-white border-accent" : "bg-card border-border text-primary hover:border-accent"}`}
            >
              📍{" "}
              {nearMeLoading
                ? "Locating…"
                : nearMeActive
                  ? "Near Me ✓"
                  : "Near Me"}
            </button>
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium border transition
                          ${showFilters ? "bg-accent text-white border-accent" : "bg-card border-border text-primary hover:border-accent"}`}
            >
              ⚙️ Filters
              {activeFilters.length > 0 && (
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilters.length}
                </span>
              )}
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-border rounded-xl px-3 py-3 text-sm bg-card text-primary
                         focus:outline-none focus:ring-2 focus:ring-accent transition"
            >
              {SORT_OPTIONS.filter(
                (o) => o.value !== "distance" || nearMeActive,
              ).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {nearMeError && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">
            ⚠️ {nearMeError}
          </div>
        )}

        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={`shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border transition
                          ${filterCategory === c.value ? "bg-accent text-white border-accent" : "bg-card border-border text-muted hover:border-accent hover:text-primary"}`}
            >
              <span className="text-xl leading-none">{c.icon}</span>
              <span className="text-[11px] font-medium">{c.label}</span>
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Room type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface
                           focus:outline-none focus:ring-2 focus:ring-accent transition"
              >
                {ROOM_TYPE_FILTER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Furnished
              </label>
              <select
                value={filterFurnished}
                onChange={(e) => setFilterFurnished(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface
                           focus:outline-none focus:ring-2 focus:ring-accent transition"
              >
                <option value="">Any</option>
                {FURNISHED_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                Max price (Rs/mo)
              </label>
              <input
                type="number"
                value={filterMaxPrice}
                onChange={(e) => setFilterMaxPrice(e.target.value)}
                placeholder="No limit"
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface
                           focus:outline-none focus:ring-2 focus:ring-accent transition placeholder:text-muted/60"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full text-sm font-medium text-muted hover:text-red-500 border border-border
                           hover:border-red-300 rounded-xl py-2 transition"
              >
                Clear filters
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted">
            {loading
              ? "Loading…"
              : `${filtered.length} room${filtered.length === 1 ? "" : "s"} found`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border h-64 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4 opacity-40">🔍</p>
            <p className="text-primary font-medium">
              No rooms match your search
            </p>
            <p className="text-muted text-sm mt-1">
              Try adjusting your filters
            </p>
            {activeFilters.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 text-accent text-sm font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={() => setSelectedRoom(room)}
                onLikeChange={handleLikeChange}
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
          onSelectRoom={(r) => setSelectedRoom(r)}
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
// src/pages/Home.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

import Header from "../components/Header";
import SkeletonCard from "../components/SkeletonCard";
import RoomCard from "../components/RoomCard";
import RoomModal from "../components/RoomModal";
import EditRoomModal from "../components/EditRoomModal";
import AddRoomWizard from "../components/AddRoomWizard";
import ToastBanner from "../components/ToastBanner";

const ROOM_TYPES = [
  { value: "", label: "All types" },
  { value: "room_in_house", label: "Room in house" },
  { value: "whole_flat", label: "Whole flat" },
  { value: "student_hostel", label: "Student hostel" },
  { value: "homestay", label: "Homestay" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: Low to high" },
  { value: "price_desc", label: "Price: High to low" },
];

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState("");
  const [filterFurnished, setFilterFurnished] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Near Me
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState("");

  // TF-IDF search
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const fetchRooms = useCallback(() => {
    setLoading(true);
    setError("");
    axios
      .get("/api/listings/")
      .then(({ data }) => setRooms(data))
      .catch(() =>
        setError("Could not load listings. Is Django running on port 8000?"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Debounced TF-IDF search
  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults(null);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    const timer = setTimeout(() => {
      axios
        .get(`/api/listings/search/?q=${encodeURIComponent(query)}`)
        .then(({ data }) => setSearchResults(data))
        .catch(() => {
          setSearchError("Search failed. Please try again.");
          setSearchResults([]);
        })
        .finally(() => setSearching(false));
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setNearMeError("Browser doesn't support location.");
      return;
    }
    setNearMeLoading(true);
    setNearMeError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        axios
          .get(
            `/api/listings/nearby/?lat=${latitude}&lng=${longitude}&radius=10`,
          )
          .then(({ data }) => {
            setRooms(data);
            setNearMeActive(true);
          })
          .catch(() => setNearMeError("Could not fetch nearby rooms."))
          .finally(() => setNearMeLoading(false));
      },
      () => {
        setNearMeError("Location access denied.");
        setNearMeLoading(false);
      },
    );
  };

  const clearNearMe = () => {
    setNearMeActive(false);
    fetchRooms();
  };

  const handleDelete = async (room) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/listings/${room.id}/`);
      setSelectedRoom(null);
      fetchRooms();
    } catch {
      alert("Could not delete. You may not be the owner.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Apply filters + sort on top of search/near-me results
  const applyFiltersAndSort = (list) => {
    let result = [...list];
    if (filterType) result = result.filter((r) => r.room_type === filterType);
    if (filterFurnished)
      result = result.filter((r) => r.furnished === filterFurnished);
    if (filterMaxPrice)
      result = result.filter((r) => Number(r.price) <= Number(filterMaxPrice));

    if (sortBy === "price_asc")
      result.sort((a, b) => Number(a.price) - Number(b.price));
    if (sortBy === "price_desc")
      result.sort((a, b) => Number(b.price) - Number(a.price));
    if (sortBy === "newest")
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return result;
  };

  const baseList = searchResults !== null ? searchResults : rooms;
  const displayedRooms = applyFiltersAndSort(baseList);
  const activeFilters = [filterType, filterFurnished, filterMaxPrice].filter(
    Boolean,
  ).length;

  return (
    <div className="min-h-screen bg-surface">
      <Header onAddRoom={() => setShowAddWizard(true)} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero search bar */}
        <div className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                {searching ? "⏳" : "🔍"}
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try: furnished room near college..."
                className="w-full border border-border bg-card rounded-xl
                           pl-11 pr-4 py-3 text-sm shadow-sm
                           focus:outline-none focus:ring-2 focus:ring-accent
                           focus:border-transparent transition placeholder:text-muted/60"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary text-lg"
                >
                  ×
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((p) => !p)}
              className={`relative px-4 py-3 rounded-xl border text-sm font-medium transition
                          ${
                            showFilters || activeFilters > 0
                              ? "bg-accent text-white border-accent"
                              : "bg-card border-border text-primary hover:border-accent"
                          }`}
            >
              🎛️ Filters
              {activeFilters > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white
                                 text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {activeFilters}
                </span>
              )}
            </button>

            {nearMeActive ? (
              <button
                onClick={clearNearMe}
                className="px-4 py-3 rounded-xl bg-surface border border-border
                           text-sm text-primary hover:border-accent transition whitespace-nowrap"
              >
                ✕ Near me
              </button>
            ) : (
              <button
                onClick={handleNearMe}
                disabled={nearMeLoading}
                className="px-4 py-3 rounded-xl bg-accent hover:bg-accent-hover
                           text-sm text-white font-medium transition disabled:opacity-50 whitespace-nowrap"
              >
                {nearMeLoading ? "Locating…" : "📍 Near Me"}
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-3 p-4 bg-card border border-border rounded-2xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Room type */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Room type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROOM_TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFilterType(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                                    ${
                                      filterType === t.value
                                        ? "bg-accent text-white border-accent"
                                        : "bg-surface border-border text-muted hover:border-accent"
                                    }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Furnished */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Furnished
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: "", label: "Any" },
                      { value: "furnished", label: "Furnished" },
                      { value: "unfurnished", label: "Unfurnished" },
                      { value: "partial", label: "Partial" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setFilterFurnished(t.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                                    ${
                                      filterFurnished === t.value
                                        ? "bg-accent text-white border-accent"
                                        : "bg-surface border-border text-muted hover:border-accent"
                                    }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Max price */}
                <div>
                  <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                    Max price (Rs/mo)
                  </label>
                  <input
                    type="number"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    placeholder="e.g. 20000"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface
                               focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide mr-3">
                    Sort by
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-sm border border-border rounded-xl px-3 py-1.5 bg-surface
                               focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {activeFilters > 0 && (
                  <button
                    onClick={() => {
                      setFilterType("");
                      setFilterFurnished("");
                      setFilterMaxPrice("");
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium transition"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-primary">
              {searchResults !== null
                ? "Search Results"
                : nearMeActive
                  ? "Rooms Near You"
                  : "Available Rooms"}
            </h2>
            <p className="text-muted text-sm mt-0.5">
              {displayedRooms.length} listing
              {displayedRooms.length !== 1 ? "s" : ""} found
              {activeFilters > 0 && (
                <span className="text-accent ml-1">
                  · {activeFilters} filter{activeFilters > 1 ? "s" : ""} applied
                </span>
              )}
            </p>
          </div>
          {!showFilters && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-border rounded-xl px-3 py-2 bg-card
                         focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Room type quick filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {ROOM_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition
                          ${
                            filterType === t.value
                              ? "bg-accent text-white border-accent shadow-sm"
                              : "bg-card border-border text-muted hover:border-accent hover:text-primary"
                          }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Errors */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">
            ⚠️ {searchError}
          </div>
        )}
        {nearMeError && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm mb-4">
            ⚠️ {nearMeError}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && displayedRooms.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🏚️</p>
            <p className="text-primary font-medium text-lg">No rooms found</p>
            <p className="text-muted text-sm mt-1">
              {search || activeFilters > 0
                ? "Try adjusting your search or filters"
                : "Be the first to add a listing!"}
            </p>
            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setFilterType("");
                  setFilterFurnished("");
                  setFilterMaxPrice("");
                }}
                className="mt-4 px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium transition hover:bg-accent-hover"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && displayedRooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedRooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={setSelectedRoom} />
            ))}
          </div>
        )}
      </main>

      <ToastBanner />

      <RoomModal
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onEdit={() => setShowEditModal(true)}
        onDelete={() => handleDelete(selectedRoom)}
        deleteLoading={deleteLoading}
      />

      {showEditModal && selectedRoom && (
        <EditRoomModal
          room={selectedRoom}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedRoom(null);
            fetchRooms();
          }}
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

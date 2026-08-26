// src/components/RoomModal.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getImageUrl } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "./ConfirmModal";
import EditRoomModal from "./EditRoomModal";
import ListingMap from "./ListingMap";
import {
  CATEGORY_OPTIONS,
  FURNISHED_OPTIONS,
  BATHROOM_OPTIONS,
} from "./RoomFormControls";

export default function RoomModal({ room, onClose, onUpdated, onSelectRoom }) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // The `room` prop is whatever the parent had cached when the list was
  // last fetched — it can be stale (e.g. a visit got confirmed after
  // that fetch). This re-fetches the single listing fresh every time the
  // modal opens, so phone_number/has_confirmed_visit reflect right now,
  // not whenever Home.js last loaded the list.
  const [liveRoom, setLiveRoom] = useState(null);
  const effectiveRoom = liveRoom || room;

  const [activeImage, setActiveImage] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitMessage, setVisitMessage] = useState("");
  const [visitStatus, setVisitStatus] = useState(null); // null | "loading" | "success" | "already" | "error"
  const [visitError, setVisitError] = useState("");
  const [similarRooms, setSimilarRooms] = useState([]);

  // Visits can only be scheduled from today up to a week ahead
  const today = new Date().toISOString().split("T")[0];
  const maxVisitDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

 useEffect(() => {
  setActiveImage(0);
  setVisitDate("");
  setVisitTime("");
  setVisitMessage("");
  setVisitStatus(null);
  setVisitError("");
  setSimilarRooms([]);
  setLiked(!!room?.is_liked);
  setLiveRoom(null);

  if (!room?.id) return;

  axios
    .get(`/api/listings/${room.id}/`)
    .then((res) => {
      setLiveRoom(res.data);
      setLiked(!!res.data.is_liked);
      if (res.data.own_visit_status) {
        setVisitStatus("already");
      }
    })
    .catch(() => {
      // fall back to the (possibly stale) prop silently — better than
      // showing nothing
    });
}, [room?.id, room?.is_liked]);

  useEffect(() => {
    if (visitStatus !== "success") return;
    axios
      .get(`/api/listings/${room.id}/similar/?limit=4`)
      .then((res) => setSimilarRooms(res.data))
      .catch(() => setSimilarRooms([]));
  }, [visitStatus, room?.id]);

  if (!room) return null;

  const isOwner =
    user?.username && effectiveRoom.owner_username === user.username;
  const images = effectiveRoom.images?.length
    ? effectiveRoom.images.map((i) => i.image)
    : effectiveRoom.image
      ? [effectiveRoom.image]
      : [];

  const categoryOpt = CATEGORY_OPTIONS.find(
    (c) => c.value === effectiveRoom.category,
  );
  const furnishedOpt = FURNISHED_OPTIONS.find(
    (f) => f.value === effectiveRoom.furnished,
  );
  const bathroomOpt = BATHROOM_OPTIONS.find(
    (b) => b.value === effectiveRoom.bathroom,
  );

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (likeLoading) return;
    setLikeLoading(true);
    const next = !liked;
    setLiked(next);
    try {
      const res = await axios.post(`/api/listings/${effectiveRoom.id}/like/`);
      setLiked(res.data.liked);
    } catch {
      setLiked(!next);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleScheduleVisit = async () => {
    if (!visitDate || !visitTime) {
      setVisitStatus("error");
      setVisitError("Please choose a preferred date and time.");
      return;
    }
    setVisitStatus("loading");
    setVisitError("");
    try {
      await axios.post("/api/visits/", {
        listing: effectiveRoom.id,
        visit_date: visitDate,
        visit_time: visitTime,
        message: visitMessage,
      });
      setVisitStatus("success");
    } catch (err) {
      const data = err.response?.data || {};
      const detail =
        data.non_field_errors?.[0] ||
        data.detail ||
        Object.values(data)[0]?.[0] ||
        "Could not send visit request.";
      if (
        String(detail).toLowerCase().includes("unique") ||
        String(detail).toLowerCase().includes("already")
      ) {
        setVisitStatus("already");
      } else {
        setVisitStatus("error");
        setVisitError(detail);
      }
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/listings/${effectiveRoom.id}/`);
      setShowDeleteConfirm(false);
      onClose();
      onUpdated?.();
    } catch {
      alert("Could not delete this listing. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gallery */}
        <div className="relative h-56 bg-surface">
          {images.length > 0 ? (
            <img
              src={getImageUrl(images[activeImage])}
              alt={effectiveRoom.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl opacity-20">
              🏠
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-black/60 text-white
                       rounded-full flex items-center justify-center transition"
          >
            ✕
          </button>

          {!isOwner && (
            <button
              onClick={handleToggleLike}
              className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/95 border border-border
                         flex items-center justify-center transition hover:scale-110 active:scale-95"
            >
              <span
                className={liked ? "text-red-500" : "text-muted"}
                style={{ fontSize: "16px" }}
              >
                {liked ? "♥" : "♡"}
              </span>
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-2 h-2 rounded-full transition ${i === activeImage ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-4">
          {/* Title + price */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-primary">
                {effectiveRoom.title}
              </h2>
              <p className="text-sm text-muted mt-0.5">
                📍 {effectiveRoom.location}
              </p>
            </div>
            <p className="text-lg font-bold text-accent whitespace-nowrap">
              Rs {Number(effectiveRoom.price).toLocaleString()}
              <span className="text-xs text-muted font-normal">/mo</span>
            </p>
          </div>

          {/* Detail chips */}
          <div className="flex flex-wrap gap-2">
            {categoryOpt && (
              <span className="text-xs font-medium bg-surface border border-border rounded-lg px-2.5 py-1 text-primary">
                {categoryOpt.icon} {categoryOpt.label}
              </span>
            )}
            {furnishedOpt && (
              <span className="text-xs font-medium bg-surface border border-border rounded-lg px-2.5 py-1 text-primary">
                {furnishedOpt.icon} {furnishedOpt.label}
              </span>
            )}
            {bathroomOpt && (
              <span className="text-xs font-medium bg-surface border border-border rounded-lg px-2.5 py-1 text-primary">
                {bathroomOpt.icon} {bathroomOpt.label} bathroom
              </span>
            )}
            {effectiveRoom.parking && effectiveRoom.parking !== "no" && (
              <span className="text-xs font-medium bg-surface border border-border rounded-lg px-2.5 py-1 text-primary">
                🅿️ Parking
                {effectiveRoom.parking === "flexible" ? " (flexible)" : ""}
              </span>
            )}
            {effectiveRoom.internet === "yes" && (
              <span className="text-xs font-medium bg-surface border border-border rounded-lg px-2.5 py-1 text-primary">
                📶 Internet included
              </span>
            )}
            {effectiveRoom.bills_included && (
              <span className="text-xs font-medium bg-surface border border-border rounded-lg px-2.5 py-1 text-primary">
                💡 Bills included
              </span>
            )}
          </div>

          {/* Description */}
          {effectiveRoom.description && (
            <p className="text-sm text-muted leading-relaxed">
              {effectiveRoom.description}
            </p>
          )}

          {/* Location map — unlocked once has_confirmed_visit is true (owner always, or seeker with a CONFIRMED visit) */}
          {effectiveRoom.latitude && effectiveRoom.longitude && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-2">
                Location
              </h4>
              <ListingMap
                latitude={effectiveRoom.latitude}
                longitude={effectiveRoom.longitude}
                title={effectiveRoom.title}
                locked={!effectiveRoom.has_confirmed_visit}
              />
            </div>
          )}

          {/* Listed by */}
          <div className="flex items-center gap-2 text-sm text-muted border-t border-border pt-4">
            <span className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center text-xs font-bold text-accent">
              {effectiveRoom.owner_username?.[0]?.toUpperCase()}
            </span>
            Listed by{" "}
            <span className="font-medium text-primary">
              {effectiveRoom.owner_username}
            </span>
          </div>

          {/* Phone — masked until confirmed */}
          {!isOwner && (
            <div className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center shrink-0 text-lg">
                📞
              </div>
              <div>
                <p className="text-xs text-muted">Contact number</p>
                <p className="text-sm font-semibold text-primary">
                  {effectiveRoom.phone_number
                    ? effectiveRoom.phone_number
                    : "•••  •••  ••••"}
                </p>
                {!effectiveRoom.phone_number && (
                  <p className="text-[11px] text-muted mt-0.5">
                    Unlocked once the owner confirms your visit
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="flex gap-2 border-t border-border pt-4">
              <button
                onClick={() => setShowEdit(true)}
                className="flex-1 text-sm font-medium text-primary bg-surface hover:bg-border/50
                           rounded-xl py-2.5 transition"
              >
                ✏️ Edit listing
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100
                           rounded-xl py-2.5 transition"
              >
                🗑️ Delete
              </button>
            </div>
          )}

          {/* Schedule a visit — seekers only */}
          {!isOwner && (
            <div className="border-t border-border pt-4 space-y-3">
              {effectiveRoom.is_booked ? (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center font-medium">
                  🔒 This room is no longer available
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted">
                    Log in to schedule a visit to this room.
                  </p>
                  <button
                    onClick={() => navigate("/login")}
                    className="w-full bg-accent hover:bg-accent-hover text-white font-semibold
                               rounded-xl py-3 text-sm transition-all duration-200 shadow-sm"
                  >
                    Log in to schedule a visit
                  </button>
                </div>
              ) : visitStatus === "success" ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center">
                    <p className="text-2xl mb-1">🎉</p>
                    <p className="text-sm font-semibold text-green-700">
                      Visit request sent!
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      The owner will review and confirm shortly.
                    </p>
                  </div>

                  {similarRooms.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-2">
                        You might also like
                      </h4>
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {similarRooms.map((r) => (
                          <button
                            key={r.id}
                            onClick={() => onSelectRoom?.(r)}
                            className="shrink-0 w-36 text-left bg-surface border border-border rounded-xl overflow-hidden
                                       hover:border-accent transition"
                          >
                            <div className="h-20 bg-card">
                              {r.images?.[0]?.image || r.image ? (
                                <img
                                  src={getImageUrl(
                                    r.images?.[0]?.image || r.image,
                                  )}
                                  alt={r.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">
                                  🏠
                                </div>
                              )}
                            </div>
                            <div className="p-2">
                              <p className="text-xs font-semibold text-primary truncate">
                                {r.title}
                              </p>
                              <p className="text-xs text-accent font-medium">
                                Rs {Number(r.price).toLocaleString()}/mo
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : visitStatus === "already" ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 text-center">
                  ⚠️ You already have a visit request for this room.
                </div>
              ) : effectiveRoom.has_active_visit ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700 text-center">
                  📅 This room already has a scheduled visit. Check back
                  once it's resolved.
                </div>
              ) : (
                <>
                  {visitStatus === "error" && (
                    <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                      {visitError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                        Preferred date{" "}
                        <span className="normal-case text-[10px] font-normal text-muted/70">
                          (within a week)
                        </span>
                      </label>
                      <input
                        type="date"
                        value={visitDate}
                        min={today}
                        max={maxVisitDate}
                        onChange={(e) => setVisitDate(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface
                                   focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
                        Preferred time
                      </label>
                      <input
                        type="time"
                        value={visitTime}
                        onChange={(e) => setVisitTime(e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-surface
                                   focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                      />
                    </div>
                  </div>
                  <textarea
                    value={visitMessage}
                    onChange={(e) => setVisitMessage(e.target.value)}
                    placeholder="Message to owner (e.g. questions about the room)…"
                    rows={2}
                    className="w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface
                               focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition
                               resize-none placeholder:text-muted/60"
                  />
                  <button
                    onClick={handleScheduleVisit}
                    disabled={visitStatus === "loading"}
                    className="w-full bg-accent hover:bg-accent-hover disabled:bg-border text-white
                               font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-sm"
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

      {showEdit && (
        <EditRoomModal
          room={effectiveRoom}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false);
            onUpdated?.();
            onClose();
          }}
        />
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete this listing?"
        message={`Delete "${effectiveRoom.title}"? This can't be undone, and any visit request history for it will be lost.`}
        confirmText="Yes, Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        loading={deleting}
      />
    </div>
  );
}
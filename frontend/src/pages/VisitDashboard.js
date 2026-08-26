// src/pages/VisitsDashboard.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getImageUrl } from "../utils/imageUrl";
import ConfirmModal from "../components/ConfirmModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVisitDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return "";
  const dt = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(dt.getTime())) return `${dateStr} ${timeStr}`;
  const date = dt.toLocaleDateString("en-NP", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = dt.toLocaleTimeString("en-NP", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

function StatusBadge({ status }) {
  const styles = {
    PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
    CONFIRMED: "bg-green-100 text-green-700  border-green-200",
    DECLINED: "bg-red-100   text-red-700    border-red-200",
    CANCELLED: "bg-gray-100  text-gray-500   border-gray-200",
  };
  const labels = {
    PENDING: "⏳ Pending",
    CONFIRMED: "🎉 Confirmed",
    DECLINED: "❌ Declined",
    CANCELLED: "🚫 Cancelled",
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${styles[status] || "bg-gray-100 text-gray-500"}`}
    >
      {labels[status] || status}
    </span>
  );
}

// ─── Single visit card ─────────────────────────────────────────────────────────
function VisitCard({
  visit,
  viewAs,
  onCancel,
  onConfirm,
  onDecline,
  actionLoading,
}) {
  const isSeeker = viewAs === "seeker";
  const isLoading = actionLoading === visit.id;
  const isClosed = ["DECLINED", "CANCELLED"].includes(visit.status);

  // Seekers can cancel a PENDING or CONFIRMED visit; owners can cancel
  // (withdraw) any non-closed visit too.
  const canCancel = !isClosed;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-surface border border-border">
          {visit.listing_image ? (
            <img
              src={getImageUrl(visit.listing_image)}
              alt={visit.listing_title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
              🏠
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-primary truncate text-sm">
              {visit.listing_title}
            </h3>
            <StatusBadge status={visit.status} />
          </div>
          <p className="text-xs text-muted mt-0.5">
            📍 {visit.listing_location}
          </p>
          <p className="text-sm font-semibold text-accent mt-1">
            Rs {Number(visit.listing_price).toLocaleString()}/mo
          </p>
          <p className="text-xs text-primary font-medium mt-1.5">
            📅 {formatVisitDateTime(visit.visit_date, visit.visit_time)}
          </p>
          {!isSeeker && (
            <p className="text-xs text-muted mt-1">
              From{" "}
              <span className="font-medium text-primary">
                {visit.seeker_username}
              </span>
            </p>
          )}
          {visit.message && (
            <p className="text-xs text-muted mt-1 italic">"{visit.message}"</p>
          )}
          {visit.owner_note && (
            <p className="text-xs text-muted mt-1">
              <span className="font-medium text-primary">Owner note:</span>{" "}
              {visit.owner_note}
            </p>
          )}

          {isSeeker && visit.status === "CONFIRMED" && (
            <p className="text-xs text-green-600 mt-1.5 font-medium">
              🎉 Confirmed — the owner's contact details are now visible below.
            </p>
          )}
          {isSeeker && visit.status === "CONFIRMED" && visit.listing_phone && (
            <p className="text-xs text-muted mt-1">
              ☎️{" "}
              <span className="font-medium text-primary">
                {visit.listing_phone}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      {!isClosed && (
        <div className="px-4 pb-4 flex gap-2 flex-wrap">
          {/* Owner: Confirm / Decline on PENDING */}
          {!isSeeker && visit.status === "PENDING" && (
            <>
              <button
                onClick={() => onConfirm(visit.id)}
                disabled={isLoading}
                className="flex-1 text-sm font-medium text-green-700 bg-green-50
                           hover:bg-green-100 disabled:opacity-50 rounded-xl py-2.5 transition"
              >
                {isLoading ? "…" : "✅ Confirm"}
              </button>
              <button
                onClick={() => onDecline(visit.id)}
                disabled={isLoading}
                className="flex-1 text-sm font-medium text-red-600 bg-red-50
                           hover:bg-red-100 disabled:opacity-50 rounded-xl py-2.5 transition"
              >
                {isLoading ? "…" : "❌ Decline"}
              </button>
            </>
          )}

          {/* Cancel button — only shown when canCancel is true */}
          {canCancel && (
            <button
              onClick={() => onCancel(visit)}
              disabled={isLoading}
              className="flex-1 text-sm font-medium text-red-500 bg-red-50
                         hover:bg-red-100 disabled:opacity-50 rounded-xl py-2.5
                         transition border border-red-200"
            >
              {isLoading ? "…" : "🚫 Cancel"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function VisitsDashboard() {
  const [tab, setTab] = useState("my");
  const [myVisits, setMyVisits] = useState([]);
  const [ownerVisits, setOwnerVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    visit: null,
    action: null,
    title: "",
    message: "",
    confirmText: "",
    variant: "danger",
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [myRes, ownerRes] = await Promise.all([
        axios.get("/api/visits/my/"),
        axios.get("/api/visits/owner/"),
      ]);
      setMyVisits(myRes.data);
      setOwnerVisits(ownerRes.data);
    } catch {
      setError("Could not load visit requests. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openConfirm = (visit, action) => {
    const configs = {
      cancel_seeker: {
        title: "Cancel Visit?",
        message: `Cancel your visit request for "${visit.listing_title}"? The owner will be notified.`,
        confirmText: "Yes, Cancel",
        variant: "warning",
      },
      cancel_owner: {
        title: "Cancel This Visit?",
        message: `Cancel the visit requested by ${visit.seeker_username} for "${visit.listing_title}"? They will be notified.`,
        confirmText: "Yes, Cancel",
        variant: "warning",
      },
      decline: {
        title: "Decline Visit Request?",
        message: `Decline ${visit.seeker_username}'s visit request for "${visit.listing_title}"?`,
        confirmText: "Yes, Decline",
        variant: "danger",
      },
    };
    setConfirmModal({ open: true, visit, action, ...configs[action] });
  };

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirmModal((p) => ({ ...p, open: false }));
  };

  const handleConfirmed = async () => {
    const { visit, action } = confirmModal;
    setConfirmLoading(true);
    try {
      const apiAction = action === "decline" ? "decline" : "cancel";
      await axios.patch(`/api/visits/${visit.id}/action/`, {
        action: apiAction,
      });
      await fetchAll();
      setConfirmModal((p) => ({ ...p, open: false }));
    } catch (err) {
      alert(err.response?.data?.error || "Action failed. Please try again.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAction = async (visitId, action) => {
    setActionLoading(visitId);
    try {
      await axios.patch(`/api/visits/${visitId}/action/`, { action });
      await fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (visit) => {
    const isSeeker = tab === "my";
    openConfirm(visit, isSeeker ? "cancel_seeker" : "cancel_owner");
  };

  const displayed = tab === "my" ? myVisits : ownerVisits;
  const pendingCount = ownerVisits.filter((v) => v.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary border-b border-primary/20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl">Visits</h1>
            <p className="text-white/50 text-xs mt-0.5">
              Manage your scheduled room visits
            </p>
          </div>
          <a
            href="/"
            className="text-white/60 hover:text-white text-sm px-3 py-2
                       hover:bg-white/10 rounded-xl transition"
          >
            Back to rooms
          </a>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 mb-6 w-fit">
          {[
            {
              key: "my",
              label: "My Visits",
              count: myVisits.length,
              highlight: false,
            },
            {
              key: "owner",
              label: "Incoming Requests",
              count: pendingCount,
              highlight: true,
            },
          ].map(({ key, label, count, highlight }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === key
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-primary"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                    tab === key
                      ? "bg-white/20"
                      : highlight
                        ? "bg-red-100 text-red-600"
                        : "bg-border"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm mb-6">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl border border-border h-28 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">{tab === "my" ? "📅" : "📬"}</p>
            <p className="text-primary font-medium">
              {tab === "my"
                ? "No visit requests yet"
                : "No incoming requests yet"}
            </p>
            <p className="text-muted text-sm mt-1">
              {tab === "my"
                ? "Browse rooms and click 'Schedule a Visit' to get started"
                : "When seekers request a visit to your listings, they'll appear here"}
            </p>
          </div>
        )}

        {!loading && !error && displayed.length > 0 && (
          <div className="space-y-4">
            {displayed.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                viewAs={tab === "my" ? "seeker" : "owner"}
                onCancel={handleCancel}
                onConfirm={(id) => handleAction(id, "confirm")}
                onDecline={(id) =>
                  openConfirm(
                    displayed.find((v) => v.id === id),
                    "decline",
                  )
                }
                actionLoading={actionLoading}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        onConfirm={handleConfirmed}
        onCancel={closeConfirm}
        loading={confirmLoading}
      />
    </div>
  );
}

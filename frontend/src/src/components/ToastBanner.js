// src/components/ToastBanner.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

/**
 * Polls the user's visit requests and shows a dismissible toast banner
 * for every confirmed visit that is still upcoming (visit_date/time in
 * the future), as a friendly reminder.
 */
export default function ToastBanner() {
  const [banners, setBanners] = useState([]); // [{id, title, hours}]
  const [dismissed, setDismissed] = useState({}); // {visitId: true}

  const fetchConfirmed = async () => {
    try {
      const res = await axios.get("/api/visits/my/");
      const now = Date.now();

      const active = res.data
        .filter((v) => v.status === "CONFIRMED")
        .map((v) => {
          const visitAt = new Date(`${v.visit_date}T${v.visit_time}`).getTime();
          const hours = (visitAt - now) / 3600000;
          return { id: v.id, title: v.listing_title, hours };
        })
        .filter((v) => v.hours > 0); // only upcoming visits

      setBanners(active);
    } catch {
      // silently ignore
    }
  };

  useEffect(() => {
    fetchConfirmed();
    const interval = setInterval(fetchConfirmed, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const visible = banners.filter((b) => !dismissed[b.id]);
  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {visible.map((banner) => (
        <div
          key={banner.id}
          className="bg-orange-500 text-white rounded-2xl shadow-xl px-4 py-3
                     flex items-start gap-3 border border-orange-400"
          style={{ animation: "slideInRight 0.3s ease" }}
        >
          {/* Icon */}
          <span className="text-xl shrink-0 mt-0.5">📅</span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">
              Upcoming visit confirmed
            </p>
            <p className="text-orange-100 text-xs mt-0.5 leading-relaxed">
              <span className="font-medium text-white truncate block">
                {banner.title}
              </span>
              Your visit is in{" "}
              <span className="font-bold">
                {banner.hours >= 1
                  ? `${banner.hours.toFixed(1)} hours`
                  : `${Math.round(banner.hours * 60)} minutes`}
              </span>
              .
            </p>
            <Link
              to="/visits"
              className="inline-block mt-1.5 text-xs font-semibold
                         bg-white/20 hover:bg-white/30 text-white
                         px-2.5 py-1 rounded-lg transition"
            >
              View Visit →
            </Link>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setDismissed((p) => ({ ...p, [banner.id]: true }))}
            className="text-orange-200 hover:text-white text-lg leading-none
                       shrink-0 mt-0.5 transition"
          >
            ×
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// src/components/Header.js
import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function Header({ onAddRoom }) {
  const { user, isAuthenticated, isLister, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await axios.get("/api/notifications/");
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.is_read).length);
    } catch {
      // silently ignore
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Pending incoming visit requests — listers only
  useEffect(() => {
    if (!isLister) {
      setPendingCount(0);
      return;
    }
    const fetchPending = async () => {
      try {
        const res = await axios.get("/api/visits/owner/");
        setPendingCount(res.data.filter((v) => v.status === "PENDING").length);
      } catch {}
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [isLister]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleBellClick = async () => {
    setShowNotifs((prev) => !prev);
    if (!showNotifs && unreadCount > 0) {
      try {
        await axios.post("/api/notifications/read/");
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch {}
    }
  };

  const handleClearAll = async () => {
    try {
      await axios.delete("/api/notifications/clear/");
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  };

  const timeAgo = (dateStr) => {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <header className="sticky top-0 z-20 bg-primary border-b border-primary/20 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="text-2xl">🏠</span>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight">
              RoomFinder
            </h1>
            <p className="text-white/40 text-xs">
              Kathmandu's room marketplace
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {isLister && (
            <Link
              to="/my-listings"
              className="text-white/70 hover:text-white text-sm px-3 py-2 hover:bg-white/10 rounded-xl transition hidden sm:block"
            >
              My Listings
            </Link>
          )}

          {isLister && (
            <button
              onClick={onAddRoom}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover
                         text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl shadow-sm
                         transition-all duration-200 active:scale-95"
            >
              <span className="text-base leading-none">+</span>
              <span className="hidden sm:inline">Add Room</span>
            </button>
          )}

          {isAuthenticated ? (
            <>
              <Link
                to="/visits"
                className="relative flex items-center gap-1.5 text-white/70 hover:text-white
                           text-sm px-3 py-2 hover:bg-white/10 rounded-xl transition"
              >
                <span>📋</span>
                <span className="hidden sm:inline">
                  {isLister ? "Visit Requests" : "My Visits"}
                </span>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={bellRef}>
                <button
                  onClick={handleBellClick}
                  className="relative flex items-center justify-center w-9 h-9
                             text-white/70 hover:text-white hover:bg-white/10
                             rounded-xl transition text-lg"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifs && (
                  <div className="absolute right-0 top-12 w-80 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-primary">
                        Notifications
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          className="text-xs text-muted hover:text-red-500 transition"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifs && (
                        <div className="px-4 py-6 text-center text-muted text-sm">
                          Loading…
                        </div>
                      )}
                      {!loadingNotifs && notifications.length === 0 && (
                        <div className="px-4 py-8 text-center">
                          <p className="text-2xl mb-2">🔕</p>
                          <p className="text-muted text-sm">
                            No notifications yet
                          </p>
                        </div>
                      )}
                      {!loadingNotifs &&
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`px-4 py-3 border-b border-border last:border-0 transition ${!notif.is_read ? "bg-accent-light/40" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-primary leading-snug">
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-muted shrink-0 mt-0.5">
                                {timeAgo(notif.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-0.5 leading-relaxed">
                              {notif.body}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {user?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-white/80 text-sm font-medium hidden sm:inline">
                  {user?.username}
                </span>
              </div>

              <button
                onClick={logout}
                className="text-white/50 hover:text-white text-sm px-3 py-2 hover:bg-white/10 rounded-xl transition-all duration-150"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-white/70 hover:text-white text-sm px-3 py-2 hover:bg-white/10 rounded-xl transition"
              >
                Log in
              </Link>
              <Link
                to="/landing"
                className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold
                           px-3 sm:px-4 py-2 rounded-xl shadow-sm transition-all duration-200"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4">
      <span className="text-5xl mb-4">🏠</span>
      <h1 className="text-3xl font-bold text-primary mb-2">RoomFinder</h1>
      <p className="text-muted mb-8 text-center">
        Kathmandu's room marketplace — find your perfect room.
      </p>
      <div className="flex gap-3">
        <Link
          to="/login"
          className="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-xl font-semibold transition"
        >
          Log In
        </Link>
        <Link
          to="/register"
          className="border border-border text-primary px-5 py-2.5 rounded-xl font-semibold hover:bg-card transition"
        >
          Register
        </Link>
      </div>
    </div>
  );
}

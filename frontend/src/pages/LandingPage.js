// src/pages/LandingPage.js
import React from "react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-4 py-12">
      <span className="text-5xl mb-4">🏠</span>
      <h1 className="text-3xl font-bold text-primary mb-2">RoomFinder</h1>
      <p className="text-muted mb-10 text-center max-w-sm">
        Kathmandu's room marketplace — find your perfect room, or list your
        property for renters to discover.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        <Link
          to="/"
          className="group bg-card border border-border rounded-2xl p-6 text-left
                     hover:border-accent hover:shadow-lg transition-all duration-200"
        >
          <span className="text-3xl">🔍</span>
          <h2 className="text-lg font-bold text-primary mt-3 group-hover:text-accent transition">
            Seeking a room
          </h2>
          <p className="text-muted text-sm mt-1.5 leading-relaxed">
            Browse available rooms near you — no account needed to look around.
          </p>
          <span className="inline-block mt-4 text-accent text-sm font-semibold">
            Start browsing →
          </span>
        </Link>

        <Link
          to="/register"
          state={{ role: "lister" }}
          className="group bg-card border border-border rounded-2xl p-6 text-left
                     hover:border-accent hover:shadow-lg transition-all duration-200"
        >
          <span className="text-3xl">🏘️</span>
          <h2 className="text-lg font-bold text-primary mt-3 group-hover:text-accent transition">
            Listing a property
          </h2>
          <p className="text-muted text-sm mt-1.5 leading-relaxed">
            Create a free account to list your room, flat, or house for rent.
          </p>
          <span className="inline-block mt-4 text-accent text-sm font-semibold">
            Get started →
          </span>
        </Link>
      </div>

      <p className="text-muted text-sm mt-8">
        Already have an account?{" "}
        <Link to="/login" className="text-accent font-semibold hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

// src/components/PageSpinner.js
import React from "react";

export default function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin h-10 w-10 border-4 border-accent-light border-t-accent rounded-full" />
        <p className="text-muted text-sm">Loading…</p>
      </div>
    </div>
  );
}

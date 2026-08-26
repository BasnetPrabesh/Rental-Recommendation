// src/components/SkeletonCard.js
import React from "react";

export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-pulse">
      <div className="h-48 bg-border" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-border rounded w-3/4" />
        <div className="h-3 bg-surface rounded w-1/2" />
        <div className="h-5 bg-border rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

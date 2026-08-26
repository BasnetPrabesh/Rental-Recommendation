// src/components/RoomFormControls.js
//
// Shared building blocks + option lists for the room listing forms.
// Both AddRoomWizard.js (create) and EditRoomModal.js (edit) import from
// here so their fields, labels, and styling can never drift apart.
import React from "react";

// ─── Option card (big tappable tile — used for room type) ────────────────────
export function OptionCard({ icon, label, sublabel, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150
                  ${
                    selected
                      ? "border-accent bg-accent-light shadow-sm scale-[1.02]"
                      : "border-border bg-surface hover:border-accent/50 hover:bg-card"
                  }`}
    >
      <span className="text-3xl">{icon}</span>
      <span
        className={`text-sm font-semibold text-center leading-tight ${selected ? "text-accent" : "text-primary"}`}
      >
        {label}
      </span>
      {sublabel && (
        <span className="text-xs text-muted text-center leading-tight">
          {sublabel}
        </span>
      )}
    </button>
  );
}

// ─── Pill selector (small chip group — used for furnished/bathroom/etc.) ─────
export function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all duration-150
                      ${
                        value === opt.value
                          ? "bg-accent text-white border-accent shadow-sm"
                          : "bg-surface text-muted border-border hover:border-accent hover:text-primary"
                      }`}
        >
          {opt.icon && <span className="mr-1.5">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Toggle switch (used for "bills included") ────────────────────────────────
export function ToggleSwitch({ checked, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-all duration-200 relative shrink-0
                    ${checked ? "bg-accent" : "bg-border"}`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
                      ${checked ? "left-5" : "left-1"}`}
        />
      </button>
      <span className="text-sm text-primary">{label}</span>
    </div>
  );
}

// ─── Shared text/textarea/date input class ────────────────────────────────────
export const inputCls =
  "w-full border border-border rounded-xl px-4 py-2.5 text-sm bg-surface " +
  "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition placeholder:text-muted/60";

// ─── Option lists — mirrors the choices defined in items/models.py ───────────

export const ROOM_TYPE_OPTIONS = [
  {
    value: "room_in_house",
    icon: "🏘️",
    label: "Room in existing house",
    sublabel: "Share with others already living there",
  },
  {
    value: "whole_flat",
    icon: "🏠",
    label: "Whole flat/house",
    sublabel: "Entire property to yourself",
  },
  {
    value: "student_hostel",
    icon: "🎓",
    label: "Student hostel",
    sublabel: "For students and young professionals",
  },
  {
    value: "homestay",
    icon: "👨‍👩‍👧",
    label: "Homestay",
    sublabel: "Live with a host family",
  },
];

// Matches Listing.Category choices in items/models.py
export const CATEGORY_OPTIONS = [
  { value: "room", label: "Room", icon: "🚪" },
  { value: "1bk", label: "1BK", icon: "🏢" },
  { value: "1bhk", label: "1BHK", icon: "🏢" },
  { value: "2bhk", label: "2BHK", icon: "🏢" },
  { value: "apartment", label: "Apartment", icon: "🏬" },
  { value: "house", label: "House", icon: "🏡" },
  { value: "flat", label: "Flat", icon: "🏠" },
  { value: "hostel", label: "Hostel", icon: "🎓" },
  { value: "hotel", label: "Hotel", icon: "🏨" },
  { value: "cottage", label: "Cottage", icon: "🛖" },
];

export const FURNISHED_OPTIONS = [
  { value: "furnished", label: "Furnished", icon: "🛋️" },
  { value: "unfurnished", label: "Unfurnished", icon: "📦" },
  { value: "partial", label: "Partial", icon: "🪑" },
];

export const BATHROOM_OPTIONS = [
  { value: "shared", label: "Shared", icon: "🚿" },
  { value: "private", label: "Private", icon: "🔒" },
  { value: "ensuite", label: "Ensuite", icon: "✨" },
];

export const PARKING_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "flexible", label: "Flexible" },
];

export const INTERNET_OPTIONS = [
  { value: "yes", label: "Included" },
  { value: "no", label: "Not included" },
];

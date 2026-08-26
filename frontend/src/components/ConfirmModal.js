// src/components/ConfirmModal.js
import React from "react";

/**
 * A clean, reusable confirmation dialog.
 *
 * Props:
 *   open        — boolean, whether to show
 *   title       — heading text
 *   message     — body text (can be a string or JSX)
 *   confirmText — label for the confirm button (default: "Confirm")
 *   cancelText  — label for the cancel button (default: "Cancel")
 *   variant     — "danger" (red) | "warning" (orange) | "default" (accent)
 *   onConfirm   — called when user clicks confirm
 *   onCancel    — called when user clicks cancel or backdrop
 *   loading     — shows a spinner on the confirm button
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  const confirmStyles = {
    danger: "bg-red-500 hover:bg-red-600 text-white",
    warning: "bg-orange-500 hover:bg-orange-600 text-white",
    default: "bg-accent hover:bg-accent-hover text-white",
  };

  const iconMap = {
    danger: "🗑️",
    warning: "⚠️",
    default: "❓",
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-card rounded-2xl w-full max-w-sm shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn 0.15s ease" }}
      >
        {/* Icon + Title */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="text-4xl mb-3">{iconMap[variant]}</div>
          <h2 className="text-primary font-bold text-lg">{title}</h2>
          {message && (
            <p className="text-muted text-sm mt-2 leading-relaxed">{message}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-border text-primary bg-surface
                       hover:bg-border rounded-xl py-2.5 text-sm font-medium
                       transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold
                        transition disabled:opacity-60 ${confirmStyles[variant]}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                {confirmText}…
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>
  );
}

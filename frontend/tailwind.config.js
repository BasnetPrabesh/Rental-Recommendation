// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Slate / grey minimalist palette ─────────────────────────────
        primary: "#0F172A", // slate-900 — headers, nav, text
        surface: "#F8FAFC", // slate-50  — page background
        card: "#FFFFFF", // white     — cards
        border: "#E2E8F0", // slate-200 — borders
        muted: "#64748B", // slate-500 — secondary text
        accent: "#334155", // slate-700 — buttons, highlights
        "accent-hover": "#1E293B", // slate-800 — hover state
        "accent-light": "#F1F5F9", // slate-100 — badge backgrounds
        "accent-text": "#334155", // slate-700 — text on light bg
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

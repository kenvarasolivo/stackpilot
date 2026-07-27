import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#000000",
        // Neutral greys carry the UI; purple is a spice, not a base.
        card: "#0A0A0B",
        edge: "#1D1D20",
        ink: "#F5F5F7",
        muted: "#8A8A93",
        accent: {
          DEFAULT: "#7C3AED",
          bright: "#A78BFA",
          deep: "#4C1D95",
        },
        // Status only — never decoration.
        ok: "#4ADE80",
        warn: "#FBBF24",
        bad: "#F87171",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,58,237,.45)",
        "glow-soft": "0 0 0 1px rgba(124,58,237,.28)",
      },
    },
  },
  plugins: [],
};

export default config;

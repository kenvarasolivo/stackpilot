import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#000000",
        card: "#0D0D10",
        edge: "#232329",
        ink: "#F2F2F4",
        muted: "#8F8F9B",
        accent: {
          DEFAULT: "#A78BFA",
          bright: "#C4B5FD",
          deep: "#7C3AED",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(167,139,250,.35), 0 0 24px rgba(124,58,237,.18)",
        "glow-soft": "0 0 16px rgba(124,58,237,.16)",
      },
    },
  },
  plugins: [],
};

export default config;

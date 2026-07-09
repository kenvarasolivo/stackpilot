import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0D1117",
        card: "#161B22",
        edge: "#30363D",
        ink: "#E6EDF3",
        muted: "#8B949E",
        neon: "#00FFFF",
        neondim: "#00CCCC",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(0,255,255,.35), 0 0 24px rgba(0,255,255,.12)",
        "neon-soft": "0 0 16px rgba(0,255,255,.10)",
      },
    },
  },
  plugins: [],
};

export default config;

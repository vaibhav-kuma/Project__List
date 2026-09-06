import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#04060b",
          900: "#060a12",
          850: "#0a101c",
          800: "#0d1524",
          700: "#131e33",
        },
        pulse: {
          DEFAULT: "#22d3ee",
          soft: "#67e8f9",
          dim: "#155e75",
        },
        violet: {
          neon: "#a78bfa",
        },
        status: {
          ok: "#34d399",
          warn: "#fbbf24",
          alert: "#fb7185",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)",
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(148,163,184,0.10), 0 12px 40px -12px rgba(2,6,12,0.8)",
        "panel-cyan": "0 0 0 1px rgba(34,211,238,0.22), 0 0 34px -8px rgba(34,211,238,0.28)",
      },
      animation: {
        "pulse-soft": "pulseSoft 3.2s ease-in-out infinite",
        "scan-line": "scanLine 7s linear infinite",
        blink: "blink 1.1s steps(2, start) infinite",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
        scanLine: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(420%)" },
        },
        blink: { "50%": { opacity: "0" } },
      },
    },
  },
  plugins: [],
};

export default config;

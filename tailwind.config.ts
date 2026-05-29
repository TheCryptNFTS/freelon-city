import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        // "bg-lifted" has no matching :root token; closest is --surface (#141417).
        // Mapped to --surface so the lifted-card utility tracks the token system.
        "bg-lifted": "var(--surface)",
        ink: "var(--ink)",
        "ink-dim": "var(--ink-dim)",
        gold: "var(--gold)",
        "gold-bright": "var(--gold-bright)",
      },
      fontFamily: {
        sans: ['"Satoshi"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        grotesk: ['"Cabinet Grotesk"', '"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        display: ['"Tanker"', '"Cabinet Grotesk"', "Impact", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", '"SF Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

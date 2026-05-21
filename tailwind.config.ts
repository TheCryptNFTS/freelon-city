import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0c12",
        "bg-lifted": "#131316",
        ink: "#e6e1d2",
        "ink-dim": "#888888",
        gold: "#c8aa64",
        "gold-bright": "#e6c47a",
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

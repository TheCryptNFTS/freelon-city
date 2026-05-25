import type { Metadata } from "next";
import { FlexClient } from "./FlexClient";

export const metadata: Metadata = {
  title: "THE FLEX MACHINE",
  description: "You got in early. Prove it.",
  openGraph: {
    title: "THE FLEX MACHINE",
    description: "You got in early. Prove it.",
  },
};

export default function FlexPage() {
  return (
    <div className="machine-page">
      <span className="kicker">⬡ EARLY-CARRIER PROTOCOL</span>
      <h1>THE FLEX<br />MACHINE</h1>
      <p style={{ marginTop: 16, color: "var(--ink-2)", maxWidth: 540 }}>
        For citizens of FREELON CITY. Connect your wallet. The machine builds
        you a shareable card that proves you were here first.
      </p>
      <FlexClient />

      <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--line)" }}>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-2)", marginBottom: 10 }}>
          NEXT SIGNAL
        </div>
        <a className="btn" href="/leaderboard">
          <span className="ttl">VIEW THE LEADERBOARD →</span>
        </a>
      </div>
    </div>
  );
}

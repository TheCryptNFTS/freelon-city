import type { Metadata } from "next";
import { RegretForm } from "./RegretForm";

export const metadata: Metadata = {
  title: "THE REGRET MACHINE",
  description: "You sold a FREELON. Find out how much you regret it.",
  openGraph: {
    title: "THE REGRET MACHINE",
    description: "You sold a FREELON. Find out how much you regret it.",
  },
};

export default function RegretPage() {
  return (
    <div className="machine-page">
      <span className="kicker" style={{ color: "#c54a3a" }}>⬡ EXIT WOUND PROTOCOL</span>
      <h1>THE REGRET<br />MACHINE</h1>
      <p style={{ marginTop: 16, color: "var(--ink-2)", maxWidth: 540 }}>
        You sold a FREELON. Find out how much you regret it. Enter the token id
        and the price you sold for. The machine computes what the city did next.
      </p>
      <RegretForm />

      <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid var(--line)" }}>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", color: "var(--ink-2)", marginBottom: 10 }}>
          NEXT SIGNAL
        </div>
        <a className="btn" href="/graveyard">
          <span className="ttl">VIEW THE GRAVEYARD →</span>
        </a>
      </div>
    </div>
  );
}

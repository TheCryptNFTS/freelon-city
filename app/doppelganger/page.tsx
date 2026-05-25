import type { Metadata } from "next";
import { DoppelClient } from "./DoppelClient";

export const metadata: Metadata = {
  title: "DOPPELGANGER · Find your signal match",
  description: "Drop your handle. The machine finds the citizen of FREELON CITY who looks back at you.",
  openGraph: {
    title: "DOPPELGANGER",
    description: "Drop your handle. The machine finds the citizen of FREELON CITY who looks back at you.",
  },
};

export default function DoppelPage() {
  return (
    <main className="machine-page">
      <span className="kicker">⬡ SIGNAL MATCH PROTOCOL</span>
      <h1>DOPPEL-<br />GANGER</h1>
      <p style={{ marginTop: 16, color: "var(--ink-2)", maxWidth: 540 }}>
        Drop your handle. The city hashes it once and returns the citizen who
        shares your signal. Same handle, same citizen, every time. No re-rolls.
      </p>
      <DoppelClient />
    </main>
  );
}

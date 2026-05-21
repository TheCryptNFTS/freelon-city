"use client";
import { useEffect, useState } from "react";
import { loadSecrets, SecretsState, totalDiscovered } from "@/lib/secrets-store";

const HINTS: { n: number; hint: string }[] = [
  { n: 1, hint: "Type the right four digits anywhere. The city's first error code." },
  { n: 2, hint: "Visit all ten doctrines. The badge knows." },
  { n: 3, hint: "Be here at the moment the daily signal flips. UTC." },
  { n: 4, hint: "A page that 404s. Until it doesn't." },
  { n: 5, hint: "Hold the honoree. Hear their private channel." },
];

export function SecretsClient() {
  const [s, setS] = useState<SecretsState | null>(null);
  useEffect(() => { setS(loadSecrets()); }, []);

  // Server-side hex-hunter quest progress — fire one step per discovered secret.
  // The API is session-deduped client-side via sessionStorage in the helper.
  useEffect(() => {
    if (!s) return;
    let key: string | null = null;
    try {
      const w = (window as unknown as { ethereum?: { selectedAddress?: string } }).ethereum?.selectedAddress;
      if (w && /^0x[a-fA-F0-9]{40}$/.test(w)) key = w.toLowerCase();
      if (!key) {
        const carrierRaw = localStorage.getItem("freelon::carrier::v1");
        if (carrierRaw) {
          const parsed = JSON.parse(carrierRaw) as { handle?: string };
          if (parsed?.handle) key = parsed.handle.toLowerCase();
        }
      }
    } catch {}
    if (!key) return;

    const fireStep = async (stepId: string) => {
      const dedupe = `freelon::quest::hex-hunter::${stepId}::${key}`;
      if (sessionStorage.getItem(dedupe)) return;
      sessionStorage.setItem(dedupe, "1");
      try {
        const r = await fetch("/api/quests/hex-hunter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, stepId }),
        });
        const j = await r.json();
        if (j.justCompleted && j.rewardHex) {
          window.dispatchEvent(
            new CustomEvent("freelon:quest-complete", {
              detail: { questId: "hex-hunter", reward: j.rewardHex },
            }),
          );
        }
      } catch {}
    };

    if (s.code0404) fireStep("code0404");
    if (s.civsSeen.length >= 10) fireStep("all-civs");
    if (s.ghost404) fireStep("ghost404");
    if (s.fifthBracket) fireStep("fifth-bracket");
    if (s.channels.length > 0) fireStep("channels");
  }, [s]);

  const found = (i: number): boolean => {
    if (!s) return false;
    if (i === 1) return s.code0404;
    if (i === 2) return s.civsSeen.length >= 10;
    if (i === 3) return s.ghost404;
    if (i === 4) return s.fifthBracket;
    if (i === 5) return s.channels.length > 0;
    return false;
  };
  const score = s ? totalDiscovered(s) : 0;

  return (
    <main style={{ minHeight: "70vh", padding: "64px 24px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.3em", color: "var(--gold)" }}>
        ⬡ /SECRETS · {score} / 5
      </div>
      <h1 style={{ marginTop: 14, fontSize: 44, fontWeight: 300 }}>
        Five hidden <em>signals</em>
      </h1>
      <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>
        Hints, not solutions. Find them yourself.
      </p>

      <ol style={{ marginTop: 32, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
        {HINTS.map((h) => {
          const ok = found(h.n);
          return (
            <li
              key={h.n}
              style={{
                padding: "14px 16px",
                border: `1px solid ${ok ? "#c8aa64" : "var(--line)"}`,
                background: ok ? "rgba(200,170,100,0.05)" : "transparent",
                fontFamily: "var(--mono2)",
                fontSize: 13,
                letterSpacing: "0.02em",
                lineHeight: 1.55,
                color: ok ? "var(--ink)" : "var(--ink-2)",
                display: "flex",
                gap: 14,
                alignItems: "baseline",
              }}
            >
              <span style={{ color: ok ? "#c8aa64" : "var(--ink-2)", letterSpacing: "0.2em" }}>
                [{h.n}]
              </span>
              <span style={{ flex: 1 }}>{h.hint}</span>
              <span style={{ color: ok ? "#c8aa64" : "var(--ink-2)", fontSize: 11, letterSpacing: "0.2em" }}>
                {ok ? "⬡ FOUND" : "—"}
              </span>
            </li>
          );
        })}
      </ol>

      <p style={{ marginTop: 32, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-2)" }}>
        DISCOVERIES LIVE IN YOUR BROWSER. CLEARING STORAGE FORGETS THE CITY.
      </p>
    </main>
  );
}

"use client";
/**
 * CanonSecrets — the five hidden signals, folded into /canon#secrets
 * (2026-05-31). Migrated from the /secrets page. Hints, not solutions:
 * no spoilers. Reuses the existing secrets-store + hex-hunter quest
 * wiring so discovered signals still light up and fire quest steps.
 */
import { useEffect, useState } from "react";
import { loadSecrets, SecretsState, totalDiscovered } from "@/lib/secrets-store";
import { getWalletAddress } from "@/lib/get-wallet-address";

const HINTS: { n: number; hint: string }[] = [
  { n: 1, hint: "Type the right four digits anywhere. The city's first error code." },
  { n: 2, hint: "Visit all ten doctrines. The badge knows." },
  { n: 3, hint: "Be here at the moment the daily signal flips. UTC." },
  { n: 4, hint: "A page that 404s. Until it doesn't." },
  { n: 5, hint: "Open a channel. 35 honorees have one — /channel/<their-handle>." },
];

export function CanonSecrets() {
  const [s, setS] = useState<SecretsState | null>(null);
  useEffect(() => { setS(loadSecrets()); }, []);

  // Server-side hex-hunter quest progress — fire one step per discovered
  // secret. Session-deduped via sessionStorage.
  useEffect(() => {
    if (!s) return;
    (async () => {
      let key: string | null = null;
      try {
        const w = await getWalletAddress();
        if (w) key = w;
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
    })();
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
    <div style={{ marginTop: "var(--s-3)", paddingTop: "var(--s-3)", borderTop: "1px dashed var(--line)" }}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.3em", color: "var(--gold)", marginBottom: 12 }}>
        ⬡ FIVE HIDDEN SIGNALS · {score} / 5 · HINTS, NOT SOLUTIONS
      </div>

      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
        {HINTS.map((h) => {
          const ok = found(h.n);
          return (
            <li
              key={h.n}
              style={{
                padding: "12px 14px",
                border: `1px solid ${ok ? "var(--gold)" : "var(--line)"}`,
                background: ok ? "rgba(200,170,100,0.05)" : "transparent",
                borderRadius: 8,
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
              <span style={{ color: ok ? "var(--gold)" : "var(--ink-dim)", letterSpacing: "0.2em" }}>
                [{h.n}]
              </span>
              <span style={{ flex: 1 }}>{h.hint}</span>
              <span style={{ color: ok ? "var(--gold)" : "var(--ink-dim)", fontSize: 11, letterSpacing: "0.2em" }}>
                {ok ? "⬡ FOUND" : "—"}
              </span>
            </li>
          );
        })}
      </ol>

      <p style={{ marginTop: 16, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)" }}>
        DISCOVERIES LIVE IN YOUR BROWSER. CLEARING STORAGE FORGETS THE CITY.
      </p>
    </div>
  );
}

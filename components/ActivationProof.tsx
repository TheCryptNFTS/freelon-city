"use client";
import { useEffect, useState } from "react";

/**
 * ACTIVATION PROOF — the see→own bridge. Surfaces the real, paid activations
 * (strangers who unlocked their agent's AI) as social proof on the home hero +
 * citizen page. Self-hides until at least one activation exists, so it never
 * shows an empty/embarrassing state. Copy-safe: no ETH amounts, no wallets — a
 * count + the most-recent token IDs only.
 */
type Activation = { tokenId: number; unlockedAt: number };

function ago(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 90) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ActivationProof({ compact = false }: { compact?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  const [recent, setRecent] = useState<Activation[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/activations", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (typeof d.count === "number") setCount(d.count);
        if (Array.isArray(d.recent)) setRecent(d.recent);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Self-hide until there's real proof to show.
  if (!count || count < 1) return null;

  const latest = recent[0];
  const plural = count === 1 ? "citizen" : "citizens";

  return (
    <div className={`activation-proof${compact ? " activation-proof--compact" : ""}`}>
      <span className="activation-proof__dot" aria-hidden />
      <span className="activation-proof__count">
        {count.toLocaleString()} {plural} awakened
      </span>
      {latest && (
        <span className="activation-proof__latest">
          · latest #{latest.tokenId.toString().padStart(4, "0")} {ago(latest.unlockedAt)}
        </span>
      )}
      <style>{`
        .activation-proof {
          display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
          padding: 7px 14px; border: 1px solid var(--line-2); border-radius: var(--r-pill);
          background: rgba(255,255,255,0.02);
          font-family: var(--mono2); font-size: 12px; letter-spacing: 0.04em;
          color: var(--ink-2);
        }
        .activation-proof--compact { padding: 5px 11px; font-size: 11px; }
        .activation-proof__dot {
          width: 7px; height: 7px; border-radius: 999px; background: var(--state-active);
          box-shadow: 0 0 8px rgba(233,201,132,0.7);
          animation: apPulse 2s ease-in-out infinite;
        }
        .activation-proof__count { color: var(--ink); font-weight: 600; }
        .activation-proof__latest { color: var(--ink-dim); }
        @keyframes apPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (prefers-reduced-motion: reduce) { .activation-proof__dot { animation: none; } }
      `}</style>
    </div>
  );
}

"use client";
/**
 * AwakenBadge — a small status pill rendered near the citizen's name/header.
 *
 * Reads GET /api/agent/awaken/status?tokenId= and shows:
 *   - awakened → "⬡ AWAKENED · <Tier>" (gold pill)
 *   - dormant  → a subtle "⬡ DORMANT" marker
 *
 * Public (not owner-gated) — anyone viewing the citizen sees its awaken state.
 * No emojis (⬡ glyph only). Fails quiet: renders nothing until status loads.
 */
import { useEffect, useState } from "react";

type Status = { awakened: boolean; awakenTier?: string | null };

function pretty(key: string | null | undefined): string {
  if (!key) return "";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function AwakenBadge({ citizenId }: { citizenId: number }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/agent/awaken/status?tokenId=${citizenId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setStatus(d as Status);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [citizenId]);

  if (!status) return null;

  if (status.awakened) {
    const label = pretty(status.awakenTier);
    return (
      <span className="realigned-badge" style={{ margin: "var(--s-2) 0 0" }}>
        ⬡ AWAKENED{label ? ` · ${label.toUpperCase()}` : ""}
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-block",
        margin: "var(--s-2) 0 0",
        fontFamily: "var(--mono2)",
        fontSize: 10,
        letterSpacing: "0.22em",
        color: "var(--ink-dim)",
      }}
    >
      ⬡ DORMANT
    </span>
  );
}

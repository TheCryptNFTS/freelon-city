"use client";
import { useEffect, useState } from "react";

type Props = {
  tokenId: number;
};

/**
 * Watchlist toggle. Reads viewer wallet from a `freelon_addr` cookie if set
 * (we don't have a connect flow in scope here; user can paste address via
 * /wallet/[addr] for now and the cookie gets set there). Falls back to a
 * "connect wallet first" CTA.
 */
export function WatchlistButton({ tokenId }: Props) {
  const [addr, setAddr] = useState<string | null>(null);
  const [watching, setWatching] = useState<boolean | null>(null);
  const [cost, setCost] = useState<number>(50);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read viewer addr from cookie (set elsewhere when user visits their wallet)
  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
    if (m) setAddr(decodeURIComponent(m[1]));
  }, []);

  useEffect(() => {
    if (!addr) return;
    let cancelled = false;
    fetch(`/api/watchlist?addr=${addr}`)
      .then((r) => r.json())
      .then((j: { tokens?: number[]; cost?: number; balance?: number }) => {
        if (cancelled) return;
        setWatching((j.tokens || []).includes(tokenId));
        setCost(j.cost ?? 50);
        setBalance(j.balance ?? 0);
      })
      .catch(() => { if (!cancelled) setError("network"); });
    return () => { cancelled = true; };
  }, [addr, tokenId]);

  async function toggle() {
    if (!addr || watching === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          addr,
          tokenId,
          action: watching ? "remove" : "add",
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "failed");
        return;
      }
      setWatching(!watching);
      if (j.burned) setBalance((b) => (b !== null ? b - j.burned : null));
    } catch {
      setError("network");
    } finally {
      setBusy(false);
    }
  }

  if (!addr) {
    return (
      <div style={{ padding: "12px 14px", border: "1px dashed var(--line-2)", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", letterSpacing: "0.18em" }}>
          ⬡ WATCHLIST · Visit your wallet page to enable
        </span>
      </div>
    );
  }

  const insufficient = !watching && balance !== null && balance < cost;
  const color = watching ? "#FF5A4D" : "var(--gold)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={toggle}
        disabled={busy || watching === null || insufficient}
        style={{
          padding: "12px 16px",
          border: `1px solid ${color}`,
          background: `${color}10`,
          color,
          fontFamily: "var(--mono2)",
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 600,
          borderRadius: 8,
          cursor: busy || insufficient ? "default" : "pointer",
          opacity: busy || insufficient ? 0.5 : 1,
        }}
      >
        {busy
          ? "..."
          : watching
            ? "🔴 WATCHING · remove"
            : insufficient
              ? `⬡ Need ${cost} hex`
              : `⬡ Watch this citizen · ${cost} hex`}
      </button>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em", lineHeight: 1.5, margin: 0 }}>
        Watchers get a 24h private snipe window if this citizen flags as a Red Signal — before the public feed sees it.
      </p>
      {error && (
        <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "#FF5A4D" }}>{error}</p>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";

/**
 * Persistent hex balance pill shown in the header when a wallet is connected.
 * Pulls /api/wallet/[address]/hex, updates on connect + on the freelon:hex-refresh
 * custom event (fired by TitheForm + future spend actions).
 */
export function HeaderHexPill() {
  const holder = useHolder();
  const [hex, setHex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!holder.address) {
        setHex(null);
        return;
      }
      try {
        const r = await fetch(`/api/wallet/${holder.address}/hex`);
        if (!r.ok) return;
        const j = (await r.json()) as { balance?: number };
        if (!cancelled) setHex(j.balance ?? 0);
      } catch {
        /* ignore */
      }
    }
    void load();
    function refresh() { void load(); }
    window.addEventListener("freelon:hex-refresh", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("freelon:hex-refresh", refresh);
    };
  }, [holder.address]);

  if (!holder.address || hex === null) return null;

  return (
    <Link
      href={`/wallet/${holder.address}`}
      className="header-hex-pill"
      title="Wallet hex balance"
    >
      <span className="hp-icon">⬡</span>
      <span className="hp-balance">{hex.toLocaleString()}</span>
    </Link>
  );
}

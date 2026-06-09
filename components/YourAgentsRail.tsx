"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { FramedAgent } from "@/components/FramedAgent";
import { imageUrl } from "@/lib/constants";

/**
 * Connected-holder home — replaces the "tiny strip" a holder used to get on the
 * homepage with a real "YOUR AGENTS" rail: their own citizen art (framed) linking
 * straight into each agent, plus "See all → /wallet". Renders nothing for
 * non-holders (the newcomer hero shows instead). Wallet-aware, so client-only.
 */
export function YourAgentsRail({ hrefBase = "/citizens/", heading = "Your Agents" }: { hrefBase?: string; heading?: string } = {}) {
  const { isHolder, address, balance } = useHolder();
  const [ids, setIds] = useState<number[] | null>(null);

  useEffect(() => {
    if (!isHolder || !address) { setIds(null); return; }
    let cancelled = false;
    fetch(`/api/wallet/${address}/tokens`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j && Array.isArray(j.tokenIds)) setIds(j.tokenIds.slice(0, 6));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isHolder, address]);

  if (!isHolder || !address) return null;
  const count = balance ?? 0;

  return (
    <section
      style={{
        margin: "0 auto var(--s-4)",
        maxWidth: 760,
        padding: "16px 18px",
        borderRadius: 16,
        border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
        background: "linear-gradient(160deg, color-mix(in srgb, var(--gold) 7%, transparent), rgba(10,10,14,0.5))",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 700 }}>
          ⬡ {heading} · {count.toLocaleString()} held
        </span>
        <Link href={`/wallet/${address}`} style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-2)", textDecoration: "none" }}>
          See all →
        </Link>
      </div>

      {ids && ids.length > 0 ? (
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
          {ids.map((id) => (
            <Link key={id} href={`${hrefBase}${id}`} style={{ textDecoration: "none", color: "inherit" }} aria-label={`Open citizen #${id}`}>
              <FramedAgent
                art={imageUrl(id)}
                civColor="var(--gold)"
                size={92}
                alt={`Citizen #${id}`}
                stamp={`#${String(id).padStart(4, "0")}`}
              />
            </Link>
          ))}
        </div>
      ) : (
        <Link href={`/wallet/${address}`} style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink)", textDecoration: "none" }}>
          Open your agents →
        </Link>
      )}
    </section>
  );
}

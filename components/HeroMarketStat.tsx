"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ECONOMY } from "@/lib/economy-constants";

/**
 * <HeroMarketStat /> — quiet two-part market/holder line under the hero CTAs.
 *
 * Collector pass ("lean in"):
 *  - Collector cue: live floor + sealed supply + OpenSea link (entry cost).
 *  - Holder cue: "claim N ⬡ daily — free" → /sync (the no-cost on-ramp the
 *    founder approved for the hero). Kept premium: mono (data font), gold
 *    values, one tight row that wraps on mobile.
 *
 * Floor fetches CLIENT-SIDE on purpose — a server-side fetch is what blocked
 * the hero LCP (fixed 81081dc); this must never re-enter the critical path.
 */
export function HeroMarketStat() {
  const [floor, setFloor] = useState<number | null>(null);

  useEffect(() => {
    let on = true;
    fetch("/api/opensea/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (on && d?.floor != null) setFloor(Number(d.floor));
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="hero-market-row">
      <a
        className="hero-market"
        href="https://opensea.io/collection/freelons"
        target="_blank"
        rel="noreferrer"
      >
        <span className="hero-market__k">⬡ Floor</span>
        <span className="hero-market__v">{floor != null ? `${floor.toFixed(4)} Ξ` : "—"}</span>
        <span className="hero-market__sep">·</span>
        <span className="hero-market__k">4040 sealed</span>
        <span className="hero-market__cta">OpenSea →</span>
      </a>
      <Link className="hero-market hero-market--claim" href="/sync">
        <span className="hero-market__k">⬡ Claim {ECONOMY.DAILY_CLAIM} ⬡ daily</span>
        <span className="hero-market__cta">free →</span>
      </Link>
    </div>
  );
}

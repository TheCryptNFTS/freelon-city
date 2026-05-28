"use client";
import { useEffect, useState } from "react";

/**
 * <HeroMarketStat /> — quiet live market line under the hero CTAs.
 *
 * 2026-05-28 collector pass: the collector red-team (6/10) flagged that a
 * buyer can't see entry cost (floor) without leaving the homepage. This
 * surfaces it — but premium, not degen: one mono line (mono = the data
 * font), gold floor value, teal OpenSea link. Scarcity ("4040 SEALED")
 * sits beside the floor so the framing stays "rare collection," not
 * "check the chart."
 *
 * Fetches CLIENT-SIDE (after paint) on purpose — a server-side floor
 * fetch is exactly what blocked the hero LCP (fixed in 81081dc); this
 * must never re-enter the critical render path.
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
      <span className="hero-market__cta">On OpenSea →</span>
    </a>
  );
}

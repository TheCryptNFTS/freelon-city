"use client";
import { useEffect, useState } from "react";

export function LiveStats() {
  const [stats, setStats] = useState<{ floor: number | null; holders: number | null } | null>(null);
  useEffect(() => {
    fetch("/api/opensea/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);
  // Show "SYNCING" while loading instead of bare dashes — premium feel
  const floor = stats === null
    ? "SYNCING"
    : stats?.floor
      ? `${stats.floor.toFixed(4)}`
      : "SYNCING";
  const holders = stats === null
    ? "SYNCING"
    : stats?.holders
      ? stats.holders.toLocaleString()
      : "SYNCING";
  return (
    <div className="hero-coords">
      <span>SIGNAL · <strong style={{ color: "var(--gold)" }}>LIVE</strong> · CYCLE 0404</span>
      <span>FLOOR — <strong style={{ color: "var(--ink)" }}>{floor}</strong> ETH</span>
      <span>HOLDERS — <strong style={{ color: "var(--ink)" }}>{holders}</strong></span>
      <span>MINTED — <strong style={{ color: "var(--ink)" }}>4040 / 4040</strong></span>
    </div>
  );
}

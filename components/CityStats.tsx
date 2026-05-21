"use client";
import { useEffect, useState } from "react";

type Stats = {
  floor: number;
  holders: number;
  volume: number;
  sales?: number;
};

export function CityStats() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/opensea/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setS(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!s) {
    return (
      <div className="city-stats city-stats-loading">
        <span className="kicker">⬡ CITY · LIFETIME STATS</span>
        <span className="cs-empty">SCANNING SIGNAL...</span>
      </div>
    );
  }

  return (
    <div className="city-stats">
      <span className="kicker">⬡ CITY · LIFETIME STATS (OPENSEA)</span>
      <div className="cs-row">
        <div className="cs-cell">
          <span className="cs-label">FLOOR</span>
          <span className="cs-value">{s.floor.toFixed(4)} ETH</span>
        </div>
        <div className="cs-cell">
          <span className="cs-label">HOLDERS</span>
          <span className="cs-value">{s.holders.toLocaleString()}</span>
        </div>
        <div className="cs-cell">
          <span className="cs-label">LIFETIME VOLUME</span>
          <span className="cs-value">{s.volume.toFixed(2)} ETH</span>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type CivRow = { slug: string; name: string; color: string; population: number; floor: number; value: number };

export function CivValueChart() {
  const [data, setData] = useState<{ floor: number; total: number; civs: CivRow[] } | null>(null);
  useEffect(() => {
    fetch("/api/opensea/civ-stats").then(r => r.json()).then(setData).catch(() => {});
  }, []);
  // Defensive: only `data` was guarded, but a 200 with a missing/non-array `civs`
  // (or non-numeric total/floor) would throw and white-screen the dashboard — the
  // lone un-normalized fetch here vs its `?? []` siblings. Normalize before use.
  if (!data || !Array.isArray(data.civs)) return <div className="civ-chart-loading">SCANNING CIV LEDGER...</div>;
  const max = Math.max(0, ...data.civs.map(c => Number(c.value) || 0));
  const sorted = [...data.civs].sort((a, b) => b.value - a.value);

  return (
    <div className="civ-chart">
      <div className="chart-head">
        <span className="kicker">⬡ MARKET CAP AT FLOOR · BY CIVILIZATION</span>
        <span className="chart-total">
          CAP @ FLOOR · {(Number(data.total) || 0).toFixed(2)} ETH · floor {(Number(data.floor) || 0).toFixed(4)}
        </span>
        <span className="chart-disclaimer">
          Hypothetical: if every citizen sold at the current floor. Not lifetime volume.
        </span>
      </div>
      <div className="chart-rows">
        {sorted.map(c => (
          <div key={c.slug} className="chart-row" style={{ "--civ": c.color } as React.CSSProperties}>
            <span className="row-name">{c.name}</span>
            <div className="row-bar-wrap">
              <div className="row-bar" style={{ width: `${max > 0 ? (c.value / max) * 100 : 0}%`, background: c.color }} />
            </div>
            <span className="row-value">{c.value.toFixed(2)} ETH</span>
            <span className="row-pop">{c.population} cit.</span>
          </div>
        ))}
      </div>
    </div>
  );
}

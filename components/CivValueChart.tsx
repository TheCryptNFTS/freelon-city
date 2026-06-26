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
  const max = Math.max(0, ...data.civs.map(c => Number(c.population) || 0));
  const sorted = [...data.civs].sort((a, b) => b.population - a.population);
  const totalPop = data.civs.reduce((a, c) => a + (Number(c.population) || 0), 0);

  return (
    <div className="civ-chart">
      <div className="chart-head">
        <span className="kicker">⬡ CIVILIZATION SIZE · BY POPULATION</span>
        <span className="chart-total">
          {totalPop.toLocaleString()} citizens across {data.civs.length} civilizations
        </span>
        <span className="chart-disclaimer">
          How the collection is split across civilizations. Not a price or valuation.
        </span>
      </div>
      <div className="chart-rows">
        {sorted.map(c => (
          <div key={c.slug} className="chart-row" style={{ "--civ": c.color } as React.CSSProperties}>
            <span className="row-name">{c.name}</span>
            <div className="row-bar-wrap">
              <div className="row-bar" style={{ width: `${max > 0 ? (c.population / max) * 100 : 0}%`, background: c.color }} />
            </div>
            <span className="row-pop">{c.population} cit.</span>
          </div>
        ))}
      </div>
    </div>
  );
}

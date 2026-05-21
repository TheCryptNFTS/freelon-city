"use client";
import { useEffect, useState } from "react";

type CivRow = { slug: string; name: string; color: string; population: number; floor: number; value: number };

export function CivValueChart() {
  const [data, setData] = useState<{ floor: number; total: number; civs: CivRow[] } | null>(null);
  useEffect(() => {
    fetch("/api/opensea/civ-stats").then(r => r.json()).then(setData).catch(() => {});
  }, []);
  if (!data) return <div className="civ-chart-loading">SCANNING CIV LEDGER...</div>;
  const max = Math.max(...data.civs.map(c => c.value));
  const sorted = [...data.civs].sort((a, b) => b.value - a.value);

  return (
    <div className="civ-chart">
      <div className="chart-head">
        <span className="kicker">⬡ MARKET CAP AT FLOOR · BY CIVILIZATION</span>
        <span className="chart-total">
          CAP @ FLOOR · {data.total.toFixed(2)} ETH · floor {data.floor.toFixed(4)}
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

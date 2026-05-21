"use client";
import { useEffect, useState } from "react";

type Data = {
  index: number;
  floor: number;
  change24h: number | null;
  change7d: number | null;
};

function pctClass(v: number | null) {
  if (v === null || v === 0) return "flat";
  return v > 0 ? "up" : "down";
}

function fmtPct(v: number | null) {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

export function HexIndex() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hex-index")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div className="hex-index hex-index-empty">
        <span className="kicker">⬡ HEX INDEX</span>
        <span className="hi-empty">No signal.</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="hex-index hex-index-loading">
        <span className="kicker">⬡ HEX INDEX</span>
        <span className="hi-empty">Calibrating…</span>
      </div>
    );
  }

  const idx = Math.round(data.index);

  return (
    <div className="hex-index">
      <div className="hi-head">
        <span className="kicker">⬡ HEX INDEX · DAILY CHECK-IN</span>
        <span className="hi-floor">FLOOR · {data.floor.toFixed(4)} ETH</span>
      </div>
      <div className="hi-number">{idx.toLocaleString()}</div>
      <div className="hi-formula">floor × 10,000 — pure floor signal, not a price</div>
      <div className="hi-changes">
        <div className={`hi-change ${pctClass(data.change24h)}`}>
          <span className="hi-label">24H</span>
          <span className="hi-pct">{fmtPct(data.change24h)}</span>
        </div>
        <div className={`hi-change ${pctClass(data.change7d)}`}>
          <span className="hi-label">7D</span>
          <span className="hi-pct">{fmtPct(data.change7d)}</span>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type Data = {
  index: number;
  floor: number;
};

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
        <span className="kicker">⬡ HEX INDEX · MARKET REFERENCE</span>
        <span className="hi-floor">FLOOR · {data.floor.toFixed(4)} ETH</span>
      </div>
      <div className="hi-number">{idx.toLocaleString()}</div>
      <div className="hi-formula">Secondary-market reference only: floor × supply. Not a city-health score, not a return.</div>
    </div>
  );
}

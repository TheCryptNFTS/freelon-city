"use client";
import { useEffect, useState } from "react";

type Bucket = "1" | "2-5" | "6-20" | "21+";

type Data = {
  totalHolders: number;
  totalSupply?: number;
  sampleSize?: number;
  distribution: Record<Bucket, number>;
  top10: Array<{ address: string; count: number }>;
};

const ORDER: Bucket[] = ["1", "2-5", "6-20", "21+"];
const LABEL: Record<Bucket, string> = {
  "1": "1 citizen",
  "2-5": "2–5 citizens",
  "6-20": "6–20 citizens",
  "21+": "21+ citizens",
};
const COLOR: Record<Bucket, string> = {
  "1": "#4a8acb",
  "2-5": "#5a9a4a",
  "6-20": "#c8aa64",
  "21+": "#c54a3a",
};

function shorten(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function HolderDistributionChart() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/opensea/holders")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setErr(true); });
    return () => { cancelled = true; };
  }, []);

  if (err) {
    return (
      <div className="holders-chart holders-chart-empty">
        <span className="kicker">⬡ HOLDER DISTRIBUTION</span>
        <span className="hc-empty">No signal.</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="holders-chart holders-chart-loading">
        <span className="kicker">⬡ HOLDER DISTRIBUTION</span>
        <span className="hc-empty">SCANNING WALLET LEDGER...</span>
      </div>
    );
  }

  if (data.totalHolders === 0) {
    return (
      <div className="holders-chart holders-chart-empty">
        <span className="kicker">⬡ HOLDER DISTRIBUTION</span>
        <span className="hc-empty">No holder data yet.</span>
      </div>
    );
  }

  const buckets = ORDER.map((b) => ({ b, n: data.distribution[b] || 0 }));
  const max = Math.max(...buckets.map((x) => x.n), 1);

  return (
    <div className="holders-chart">
      <div className="hc-head">
        <span className="kicker">⬡ HOLDER DISTRIBUTION</span>
        <span className="hc-total">
          {data.totalHolders.toLocaleString()} unique wallets
          {data.totalSupply ? ` · ${data.totalSupply} citizens` : ""}
        </span>
        {data.sampleSize ? (
          <span className="hc-sample">
            Bars + top wallets: rotating sample of {data.sampleSize} / {data.totalSupply ?? "—"}
          </span>
        ) : null}
      </div>

      <div className="hc-rows">
        {buckets.map(({ b, n }) => (
          <div key={b} className="hc-row">
            <span className="hc-row-label">{LABEL[b]}</span>
            <div className="hc-row-bar-wrap">
              <div
                className="hc-row-bar"
                style={{ width: `${(n / max) * 100}%`, background: COLOR[b] }}
              />
            </div>
            <span className="hc-row-count">{n.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {data.top10.length > 0 && (
        <div className="hc-top">
          <div className="hc-top-head">TOP WALLETS</div>
          <div className="hc-top-list">
            {data.top10.map((w) => (
              <div key={w.address} className="hc-top-row">
                <span className="hc-top-addr">{shorten(w.address)}</span>
                <span className="hc-top-count">{w.count} citizens</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

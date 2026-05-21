"use client";
import { useEffect, useState } from "react";
import { CIVILIZATIONS, heroImageUrl, openseaUrl } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Sale = {
  tokenId: number;
  name?: string;
  priceEth?: string | null;
  ts?: number | null;
};

type ApiResp = { events?: Sale[] };

// Build a lookup once: tokenId -> civilization slug
const CIT_INDEX: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  const arr = citizensData as Array<{ id: number; civilization: string }>;
  for (const c of arr) out[c.id] = c.civilization;
  return out;
})();

function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "";
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

export function LiveSalesFeed() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/opensea/recent", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: ApiResp) => {
          if (cancelled) return;
          const ev = (d?.events || []).slice(0, 30);
          setSales(ev);
        })
        .catch(() => {
          if (!cancelled) setErr(true);
        });
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (err) {
    return (
      <div className="sales-feed sales-feed-empty">
        <span className="kicker">⬡ LIVE SALES · 30D</span>
        <span className="sf-empty">No signal.</span>
      </div>
    );
  }

  if (!sales) {
    return (
      <div className="sales-feed sales-feed-loading">
        <span className="kicker">⬡ LIVE SALES · 30D</span>
        <span className="sf-empty">Tuning in…</span>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="sales-feed sales-feed-empty">
        <span className="kicker">⬡ LIVE SALES · 30D</span>
        <span className="sf-empty">No sales in the last 30 days.</span>
      </div>
    );
  }

  return (
    <div className="sales-feed">
      <div className="sf-head">
        <span className="kicker">⬡ LIVE SALES · LAST 30 DAYS</span>
        <span className="sf-count">{sales.length} transmissions</span>
      </div>
      <div className="sf-list">
        {sales.map((s, i) => {
          const civSlug = CIT_INDEX[s.tokenId] || "blue-synthesis";
          const civ = CIVILIZATIONS[civSlug as keyof typeof CIVILIZATIONS];
          const color = civ?.color || "#777";
          return (
            <a
              key={`${s.tokenId}-${s.ts}-${i}`}
              href={openseaUrl(s.tokenId)}
              target="_blank"
              rel="noopener noreferrer"
              className="sf-row"
              style={{ borderLeftColor: color } as React.CSSProperties}
            >
              <img
                className="sf-thumb"
                src={heroImageUrl(s.tokenId)}
                alt={`#${s.tokenId}`}
                loading="lazy"
              />
              <div className="sf-body">
                <span className="sf-id">#{String(s.tokenId).padStart(4, "0")}</span>
                <span className="sf-civ" style={{ color }}>
                  {civ?.name || "—"}
                </span>
              </div>
              <div className="sf-meta">
                <span className="sf-price">{s.priceEth ? `${s.priceEth} ETH` : "—"}</span>
                <span className="sf-time">{timeAgo(s.ts)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

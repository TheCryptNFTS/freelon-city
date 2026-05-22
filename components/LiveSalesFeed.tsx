"use client";
import { useEffect, useState } from "react";
import { CIVILIZATIONS, heroImageUrl, openseaUrl } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Sale = {
  tokenId: number;
  name?: string;
  priceEth?: string | null;
  ts?: number | null;
  bundleSize?: number;
  buyer?: string | null;
  tx?: string | null;
};

type ApiResp = { events?: Sale[] };

type CitMeta = { civilization: string; tier: string; shape: string; caste: string };
const CIT_INDEX: Record<number, CitMeta> = (() => {
  const out: Record<number, CitMeta> = {};
  const arr = citizensData as Array<{ id: number; civilization: string; tier: string; shape: string; caste: string }>;
  for (const c of arr) out[c.id] = { civilization: c.civilization, tier: c.tier, shape: c.shape, caste: c.caste };
  return out;
})();

function timeAgo(ts: number | null | undefined): string {
  if (!ts) return "—";
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function shortAddr(a: string | null | undefined): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
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
          setSales((d?.events || []).slice(0, 20));
        })
        .catch(() => { if (!cancelled) setErr(true); });
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (err) {
    return (
      <div className="sales-feed sales-feed-empty">
        <span className="kicker">⬡ LIVE SALES · 30D</span>
        <span className="sf-empty">SIGNAL LOST · RETRY</span>
      </div>
    );
  }

  if (!sales) {
    return (
      <div className="sales-feed sales-feed-loading">
        <span className="kicker">⬡ LIVE SALES · 30D</span>
        <div className="sf-skeleton">
          <div className="shimmer-row" style={{ height: 76 }} />
          <div className="shimmer-row" style={{ height: 76 }} />
          <div className="shimmer-row" style={{ height: 76 }} />
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="sales-feed sales-feed-empty">
        <span className="kicker">⬡ LIVE SALES · 30D</span>
        <span className="sf-empty">The floor is quiet · 30 days.</span>
      </div>
    );
  }

  // Compute aggregate stats for the header strip
  const totalVolume = sales.reduce((s, e) => s + (e.priceEth ? parseFloat(e.priceEth) : 0), 0);
  const avg = totalVolume / sales.length;
  const highestSale = sales.reduce((max, e) => {
    const p = e.priceEth ? parseFloat(e.priceEth) : 0;
    return p > (max.priceEth ? parseFloat(max.priceEth) : 0) ? e : max;
  }, sales[0]);

  return (
    <div className="sales-feed">
      <div className="sf-head">
        <div className="sf-head-top">
          <span className="kicker">⬡ LIVE SALES · LAST {sales.length}</span>
          <span className="sf-count">UPDATED {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} UTC</span>
        </div>
        <div className="sf-strip">
          <div className="sf-stat">
            <span className="sf-stat-num">{totalVolume.toFixed(3)}</span>
            <span className="sf-stat-lbl">ETH · {sales.length} TX</span>
          </div>
          <div className="sf-stat">
            <span className="sf-stat-num">{avg.toFixed(4)}</span>
            <span className="sf-stat-lbl">AVG / CITIZEN</span>
          </div>
          <div className="sf-stat">
            <span className="sf-stat-num">{highestSale.priceEth ?? "—"}</span>
            <span className="sf-stat-lbl">HIGH · #{String(highestSale.tokenId).padStart(4, "0")}</span>
          </div>
        </div>
      </div>
      <div className="sf-list">
        {sales.map((s, i) => {
          const meta = CIT_INDEX[s.tokenId] || ({ civilization: "blue-synthesis", tier: "Common", shape: "—", caste: "—" } as CitMeta);
          const civ = CIVILIZATIONS[meta.civilization as keyof typeof CIVILIZATIONS];
          const color = civ?.color || "#777";
          const isRare = meta.tier !== "Common";
          const isBundle = (s.bundleSize ?? 1) > 1;
          return (
            <a
              key={`${s.tokenId}-${s.ts}-${i}`}
              href={openseaUrl(s.tokenId)}
              target="_blank"
              rel="noopener noreferrer"
              className="sf-row"
              style={{ "--civ": color } as React.CSSProperties}
            >
              <div className="sf-thumb-wrap">
                <img
                  className="sf-thumb"
                  src={heroImageUrl(s.tokenId)}
                  alt={`#${s.tokenId}`}
                  loading="lazy"
                />
                <span className="sf-thumb-id">#{String(s.tokenId).padStart(4, "0")}</span>
              </div>
              <div className="sf-body">
                <div className="sf-line-1">
                  <span className="sf-civ" style={{ color }}>{civ?.name || "—"}</span>
                  {isRare && (
                    <span className="sf-tag sf-tag-tier" data-tier={meta.tier}>{meta.tier.toUpperCase()}</span>
                  )}
                  {isBundle && (
                    <span className="sf-tag sf-tag-bundle">BUNDLE × {s.bundleSize}</span>
                  )}
                </div>
                <div className="sf-line-2">
                  <span className="sf-shape">{meta.shape}</span>
                  <span className="sf-dot">·</span>
                  <span className="sf-caste">{meta.caste}</span>
                  <span className="sf-dot">·</span>
                  <span className="sf-buyer">{shortAddr(s.buyer)}</span>
                </div>
              </div>
              <div className="sf-meta">
                <span className="sf-price">{s.priceEth ?? "—"}<small>ETH</small></span>
                <span className="sf-time">{timeAgo(s.ts)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

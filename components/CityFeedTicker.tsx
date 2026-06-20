"use client";
import { useEffect, useState } from "react";

type TickItem = { id: string; text: string; tone?: "gold" | "blue" | "rust" | "red" };

type RawSale = { tokenId?: number; priceEth?: string | null; ts?: number | null };
type RawAlert = { text: string };
type RecentResp = { events?: RawSale[] };
type StatsResp = { floor?: number | string; holders?: number };
type AlertsResp = { alerts?: RawAlert[] };

export function CityFeedTicker() {
  const [items, setItems] = useState<TickItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [recent, stats, alerts] = await Promise.all([
        fetch("/api/opensea/recent").then(r => r.ok ? r.json() as Promise<RecentResp> : null).catch(() => null),
        fetch("/api/opensea/stats").then(r => r.ok ? r.json() as Promise<StatsResp> : null).catch(() => null),
        fetch("/api/alerts").then(r => r.ok ? r.json() as Promise<AlertsResp> : null).catch(() => null),
      ]);
      const out: TickItem[] = [];
      if (stats?.holders) out.push({ id: "holders", text: `${stats.holders} CARRIERS DETECTED` });
      (recent?.events ?? []).slice(0, 5).forEach((e, i) => {
        if (!e?.tokenId) return;
        out.push({ id: `sale-${i}`, text: `CITIZEN #${e.tokenId.toString().padStart(4, "0")} SOLD · ${e.priceEth ?? "—"} ETH`, tone: "blue" });
      });
      (alerts?.alerts ?? []).slice(0, 3).forEach((a, i) => {
        out.push({ id: `alert-${i}`, text: a.text });
      });
      out.push({ id: "bracket", text: "THE FIFTH BRACKET OPENS AT 04:04 UTC", tone: "gold" });
      if (!cancelled) setItems(out);
    }
    void load();
    const t = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (items.length === 0) return null;
  // Duplicate for seamless marquee
  const doubled = [...items, ...items];
  const toneColor = (tone?: string) => {
    if (tone === "gold") return "var(--gold-bright)";
    if (tone === "blue") return "var(--signal-blue)";
    if (tone === "rust") return "var(--mars-rust)";
    if (tone === "red") return "var(--state-danger)";
    return undefined;
  };
  return (
    <div className="city-feed">
      <div className="city-feed-track" style={{ animationDuration: "50s" }}>
        {doubled.map((it, i) => {
          const color = toneColor(it.tone);
          const isLive = i === 0;
          return (
            <span
              key={`${it.id}-${i}`}
              className={`city-feed-item${isLive ? " cf-live" : ""}`}
              data-tone={it.tone || ""}
              style={{ fontSize: 13, ...(!isLive && color ? { color } : {}) }}
            >
              {isLive ? <span className="cf-dot" aria-hidden>●</span> : <span className="cf-dot" />} {it.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

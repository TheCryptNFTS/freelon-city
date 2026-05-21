"use client";
import { useEffect, useState } from "react";

type TickItem = { id: string; text: string; tone?: "gold" | "blue" | "rust" };

export function CityFeedTicker() {
  const [items, setItems] = useState<TickItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [recent, stats, alerts] = await Promise.all([
        fetch("/api/opensea/recent").then(r => r.json()).catch(() => null),
        fetch("/api/opensea/stats").then(r => r.json()).catch(() => null),
        fetch("/api/alerts").then(r => r.json()).catch(() => null),
      ]);
      const out: TickItem[] = [];
      if (stats?.floor) out.push({ id: "floor", text: `FLOOR · ${Number(stats.floor).toFixed(4)} ETH`, tone: "gold" });
      if (stats?.holders) out.push({ id: "holders", text: `${stats.holders} CARRIERS DETECTED` });
      (recent?.events ?? []).slice(0, 5).forEach((e: any, i: number) => {
        out.push({ id: `sale-${i}`, text: `CITIZEN #${e.tokenId.toString().padStart(4, "0")} · ${e.priceEth} ETH`, tone: "blue" });
      });
      (alerts?.alerts ?? []).slice(0, 3).forEach((a: any, i: number) => {
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
  return (
    <div className="city-feed">
      <div className="city-feed-track">
        {doubled.map((it, i) => (
          <span key={`${it.id}-${i}`} className="city-feed-item" data-tone={it.tone || ""}>
            <span className="cf-dot" /> {it.text}
          </span>
        ))}
      </div>
    </div>
  );
}

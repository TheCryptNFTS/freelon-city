"use client";
import { useEffect, useState } from "react";
import { CIVILIZATIONS, heroImageUrl, openseaUrl } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Signal = {
  tokenId: number;
  priceEth: number;
  floorEth: number;
  seller: string;
  flaggedAt: number;
  bountyHex: number;
};
type Resp = { signals?: Signal[]; floor?: number; bountyCap?: number; holdDays?: number };

type CitMeta = { civilization: string };
const CIT_INDEX: Record<number, CitMeta> = (() => {
  const out: Record<number, CitMeta> = {};
  const arr = citizensData as Array<{ id: number; civilization: string }>;
  for (const c of arr) out[c.id] = { civilization: c.civilization };
  return out;
})();

export function RedSignalsFeed() {
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/market/red-signals", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: Resp) => { if (!cancelled) setData(d); })
        .catch(() => { if (!cancelled) setErr(true); });
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (err) return null;
  if (!data) {
    return (
      <div className="red-signals red-signals-loading">
        <span className="kicker" style={{ color: "#FF5A4D" }}>⬡ RED SIGNALS · SCANNING</span>
      </div>
    );
  }
  const signals = data.signals || [];
  if (signals.length === 0) {
    return (
      <div className="red-signals red-signals-empty">
        <span className="kicker" style={{ color: "#FF5A4D" }}>⬡ RED SIGNALS</span>
        <span className="sf-empty">No undervalued listings · the floor is steady</span>
      </div>
    );
  }

  return (
    <div className="red-signals" style={{ border: "1px solid #FF5A4D33", borderRadius: 14, padding: "var(--s-4)", background: "#FF5A4D08", margin: "var(--s-4) 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--s-3)" }}>
        <span className="kicker" style={{ color: "#FF5A4D" }}>⬡ RED SIGNALS · SNIPE FOR HEX</span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          HOLD {data.holdDays ?? 7}D · CAP {data.bountyCap ?? 500}⬡
        </span>
      </div>
      <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--s-3)", listStyle: "none", padding: 0 }}>
        {signals.slice(0, 8).map((s) => {
          const civSlug = CIT_INDEX[s.tokenId]?.civilization || "blue-synthesis";
          const civ = (CIVILIZATIONS as Record<string, { color: string; name: string }>)[civSlug];
          const id4 = String(s.tokenId).padStart(4, "0");
          const discount = ((s.floorEth - s.priceEth) / s.floorEth) * 100;
          return (
            <li key={s.tokenId}>
              <a
                href={openseaUrl(s.tokenId)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", gap: 12, padding: 10, textDecoration: "none", borderRadius: 10, border: `1px solid ${civ?.color || "#FF5A4D"}66`, background: "rgba(0,0,0,0.3)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImageUrl(s.tokenId)}
                  alt={`#${id4}`}
                  loading="lazy"
                  style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: civ?.color, letterSpacing: "0.12em" }}>{civ?.name}</span>
                  <span style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--ink)" }}>#{id4}</span>
                  <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)" }}>
                    {s.priceEth.toFixed(4)} ETH · -{discount.toFixed(0)}% vs floor
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: "var(--display)", fontSize: 18, color: "#FF5A4D", fontWeight: 600 }}>+{s.bountyHex}⬡</span>
                  <span style={{ fontFamily: "var(--mono2)", fontSize: 9, color: "var(--ink-dim)", letterSpacing: "0.18em" }}>SNIPE</span>
                </div>
              </a>
            </li>
          );
        })}
      </ul>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.12em", marginTop: "var(--s-3)" }}>
        Buy on OpenSea while flagged · Hold {data.holdDays ?? 7} days · Bounty auto-credits on next tick
      </p>
    </div>
  );
}

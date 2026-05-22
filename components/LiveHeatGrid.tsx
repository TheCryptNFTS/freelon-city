"use client";
import { useEffect, useState } from "react";

/**
 * Live Heat Grid — backend-verified per-civilization activity.
 *
 * Polls /api/market/heat every 30 seconds for authoritative civ counters
 * maintained by the server-side bumpHeat() called whenever a sale or
 * red signal is observed. Counters have a 60-min TTL so they reflect
 * RECENT activity, not lifetime.
 *
 * Previous version kept counters in client state and was spoofable from
 * the browser console — that's gone. Pulse animation now triggers when
 * the server-side counter for a cell increases.
 */

type Cell = { slug: string; name?: string; color?: string; sales: number; signals: number };

export function LiveHeatGrid() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [lastSeen, setLastSeen] = useState<Record<string, { sales: number; signals: number }>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/market/heat", { cache: "no-store" });
        if (!r.ok || cancelled) return;
        const d: { cells?: Cell[] } = await r.json();
        const next = d.cells || [];
        // Diff against previous snapshot — pulse cells whose counts grew
        setLastSeen((prev) => {
          const updated: Record<string, { sales: number; signals: number }> = { ...prev };
          for (const c of next) {
            const was = prev[c.slug];
            if (was && (c.sales > was.sales || c.signals > was.signals)) {
              setPulses((p) => ({ ...p, [c.slug]: (p[c.slug] || 0) + 1 }));
            }
            updated[c.slug] = { sales: c.sales, signals: c.signals };
          }
          return updated;
        });
        setCells(next);
      } catch {/* network errors are silent */}
    };
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (cells.length === 0) {
    return (
      <section style={{ border: "1px solid var(--line-2)", borderRadius: 14, padding: "var(--s-4)", background: "rgba(255,255,255,0.02)", margin: "var(--s-4) 0" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ LIVE HEAT · LOADING</span>
      </section>
    );
  }

  const total = cells.reduce((s, c) => s + c.sales + c.signals, 0);

  return (
    <section
      style={{
        border: "1px solid var(--line-2)",
        borderRadius: 14,
        padding: "var(--s-4)",
        background: "rgba(255,255,255,0.02)",
        margin: "var(--s-4) 0",
      }}
    >
      <style>{`
        @keyframes heatPulse {
          0%   { transform: scale(1);    box-shadow: 0 0 0 0 currentColor; }
          50%  { transform: scale(1.04); box-shadow: 0 0 0 12px transparent; }
          100% { transform: scale(1);    box-shadow: 0 0 0 0 transparent; }
        }
        .heat-cell.pulsing { animation: heatPulse 800ms ease-out; }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--s-3)", flexWrap: "wrap", gap: 8 }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ LIVE HEAT · ACTIVITY BY CIV · LAST 60 MIN</span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          {total === 0 ? "QUIET · NO ACTIVITY" : `${total} EVENTS · POLLED 30S`}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        {cells.map((c) => {
          const intensity = Math.min(1, (c.sales + c.signals) / 5);
          const pulseKey = pulses[c.slug] || 0;
          const isPulsing = pulseKey > 0 && Date.now() - (lastSeen[c.slug]?.sales || 0) < 1500;
          return (
            <div
              key={c.slug}
              className={`heat-cell ${isPulsing ? "pulsing" : ""}`}
              data-pulse={pulseKey}
              style={{
                position: "relative",
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${c.color}${intensity > 0.1 ? "88" : "33"}`,
                background: `linear-gradient(135deg, ${c.color}${Math.round(intensity * 40).toString(16).padStart(2, "0")} 0%, rgba(0,0,0,0.4) 100%)`,
                color: c.color,
                transition: "border-color 600ms ease, background 600ms ease",
                minHeight: 92,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.12em", color: c.color, fontWeight: 600, textTransform: "uppercase", lineHeight: 1.2 }}>
                {c.name || c.slug}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)", lineHeight: 1 }}>{c.sales}</div>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 9, color: "var(--ink-dim)", letterSpacing: "0.12em" }}>SALES</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "#FF5A4D", lineHeight: 1 }}>{c.signals}</div>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 9, color: "var(--ink-dim)", letterSpacing: "0.12em" }}>SIGNALS</div>
                </div>
              </div>
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: c.color,
                  opacity: intensity,
                  boxShadow: intensity > 0.5 ? `0 0 8px ${c.color}` : "none",
                  transition: "opacity 600ms ease",
                }}
              />
            </div>
          );
        })}
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.12em", marginTop: "var(--s-3)" }}>
        Server-verified counters · sales + flagged signals attributed by citizen civilization · 60-min rolling window.
      </p>
    </section>
  );
}

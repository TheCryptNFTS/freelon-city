"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

/**
 * Live Heat Grid — a per-civilization activity pulse map.
 *
 * Polls /api/opensea/recent every 30s for sales and /api/market/red-signals
 * every 5 min. For each new event, it triggers a brief pulse animation on
 * the civ cell of the citizen involved. Cells keep a 60-second rolling
 * "heat" score that drives background intensity.
 *
 * It's not a real-time stream (no WebSocket infra) — it's polling that
 * feels live because the animation reacts to deltas. Good enough for v1.
 */

type Sale = { tokenId: number; ts?: number | null; priceEth?: string | null };
type Signal = { tokenId: number; bountyHex: number; flaggedAt: number };

const CIT_TO_CIV: Record<number, string> = (() => {
  const out: Record<number, string> = {};
  for (const c of citizensData as Array<{ id: number; civilization: string }>) {
    out[c.id] = c.civilization;
  }
  return out;
})();

type CellState = {
  slug: string;
  name: string;
  color: string;
  sales: number;
  snipes: number;
  /** ms timestamp of last pulse — used to fade decay */
  lastPulse: number;
};

export function LiveHeatGrid() {
  const civs = useMemo(() => Object.entries(CIVILIZATIONS) as Array<[string, { name: string; color: string }]>, []);
  const [cells, setCells] = useState<Record<string, CellState>>(() => {
    const out: Record<string, CellState> = {};
    for (const [slug, def] of civs) {
      out[slug] = { slug, name: def.name, color: def.color, sales: 0, snipes: 0, lastPulse: 0 };
    }
    return out;
  });
  const [pulses, setPulses] = useState<Record<string, number>>({}); // slug -> animation key

  const lastSaleTs = useRef<number>(0);
  const lastSignalTs = useRef<number>(0);

  function pulseCell(slug: string, kind: "sale" | "snipe") {
    setCells((prev) => {
      const cur = prev[slug];
      if (!cur) return prev;
      return {
        ...prev,
        [slug]: {
          ...cur,
          sales: cur.sales + (kind === "sale" ? 1 : 0),
          snipes: cur.snipes + (kind === "snipe" ? 1 : 0),
          lastPulse: Date.now(),
        },
      };
    });
    setPulses((p) => ({ ...p, [slug]: (p[slug] || 0) + 1 }));
  }

  useEffect(() => {
    let cancelled = false;
    const fetchSales = async () => {
      try {
        const r = await fetch("/api/opensea/recent", { cache: "no-store" });
        if (!r.ok) return;
        const d: { events?: Sale[] } = await r.json();
        const events = d.events || [];
        // First load: just set the cursor; don't pulse for backlog.
        if (lastSaleTs.current === 0) {
          lastSaleTs.current = Math.max(...events.map((e) => e.ts || 0), 0);
          return;
        }
        const newOnes = events.filter((e) => (e.ts || 0) > lastSaleTs.current);
        if (cancelled) return;
        for (const ev of newOnes.reverse()) {
          const civ = CIT_TO_CIV[ev.tokenId];
          if (civ) pulseCell(civ, "sale");
        }
        lastSaleTs.current = Math.max(lastSaleTs.current, ...events.map((e) => e.ts || 0));
      } catch {/* ignore */}
    };
    const fetchSignals = async () => {
      try {
        const r = await fetch("/api/market/red-signals", { cache: "no-store" });
        if (!r.ok) return;
        const d: { signals?: Signal[] } = await r.json();
        const signals = d.signals || [];
        if (lastSignalTs.current === 0) {
          lastSignalTs.current = Math.max(...signals.map((s) => s.flaggedAt || 0), 0);
          return;
        }
        const newOnes = signals.filter((s) => s.flaggedAt > lastSignalTs.current);
        if (cancelled) return;
        for (const sg of newOnes) {
          const civ = CIT_TO_CIV[sg.tokenId];
          if (civ) pulseCell(civ, "snipe");
        }
        lastSignalTs.current = Math.max(lastSignalTs.current, ...signals.map((s) => s.flaggedAt || 0));
      } catch {/* ignore */}
    };

    fetchSales();
    fetchSignals();
    const saleId = setInterval(fetchSales, 30_000);
    const sigId = setInterval(fetchSignals, 5 * 60_000);
    // Tick the pulses so the heat fades visually even without new events
    const decayId = setInterval(() => {
      setCells((prev) => ({ ...prev }));
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(saleId);
      clearInterval(sigId);
      clearInterval(decayId);
    };
  }, []);

  const list = civs.map(([slug]) => cells[slug]);

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
        .heat-cell.pulse-1 { animation: heatPulse 800ms ease-out; }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "var(--s-3)", flexWrap: "wrap", gap: 8 }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ LIVE HEAT · ACTIVITY BY CIV</span>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
          POLLS · SALES 30S · SIGNALS 5MIN
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        {list.map((c) => {
          const sinceLast = Date.now() - c.lastPulse;
          const heat = Math.max(0, 1 - sinceLast / 60_000); // 0..1 fades in 60s
          const pulseKey = pulses[c.slug] || 0;
          const isPulsing = sinceLast < 800;
          return (
            <div
              key={c.slug}
              className={`heat-cell ${isPulsing ? "pulse-1" : ""}`}
              data-pulse={pulseKey}
              style={{
                position: "relative",
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${c.color}${heat > 0.1 ? "88" : "33"}`,
                background: `linear-gradient(135deg, ${c.color}${Math.round(heat * 40).toString(16).padStart(2, "0")} 0%, rgba(0,0,0,0.4) 100%)`,
                color: c.color,
                transition: "border-color 600ms ease, background 600ms ease",
                minHeight: 92,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.12em", color: c.color, fontWeight: 600, textTransform: "uppercase", lineHeight: 1.2 }}>
                {c.name}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)", lineHeight: 1 }}>{c.sales}</div>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 9, color: "var(--ink-dim)", letterSpacing: "0.12em" }}>SALES</div>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "#FF5A4D", lineHeight: 1 }}>{c.snipes}</div>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 9, color: "var(--ink-dim)", letterSpacing: "0.12em" }}>SIGNALS</div>
                </div>
              </div>
              {/* Pulse dot in corner */}
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: c.color,
                  opacity: heat,
                  boxShadow: heat > 0.5 ? `0 0 8px ${c.color}` : "none",
                  transition: "opacity 600ms ease",
                }}
              />
            </div>
          );
        })}
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.12em", marginTop: "var(--s-3)" }}>
        Cells brighten on new sales / red signals. Heat decays over 60s. Live snapshot from the city&apos;s ledger.
      </p>
    </section>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Snap = { ts: number; index: number };
type Data = {
  index: number;
  floor: number;
  change24h: number | null;
  change7d: number | null;
  history?: Snap[];
};

function pctClass(v: number | null): "up" | "down" | "flat" {
  if (v === null || v === 0) return "flat";
  return v > 0 ? "up" : "down";
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function todayLabel(v: number | null): string {
  if (v === null) return "FLAT TODAY";
  if (v > 0) return `↑ ${fmtPct(v)} TODAY`;
  if (v < 0) return `↓ ${fmtPct(v)} TODAY`;
  return "FLAT TODAY";
}

function Sparkline({ history }: { history: Snap[] }) {
  if (!history || history.length < 2) return null;
  const W = 240;
  const H = 48;
  const pad = 4;
  const xs = history.map((_, i) => i);
  const ys = history.map((s) => s.index);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY - minY || 1;
  const stepX = (W - pad * 2) / Math.max(1, xs.length - 1);
  const points = history
    .map((s, i) => {
      const x = pad + i * stepX;
      const y = pad + (H - pad * 2) * (1 - (s.index - minY) / rangeY);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      className="hx-spark"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label="7-day hex index"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function HexIndexHero() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [displayIdx, setDisplayIdx] = useState<number | null>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hex-index")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d as Data);
      })
      .catch(() => {
        if (!cancelled) setErr(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data || animatedRef.current) return;
    animatedRef.current = true;
    const target = Math.round(data.index);
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplayIdx(Math.round(target * easeOut(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  if (err || !data) {
    return (
      <section className="hex-index-hero">
        <span className="kicker">⬡ ON-CHAIN TEMPERATURE</span>
        <div className="hx-number">—</div>
        <div className="hx-meta">
          <span className="hx-change flat">CALIBRATING…</span>
        </div>
        <span className="hx-formula">0.005 ETH floor = 50. Bigger number = stronger city.</span>
      </section>
    );
  }

  const idx = displayIdx !== null ? displayIdx : Math.round(data.index);
  const cls = pctClass(data.change24h);
  const cls7 = pctClass(data.change7d);
  const history = Array.isArray(data.history) ? data.history.slice(-7) : [];

  return (
    <section className="hex-index-hero">
      <span className="kicker">⬡ ON-CHAIN TEMPERATURE</span>
      <div className="hx-headline-row">
        <div className="hx-side hx-side-left">
          <span className="hx-side-label">PRIOR DAY</span>
          <span className={`hx-side-val ${cls}`}>{fmtPct(data.change24h)}</span>
        </div>
        <div className="hx-number">{idx.toLocaleString()}</div>
        <div className="hx-side hx-side-right">
          <Link href="/earn#hex-index" className="hx-side-link">
            WHAT IS THE HEX INDEX? →
          </Link>
        </div>
      </div>
      <div className="hx-meta">
        <span className={`hx-change ${cls}`}>{todayLabel(data.change24h)}</span>
        <span className={`hx-change ${cls7}`}>7D {fmtPct(data.change7d)}</span>
      </div>
      {history.length >= 2 ? (
        <div className={`hx-spark-wrap ${cls}`}>
          <Sparkline history={history} />
        </div>
      ) : null}
      <span className="hx-formula">0.005 ETH floor = 50. Bigger number = stronger city.</span>
    </section>
  );
}

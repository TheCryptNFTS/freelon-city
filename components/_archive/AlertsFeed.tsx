"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = {
  id: string;
  ts: number;
  severity: "info" | "warn" | "crit";
  text: string;
  href?: string;
};

function relTime(ts: number, now: number): string {
  const dSec = Math.max(0, Math.floor((now - ts) / 1000));
  if (dSec < 60) return `${dSec}s`;
  const dMin = Math.floor(dSec / 60);
  if (dMin < 60) return `${dMin}m`;
  const dHr = Math.floor(dMin / 60);
  if (dHr < 24) return `${dHr}h`;
  const dDay = Math.floor(dHr / 24);
  return `${dDay}d`;
}

export function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch("/api/alerts", { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as { alerts: Alert[] };
        if (!cancelled && Array.isArray(data.alerts)) {
          setAlerts(data.alerts.slice(0, 5));
        }
      } catch {
        /* ignore */
      }
    }

    load();
    const poll = setInterval(load, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  if (alerts.length === 0) return null;

  const pillStyle: React.CSSProperties = {
    padding: "18px 24px",
    animation: "alert-slide-in 400ms cubic-bezier(0.2,0.7,0.2,1) both",
  };
  const dotStyle: React.CSSProperties = { width: 12, height: 12 };

  return (
    <section className="alerts-feed">
      <span className="kicker">⬡ 404 ALERTS · LIVE SIGNAL</span>
      <style>{`@keyframes alert-slide-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div className="alerts-list">
        {alerts.map((a) => {
          const inner = (
            <>
              <span className="alert-dot" aria-hidden style={dotStyle} />
              <span className="alert-text">{a.text}</span>
              <span className="alert-time">{relTime(a.ts, now)}</span>
            </>
          );
          if (a.href) {
            const isExternal = a.href.startsWith("http");
            if (isExternal) {
              return (
                <a
                  key={a.id}
                  className="alert-pill"
                  data-sev={a.severity}
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={pillStyle}
                >
                  {inner}
                </a>
              );
            }
            return (
              <Link key={a.id} className="alert-pill" data-sev={a.severity} href={a.href} style={pillStyle}>
                {inner}
              </Link>
            );
          }
          return (
            <div key={a.id} className="alert-pill" data-sev={a.severity} style={pillStyle}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

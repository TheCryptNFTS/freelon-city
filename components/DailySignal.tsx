"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getDailySignal, secondsUntilNextSignal } from "@/lib/daily-signal";
import { CIVILIZATIONS } from "@/lib/constants";

export function DailySignal() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  const sig = getDailySignal(now);
  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[sig.from];
  const left = secondsUntilNextSignal(now);
  const hh = String(Math.floor(left / 3600)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const tweet = `⬡ DAILY SIGNAL — ${new Date(now.getTime()).toISOString().slice(0,10)}\n\n"${sig.line}"\n\n— ${civ.name}\nfreeloncity.com`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  return (
    <section className="daily-signal reveal" style={{ "--civ": civ.color } as React.CSSProperties}>
      <div className="ds-head">
        <span className="kicker">⬡ DAILY SIGNAL · TRANSMITTING NOW</span>
        <span className="ds-countdown" aria-live="polite" aria-atomic="true">NEXT IN {hh}:{mm}:{ss} · 04:04 UTC</span>
      </div>
      <div className="ds-body">
        <div className="ds-cipher">{sig.cipher}</div>
        <blockquote className="ds-line">&ldquo;{sig.line}&rdquo;</blockquote>
        <div className="ds-attr">
          <span>—</span>
          <Link href={`/civilizations/${sig.from}`} style={{ color: civ.color }}>
            {civ.name.toUpperCase()}
          </Link>
        </div>
        <a className="btn btn-gold ds-share" href={intent} target="_blank" rel="noreferrer">
          <span className="lbl">RELAY THE SIGNAL</span>
          <span className="ttl">POST TO X <span className="ar">→</span></span>
        </a>
      </div>
    </section>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { markGhost404 } from "@/lib/secrets-store";

/**
 * THE CITY BOARD — a rotating newsboard of the city's live beats. Replaces the
 * single static 404-event line (Discord, Cm #0006: "make it stand out, like a
 * newsboard showing ~4 important events, auto + manual rotation, live
 * countdown"). Each slot is either a TIMED event (live per-second countdown to a
 * recurring UTC moment) or an evergreen highlight. Auto-advances; arrows/dots
 * let the reader drive it. Hex-pattern bg + a soft gold light make it stand out.
 */

// The 404 "Fifth Bracket" window: 04:04:00–04:08:04 UTC.
const BRACKET_WINDOW_MS = 4 * 60 * 1000 + 4 * 1000;

type Slot =
  | { kind: "timed"; id: string; label: string; href?: string; at: (now: Date) => number; live?: (now: Date) => boolean; liveLabel?: string }
  | { kind: "ever"; id: string; label: string; href?: string };

function nextDailyUTC(now: Date, h: number, m = 0): number {
  const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
  const today = Date.UTC(y, mo, d, h, m, 0, 0);
  return now.getTime() < today ? today : Date.UTC(y, mo, d + 1, h, m, 0, 0);
}

const SLOTS: Slot[] = [
  {
    kind: "timed",
    id: "bracket",
    label: "The Fifth Bracket opens",
    // 2026-07-02 war-room: the ticker teased a cryptic countdown with NO
    // destination — a cold reader had no way to learn what the bracket even
    // is. The lore page explains it.
    href: "/the-fifth-bracket",
    at: (now) => nextDailyUTC(now, 4, 4),
    live: (now) => {
      const open = (() => { const y = now.getUTCFullYear(); return Date.UTC(y, now.getUTCMonth(), now.getUTCDate(), 4, 4, 0, 0); })();
      const t = now.getTime();
      return t >= open && t < open + BRACKET_WINDOW_MS;
    },
    liveLabel: "⬡⬡⬡ THE FIFTH BRACKET IS OPEN",
  },
  // 2026-07-02 war-room: /carrier is a deleted route surviving only as a 308
  // redirect — link the real destination directly.
  { kind: "timed", id: "signal", label: "Daily signal resets", href: "/sync#carrier", at: (now) => nextDailyUTC(now, 0, 0) },
  { kind: "ever", id: "versus", label: "New · send your agent into a Versus debate", href: "/citizens" },
  { kind: "ever", id: "chronicle", label: "New · your agent writes its own Chronicle", href: "/citizens" },
];

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FourOFourEvent() {
  const [now, setNow] = useState<Date | null>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Live clock — ticks every second so countdowns are truly live (was 30s).
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-rotate the board (pause on hover/focus).
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % SLOTS.length), 6000);
    return () => clearInterval(id);
  }, [paused]);

  // When the bracket is live, mark the secret + force that slot to front.
  const bracketLive = useMemo(() => (now ? SLOTS[0].kind === "timed" && SLOTS[0].live?.(now) : false), [now]);
  useEffect(() => { if (bracketLive) { try { markGhost404(); } catch {} setIdx(0); } }, [bracketLive]);

  // PERF/CLS 2026-06-11: this used to be `if (!now) return null` — the whole
  // banner popped in only AFTER hydration, pushing <main> down on EVERY route
  // (the recurring ~0.05 CLS) and forcing a late re-paint of each page's LCP
  // element (Lighthouse render-delay 3-4.6s chained on the JS bundle). The
  // board is now server-rendered at full height with the first clock-FREE slot
  // (countdowns need the client clock); the live countdown takes over on the
  // first tick. Server and first client render both hit the !now branch, so
  // there is no hydration mismatch.
  const shownIdx = now ? idx : Math.max(0, SLOTS.findIndex((s) => s.kind === "ever"));
  const slot = SLOTS[shownIdx];

  let text: string;
  if (slot.kind === "timed" && now) {
    if (slot.live?.(now)) {
      const closeMs = (() => { const y = now.getUTCFullYear(); const open = Date.UTC(y, now.getUTCMonth(), now.getUTCDate(), 4, 4, 0, 0); return open + BRACKET_WINDOW_MS - now.getTime(); })();
      text = `${slot.liveLabel} · CLOSES IN ${fmt(closeMs)}`;
    } else {
      text = `${slot.label} · in ${fmt(slot.at(now) - now.getTime())}`;
    }
  } else {
    text = slot.label;
  }

  const active = slot.kind === "timed" && !!now && slot.live?.(now);
  const inner = (
    <span className="four-board__text" key={slot.id}>{text}</span>
  );

  return (
    <div
      className={`four-board${active ? " active" : ""}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <button type="button" className="four-board__arrow" aria-label="Previous event" onClick={() => setIdx((i) => (i - 1 + SLOTS.length) % SLOTS.length)}>‹</button>
      <div className="four-board__slot">
        {slot.href ? <a href={slot.href} className="four-board__link">{inner}</a> : inner}
      </div>
      <button type="button" className="four-board__arrow" aria-label="Next event" onClick={() => setIdx((i) => (i + 1) % SLOTS.length)}>›</button>
      <div className="four-board__dots" role="tablist" aria-label="City events">
        {SLOTS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === shownIdx}
            aria-label={`Event ${i + 1}`}
            className={`four-board__dot${i === shownIdx ? " on" : ""}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  );
}

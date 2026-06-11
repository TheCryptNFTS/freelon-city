"use client";

import { useEffect, useState } from "react";
import styles from "./CityPulse.module.css";

// CITY PULSE — two honest clocks (2026-06-11).
// Both numbers track REAL, verifiable events (HONEST STATE LAW — no invented
// activity, no fake precision):
//   1. "CITY — DAY N" — full days since 2023-10-27T00:00:00Z, the creation tx
//      of The Crypt (0x06827d…b41c), the city's on-chain founding. Etherscan-
//      verifiable; this is the "Founded on-chain 2023" claim made countable.
//   2. "NEXT SIGNAL REPORT — Dd Hh Mm" — countdown to the next Sunday 18:00 UTC,
//      the real weekly Signal Report auto-post (the cron that actually fires).
//      The report recurs, so the countdown shows distance-to-ritual, never
//      scarcity pressure — there is nothing to miss, only the next edition.
// Ticks at 60s (minute resolution — a seconds tick would be theatrical, not
// informative). Renders null on the server and until the first client compute,
// so it self-hides for crawlers/no-JS and can never hydrate a wrong number.

const FOUNDING_UTC = Date.UTC(2023, 9, 27, 0, 0, 0); // 2023-10-27T00:00:00Z
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MIN_MS = 60_000;

// Next Sunday 18:00 UTC at-or-after `now`. getUTCDay() is 0 on Sunday, so
// (date - day) is the Sunday of the current UTC week; Date.UTC normalizes
// negative/overflow day-of-month values.
function nextReportUtc(now: number): number {
  const d = new Date(now);
  const thisSunday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - d.getUTCDay(), 18, 0, 0);
  return thisSunday > now ? thisSunday : thisSunday + 7 * DAY_MS;
}

type Pulse = { day: number; d: number; h: number; m: number };

function compute(now: number): Pulse | null {
  const day = Math.floor((now - FOUNDING_UTC) / DAY_MS);
  // A client clock set before the founding date would make both lines lies —
  // the honest state for a broken clock is absence.
  if (day < 0) return null;
  const diff = nextReportUtc(now) - now;
  return {
    day,
    d: Math.floor(diff / DAY_MS),
    h: Math.floor((diff % DAY_MS) / HOUR_MS),
    m: Math.floor((diff % HOUR_MS) / MIN_MS),
  };
}

export function CityPulse({ className }: { className?: string }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    const tick = () => setPulse(compute(Date.now()));
    tick();
    const id = setInterval(tick, MIN_MS);
    return () => clearInterval(id);
  }, []);

  if (!pulse) return null;

  return (
    <div className={className ? `${styles.pulse} ${className}` : styles.pulse} aria-label="City pulse">
      <span className={styles.line}>
        CITY — DAY <span className={styles.value}>{pulse.day}</span>
      </span>
      <span className={styles.line}>
        NEXT SIGNAL REPORT —{" "}
        <span className={styles.value}>
          {pulse.d}d {pulse.h}h {pulse.m}m
        </span>
      </span>
    </div>
  );
}

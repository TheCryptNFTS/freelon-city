"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dayKey, yesterdayKey } from "@/lib/daily";

/**
 * Cross-game "dailies" strip for the arcade hub. Reads each daily game's
 * local result + streak (no server, no economy) and surfaces, at a glance,
 * which rituals are still open today and how long each streak has run.
 *
 * Each game owns its own storage; this component only READS those keys, never
 * writes them — so it can't desync a game's own bookkeeping. Pure client:
 * renders nothing until mounted to avoid an SSR/hydration mismatch.
 */

type Daily = {
  game: string;
  label: string;
  href: string;
  accent: string;
  /** localStorage key holding today's result (constant or day-scoped). */
  resultKey: (today: string) => string;
  /** Given the parsed result blob + today's key, has it been completed? */
  done: (parsed: unknown, today: string) => boolean;
  streakKey: string;
};

const DAILIES: Daily[] = [
  {
    game: "proof",
    // Label spells out it's the GAME (2026-06-10) — "Proof of Signal" alone
    // collided with /proof (the render-moat page); anyone told "check proof"
    // could land on an arcade game. Route unchanged.
    label: "Proof of Signal · daily game",
    href: "/play/proof",
    accent: "var(--gold-bright)",
    resultKey: (t) => `freelon:proof:v2:${t}`,
    done: (p) => {
      const s = (p as { status?: string } | null)?.status;
      return s === "won" || s === "lost";
    },
    streakKey: "freelon:proof:v1:streak",
  },
  {
    game: "cipher",
    label: "Cipher Decode",
    href: "/play/cipher",
    accent: "var(--neon-magenta)",
    resultKey: () => "freelon::play::cipher::daily::v1",
    done: (p, t) => (p as { dayKey?: string } | null)?.dayKey === t,
    streakKey: "freelon::play::cipher::streak::v1",
  },
  {
    game: "hex-match",
    label: "Hex Match Daily",
    href: "/play/hex-match",
    accent: "var(--neon-cyan)",
    resultKey: () => "freelon::play::hexmatch::daily::v1",
    done: (p, t) => (p as { dayKey?: string } | null)?.dayKey === t,
    streakKey: "freelon::play::hexmatch::streak::v1",
  },
  {
    game: "sweep",
    label: "Sweep Daily",
    href: "/play/sweep",
    accent: "var(--neon-cyan)",
    resultKey: () => "freelon::play::sweep::daily::v1",
    done: (p, t) => (p as { dayKey?: string } | null)?.dayKey === t,
    streakKey: "freelon::play::sweep::streak::v1",
  },
];

type Row = { game: string; label: string; href: string; accent: string; done: boolean; streak: number };

function readRows(): Row[] {
  const today = dayKey();
  const yesterday = yesterdayKey();
  return DAILIES.map((d) => {
    let done = false;
    let streak = 0;
    try {
      const raw = window.localStorage.getItem(d.resultKey(today));
      done = raw ? d.done(JSON.parse(raw), today) : false;
    } catch {
      /* corrupt/blocked — treat as not done */
    }
    try {
      const raw = window.localStorage.getItem(d.streakKey);
      if (raw) {
        const s = JSON.parse(raw) as { streak?: number; lastDayKey?: string };
        // A streak is only "live" if its last win was today or yesterday;
        // an older lastDayKey means it has already lapsed.
        const alive = s.lastDayKey === today || s.lastDayKey === yesterday;
        streak = alive ? Math.max(0, Math.floor(s.streak ?? 0)) : 0;
      }
    } catch {
      /* corrupt/blocked — leave streak at 0 */
    }
    return { game: d.game, label: d.label, href: d.href, accent: d.accent, done, streak };
  });
}

export function DailyHub() {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    setMounted(true);
    setRows(readRows());
    const onFocus = () => setRows(readRows());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!mounted) return null;

  const left = rows.filter((r) => !r.done).length;

  return (
    <section
      style={{
        maxWidth: 1000,
        margin: "28px auto 0",
        border: "1px solid var(--line)",
        background: "var(--bg-2)",
        padding: "16px 18px 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.28em",
            color: "var(--ink-fade)",
            textTransform: "uppercase",
          }}
        >
          ⬡ TODAY&apos;S DAILIES
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: left > 0 ? "var(--gold-bright)" : "var(--ink-fade)",
          }}
        >
          {left > 0
            ? `${left} OF ${rows.length} LEFT · RESETS 00:00 UTC`
            : "ALL CLEAR · RESETS 00:00 UTC"}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        {rows.map((r) => (
          <Link
            key={r.game}
            href={r.href}
            style={{
              display: "block",
              textDecoration: "none",
              border: "1px solid var(--line)",
              borderLeft: `2px solid ${r.accent}`,
              background: "var(--surface)",
              padding: "12px 13px",
              opacity: r.done ? 0.72 : 1,
              transition: "border-color .15s, opacity .15s",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.16em",
                  color: r.done ? "var(--ink-fade)" : r.accent,
                  textTransform: "uppercase",
                }}
              >
                {r.done ? "DONE ✓" : "OPEN"}
              </span>
              {r.streak > 0 && (
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: "var(--gold-bright)",
                  }}
                >
                  ⬡ STREAK {r.streak}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                letterSpacing: "0.04em",
                color: "var(--ink)",
              }}
            >
              {r.label}
            </div>
            {/* streak pips — a quick visual sense of momentum (caps at 7) */}
            <div style={{ display: "flex", gap: 4, marginTop: 9 }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      i < r.streak ? "var(--gold-bright)" : "var(--line)",
                    boxShadow:
                      i < r.streak ? "0 0 5px var(--gold-bright)" : "none",
                  }}
                />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

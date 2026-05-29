"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tweetSweep, tweetIntent } from "@/lib/share";

/**
 * Sweep Run — prototype #5 (reflex acquisition hit).
 *
 * "Sweep the corrupted. Spare the living." Corrupted signals (red, glitching)
 * spawn on a hex grid and decay on a shrinking timer — tap to SWEEP them for
 * points before they fully corrupt (a MISS costs a life). Live civ-citizens
 * also appear as decoys: tap one and you're penalised. A sweep streak builds a
 * score multiplier; 3 misses ends the run. Speed ramps with score.
 *
 * Self-contained: no wallet, no server, no economy mutation. Best score +
 * streak persist to localStorage so the prototype remembers between visits.
 */

const COLS = 4;
const ROWS = 4;
const CELLS = COLS * ROWS;
const LIVES = 3;
const TICK_MS = 50; // game loop resolution
const BEST_KEY = "freelon::play::sweep::best::v1";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

// Live-citizen decoys — civ colors + glyphs (must be SPARED, not swept).
const LIVE = [
  { name: "Synthesis", color: "#00B8FF", glyph: "◇" },
  { name: "Growth", color: "#4CFF7A", glyph: "✦" },
  { name: "Oracle", color: "#B85CFF", glyph: "●" },
  { name: "Luxury", color: "#FF5CB4", glyph: "✚" },
  { name: "Sovereignty", color: "#FFD24A", glyph: "■" },
] as const;

type Target = {
  id: number;
  cell: number;
  kind: "dead" | "live";
  born: number; // ms timestamp
  ttl: number; // lifespan ms
  live?: number; // index into LIVE for decoys
};

type Status = "idle" | "playing" | "over";

const rnd = (n: number) => Math.floor(Math.random() * n);

// Difficulty curve — spawn faster + shorter lifespans as the score climbs.
function spawnInterval(score: number): number {
  return Math.max(420, 1050 - score * 1.1);
}
function targetTtl(score: number): number {
  return Math.max(720, 1650 - score * 1.3);
}
function liveChance(score: number): number {
  return Math.min(0.28, 0.12 + score / 8000); // decoys get more common
}

export function SweepRun() {
  const [status, setStatus] = useState<Status>("idle");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [targets, setTargets] = useState<Target[]>([]);
  const [flash, setFlash] = useState<{ cell: number; kind: "sweep" | "miss" | "spare-hit" } | null>(null);
  const [newBest, setNewBest] = useState(false);

  // Loop bookkeeping in refs so the interval closure always sees fresh values.
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextSpawnRef = useRef(0);
  const nextIdRef = useRef(1);
  // Authoritative live game values live in refs (updated synchronously) so the
  // interval loop and endRun never read stale React state; the matching
  // useState is display-only.
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const targetsRef = useRef<Target[]>([]);
  const statusRef = useRef<Status>("idle");

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(BEST_KEY) : null;
    if (raw) setBest(parseInt(raw, 10) || 0);
  }, []);

  const mult = Math.min(5, 1 + Math.floor(streak / 5));

  const endRun = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = null;
    statusRef.current = "over";
    setStatus("over");
    setTargets([]);
    const finalScore = scoreRef.current;
    setBest((prev) => {
      if (finalScore > prev) {
        setNewBest(true);
        try {
          window.localStorage.setItem(BEST_KEY, String(finalScore));
        } catch {}
        return finalScore;
      }
      return prev;
    });
  }, []);

  // ── the game loop ──────────────────────────────────────────────────────
  const start = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    setScore(0);
    setLives(LIVES);
    setStreak(0);
    setBestStreak(0);
    setTargets([]);
    setFlash(null);
    setNewBest(false);
    scoreRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    targetsRef.current = [];
    nextIdRef.current = 1;
    nextSpawnRef.current = Date.now() + 500;
    statusRef.current = "playing";
    setStatus("playing");

    loopRef.current = setInterval(() => {
      if (statusRef.current !== "playing") return;
      const now = Date.now();
      const sc = scoreRef.current;

      // Expire any timed-out targets. A dead signal fully corrupting = a MISS.
      const live: Target[] = [];
      let missed = false;
      for (const t of targetsRef.current) {
        if (now - t.born >= t.ttl) {
          if (t.kind === "dead") missed = true;
          // live decoys expire harmlessly
        } else {
          live.push(t);
        }
      }
      if (missed) {
        streakRef.current = 0;
        setStreak(0);
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) endRun();
          return Math.max(0, next);
        });
      }

      // Spawn on schedule into a free cell (cap concurrent targets).
      let next = live;
      if (now >= nextSpawnRef.current && live.length < 6) {
        const occupied = new Set(live.map((t) => t.cell));
        const free: number[] = [];
        for (let i = 0; i < CELLS; i++) if (!occupied.has(i)) free.push(i);
        if (free.length) {
          const cell = free[rnd(free.length)];
          const isLive = Math.random() < liveChance(sc);
          const t: Target = {
            id: nextIdRef.current++,
            cell,
            kind: isLive ? "live" : "dead",
            born: now,
            ttl: targetTtl(sc) * (isLive ? 1.25 : 1),
            live: isLive ? rnd(LIVE.length) : undefined,
          };
          next = [...live, t];
        }
        nextSpawnRef.current = now + spawnInterval(sc);
      }

      targetsRef.current = next;
      setTargets(next);
    }, TICK_MS);
  }, [endRun]);

  useEffect(() => {
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, []);

  const hit = useCallback(
    (t: Target) => {
      if (statusRef.current !== "playing") return;
      const remove = () => {
        const next = targetsRef.current.filter((x) => x.id !== t.id);
        targetsRef.current = next;
        setTargets(next);
      };
      if (t.kind === "dead") {
        // SWEEP — good. Update refs synchronously so endRun/persisted best
        // never lag behind the displayed score.
        const ns = streakRef.current + 1;
        streakRef.current = ns;
        bestStreakRef.current = Math.max(bestStreakRef.current, ns);
        const m = Math.min(5, 1 + Math.floor(ns / 5));
        scoreRef.current += 10 * m;
        setStreak(ns);
        setBestStreak(bestStreakRef.current);
        setScore(scoreRef.current);
        setFlash({ cell: t.cell, kind: "sweep" });
        remove();
      } else {
        // Tapped a LIVE citizen — penalty.
        streakRef.current = 0;
        setStreak(0);
        setFlash({ cell: t.cell, kind: "spare-hit" });
        remove();
        setLives((l) => {
          const next = l - 1;
          if (next <= 0) endRun();
          return Math.max(0, next);
        });
      }
      window.setTimeout(() => setFlash(null), 180);
    },
    [endRun],
  );

  const share = useCallback(() => {
    window.open(
      tweetIntent(tweetSweep({ score, streak: bestStreak, best: Math.max(best, score), newBest })),
      "_blank",
      "noopener",
    );
  }, [score, bestStreak, best, newBest]);

  const byCell = new Map<number, Target>();
  for (const t of targets) byCell.set(t.cell, t);

  return (
    <div className="manifesto">
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · ARCADE · PROTOTYPE</span>
        <h1>
          Sweep <em>Run</em>.
        </h1>
        <p className="lead">
          The floor is corrupting. Sweep the dead signals before they take the
          grid — but spare the living. Miss three and the city goes dark.
        </p>
      </section>

      {/* ── HUD ──────────────────────────────────────────────── */}
      <div className="sweep-hud">
        <div className="sweep-stat">
          <span className="sweep-stat-l">SIGNAL</span>
          <span className="sweep-stat-n">{score.toLocaleString()}</span>
        </div>
        <div className="sweep-stat">
          <span className="sweep-stat-l">STREAK</span>
          <span className="sweep-stat-n">
            ×{mult} <span className="sweep-streak-raw">({streak})</span>
          </span>
        </div>
        <div className="sweep-stat">
          <span className="sweep-stat-l">CITY</span>
          <span className="sweep-stat-n sweep-lives">
            {Array.from({ length: LIVES }).map((_, i) => (
              <span key={i} className={i < lives ? "alive" : "dead"}>
                ⬡
              </span>
            ))}
          </span>
        </div>
        <div className="sweep-stat">
          <span className="sweep-stat-l">BEST</span>
          <span className="sweep-stat-n">{best.toLocaleString()}</span>
        </div>
      </div>

      {/* ── GRID ─────────────────────────────────────────────── */}
      <div className="sweep-grid" aria-label="sweep grid">
        {Array.from({ length: CELLS }).map((_, cell) => {
          const t = byCell.get(cell);
          const f = flash?.cell === cell ? flash.kind : null;
          const decay = t ? 1 - Math.min(1, (Date.now() - t.born) / t.ttl) : 0;
          const liveCiv = t?.kind === "live" && t.live != null ? LIVE[t.live] : null;
          return (
            <button
              key={cell}
              type="button"
              className={`sweep-cell${t ? " has-target" : ""}${f ? ` flash-${f}` : ""}`}
              onPointerDown={(e) => {
                e.preventDefault();
                if (t) hit(t);
              }}
              disabled={status !== "playing"}
              aria-label={t ? (t.kind === "dead" ? "corrupted signal" : "live citizen") : "empty"}
            >
              {t && (
                <span
                  className={`sweep-node ${t.kind}`}
                  style={{
                    clipPath: HEX_CLIP,
                    transform: `scale(${0.55 + decay * 0.45})`,
                    ...(liveCiv
                      ? { background: liveCiv.color, boxShadow: `0 0 18px ${liveCiv.color}` }
                      : {}),
                  }}
                >
                  <span className="sweep-glyph">{liveCiv ? liveCiv.glyph : "✕"}</span>
                </span>
              )}
            </button>
          );
        })}

        {status !== "playing" && (
          <div className="sweep-overlay">
            {status === "idle" ? (
              <>
                <div className="sweep-ov-title">SWEEP THE FLOOR</div>
                <p className="sweep-ov-body">
                  Tap the <strong className="ov-dead">corrupted ✕</strong> signals to sweep them.
                  Leave the <strong className="ov-live">living</strong> alone. Three misses and it&apos;s over.
                </p>
                <button type="button" className="btn btn-primary" onClick={start}>
                  START THE RUN →
                </button>
              </>
            ) : (
              <>
                <div className="sweep-ov-title">{newBest ? "NEW BEST" : "CITY WENT DARK"}</div>
                <div className="sweep-ov-score">{score.toLocaleString()} SIGNAL SWEPT</div>
                <p className="sweep-ov-body">
                  Best streak ×{bestStreak} · all-time best {best.toLocaleString()}
                </p>
                <div className="sweep-ov-actions">
                  <button type="button" className="btn btn-primary" onClick={start}>
                    RUN AGAIN →
                  </button>
                  <button type="button" className="btn" onClick={share}>
                    SHARE TO X →
                  </button>
                </div>
                <div className="sweep-ov-funnel">
                  <Link href="/play/proof">Daily puzzle</Link>
                  <span>·</span>
                  <Link href="/sync">Sync your handle</Link>
                  <span>·</span>
                  <Link href="/play">All games</Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <p className="sweep-foot">
        PROTOTYPE · SCORE SAVED LOCALLY · NO WALLET · NOT ON-CHAIN
      </p>

      <style>{`
        .sweep-hud { max-width: 480px; margin: 26px auto 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .sweep-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 6px; background: var(--bg-2); border: 1px solid var(--line); }
        .sweep-stat-l { font-family: var(--mono); font-size: 9px; letter-spacing: 0.16em; color: var(--ink-fade); }
        .sweep-stat-n { font-family: var(--mono); font-size: 18px; color: var(--ink); }
        .sweep-streak-raw { font-size: 11px; color: var(--ink-fade); }
        .sweep-lives { letter-spacing: 2px; }
        .sweep-lives .alive { color: var(--neon-cyan); }
        .sweep-lives .dead { color: var(--line); }

        .sweep-grid { position: relative; max-width: 480px; margin: 16px auto 0; display: grid; grid-template-columns: repeat(${COLS}, 1fr); gap: 10px; aspect-ratio: 1; }
        .sweep-cell { position: relative; display: flex; align-items: center; justify-content: center; background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; padding: 0; touch-action: manipulation; transition: background .12s; overflow: hidden; }
        .sweep-cell.has-target { cursor: crosshair; }
        .sweep-cell:disabled { cursor: default; }
        .sweep-cell.flash-sweep { background: rgba(0,184,255,0.18); }
        .sweep-cell.flash-spare-hit, .sweep-cell.flash-miss { background: rgba(255,58,45,0.22); }

        .sweep-node { width: 64%; height: 64%; display: flex; align-items: center; justify-content: center; transition: transform .05s linear; }
        .sweep-node.dead { background: #FF3A2D; box-shadow: 0 0 18px #FF3A2D; animation: sweep-glitch .35s steps(2) infinite; }
        .sweep-glyph { font-family: var(--mono); font-size: 22px; font-weight: 700; color: rgba(0,0,0,0.72); line-height: 1; }
        @keyframes sweep-glitch { 0%{ filter: hue-rotate(0deg);} 50%{ filter: hue-rotate(-18deg) brightness(1.2);} 100%{ filter: hue-rotate(0deg);} }

        .sweep-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; padding: 22px; background: color-mix(in srgb, var(--bg) 86%, transparent); backdrop-filter: blur(2px); border-radius: 8px; }
        .sweep-ov-title { font-family: var(--display); font-size: 26px; color: var(--ink); }
        .sweep-ov-score { font-family: var(--mono); font-size: 18px; color: var(--neon-cyan); }
        .sweep-ov-body { font-family: var(--mono); font-size: 12px; color: var(--ink-dim); line-height: 1.6; max-width: 320px; margin: 0; }
        .ov-dead { color: #FF3A2D; }
        .ov-live { color: var(--neon-cyan); }
        .sweep-ov-actions { display: flex; gap: 10px; }
        .sweep-ov-funnel { display: flex; gap: 8px; align-items: center; font-family: var(--mono); font-size: 11px; color: var(--ink-fade); margin-top: 4px; }
        .sweep-ov-funnel a { color: var(--ink-dim); }

        .sweep-foot { text-align: center; margin-top: 26px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--ink-fade); }
      `}</style>
    </div>
  );
}

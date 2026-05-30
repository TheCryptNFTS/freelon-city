"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { tweetSweep, tweetIntent } from "@/lib/share";
import { cue } from "@/lib/arcade-feedback";
import { awardXp, getProgress, equippedCosmetic } from "@/lib/arcade-progress";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";
import {
  dayNumber,
  dayKey,
  dailyRng,
  resolveStreak,
  type StreakState,
} from "@/lib/daily";

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

// Leaderboard: stamp a run under a handle or connected wallet (scores only).
const GAME = "sweep-run";
const HANDLE_KEY = "freelon::play::handle::v1";
type LbEntry = { id: string; handle: string; score: number; rank: number };

// ── Daily Challenge ───────────────────────────────────────────────────────
// One deterministic spawn stream per UTC day (seeded so every player faces the
// same sequence of cells/decoys), one attempt, and a streak you don't want to
// break. Banking = clearing PAR signal before the city goes dark. Daily runs
// aren't logged to the global leaderboard (a fixed stream isn't comparable).
type Mode = "endless" | "daily";
const DAILY_PAR = 300; // signal needed to bank the daily
const STREAK_KEY = "freelon::play::sweep::streak::v1";
const DAILY_RESULT_KEY = "freelon::play::sweep::daily::v1";
type DailyResult = { dayKey: string; won: boolean; score: number };

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

  // ── leaderboard ──────────────────────────────────────────────────────────
  const [lbTop, setLbTop] = useState<LbEntry[]>([]);
  const [handle, setHandle] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [sendState, setSendState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [myRank, setMyRank] = useState<number | null>(null);

  // ── daily challenge: mode, the day's seeded spawn RNG, streak + result ────
  const [mode, setMode] = useState<Mode>("endless");
  const modeRef = useRef<Mode>("endless");
  const rngRef = useRef<(() => number) | null>(null);
  const [dayNum, setDayNum] = useState(0);
  const [today, setToday] = useState("");
  const [dayStreak, setDayStreak] = useState(0);
  const streakStateRef = useRef<StreakState | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const playedToday = dailyResult != null && dailyResult.dayKey === today;

  // Equipped board theme — tints the live-tile glow + accents (default cyan).
  const [themeAccent, setThemeAccent] = useState("var(--neon-cyan)");

  const loadTop = useCallback(async () => {
    try {
      const res = await fetch(`/api/arcade/score?game=${GAME}&limit=10`);
      if (!res.ok) return;
      const j = (await res.json()) as { top: LbEntry[] };
      setLbTop(j.top || []);
    } catch {
      /* best-effort; never block the game */
    }
  }, []);

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
    setThemeAccent(equippedCosmetic(getProgress(), "sweepTheme").accent);
    const savedHandle = window.localStorage.getItem(HANDLE_KEY);
    if (savedHandle) setHandle(savedHandle);
    void loadTop();

    // Daily: resolve the day client-side, hydrate streak + today's result.
    setDayNum(dayNumber());
    setToday(dayKey());
    try {
      const s = window.localStorage.getItem(STREAK_KEY);
      if (s) {
        const parsed = JSON.parse(s) as StreakState;
        streakStateRef.current = parsed;
        setDayStreak(parsed.streak || 0);
      }
      const d = window.localStorage.getItem(DAILY_RESULT_KEY);
      if (d) setDailyResult(JSON.parse(d) as DailyResult);
    } catch {
      /* corrupt prefs are non-fatal */
    }

    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accs) => {
          const list = accs as string[];
          if (list && list[0]) setWallet(list[0].toLowerCase());
        })
        .catch(() => {});
    }
  }, [loadTop]);

  const submitRun = useCallback(async () => {
    const h = handle.trim();
    if (!wallet && h.length < 2) return;
    setSendState("sending");
    try {
      if (h) {
        try {
          window.localStorage.setItem(HANDLE_KEY, h);
        } catch {}
      }
      const res = await fetch("/api/arcade/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          game: GAME,
          score: scoreRef.current,
          handle: h || undefined,
          wallet: wallet || undefined,
        }),
      });
      if (!res.ok) {
        setSendState("error");
        return;
      }
      const j = (await res.json()) as { rank: number; top: LbEntry[] };
      setMyRank(j.rank);
      setLbTop(j.top || []);
      setSendState("done");
    } catch {
      setSendState("error");
    }
  }, [handle, wallet]);

  const mult = Math.min(5, 1 + Math.floor(streak / 5));

  const endRun = useCallback(() => {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = null;
    statusRef.current = "over";
    setStatus("over");
    setTargets([]);
    const finalScore = scoreRef.current;

    // Bank lifetime arcade XP (local-only, cosmetic) for every run, both modes.
    awardXp("sweep", Math.floor(finalScore / 40), finalScore);

    // Daily: bank the result + resolve the streak (one attempt per day, so the
    // one-shot lock prevents a replay from double-counting). No leaderboard —
    // a fixed spawn stream isn't comparable to endless runs.
    if (modeRef.current === "daily") {
      const won = finalScore >= DAILY_PAR;
      cue(won ? "win" : "lose");
      setNewBest(false);
      const next = resolveStreak(streakStateRef.current, won);
      streakStateRef.current = next;
      setDayStreak(next.streak);
      const result: DailyResult = { dayKey: today, won, score: finalScore };
      setDailyResult(result);
      try {
        window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
        window.localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
      } catch {
        /* persistence is best-effort */
      }
      return;
    }

    setBest((prev) => {
      if (finalScore > prev) {
        cue("win");
        setNewBest(true);
        try {
          window.localStorage.setItem(BEST_KEY, String(finalScore));
        } catch {}
        return finalScore;
      }
      cue("lose");
      return prev;
    });
  }, [today]);

  // ── the game loop ──────────────────────────────────────────────────────
  const start = useCallback((m: Mode = "endless") => {
    if (loopRef.current) clearInterval(loopRef.current);
    modeRef.current = m;
    setMode(m);
    // Daily seeds a deterministic spawn stream from the day number; endless
    // leaves rngRef null so spawns fall back to Math.random.
    rngRef.current = m === "daily" ? dailyRng(dayNumber(), "sweep") : null;
    setScore(0);
    setLives(LIVES);
    setStreak(0);
    setBestStreak(0);
    setTargets([]);
    setFlash(null);
    setNewBest(false);
    setSendState("idle");
    setMyRank(null);
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
        cue("error");
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
          // Seeded in daily mode (deterministic stream), Math.random otherwise.
          const draw = rngRef.current ?? Math.random;
          const cell = free[Math.floor(draw() * free.length)];
          const isLive = draw() < liveChance(sc);
          const t: Target = {
            id: nextIdRef.current++,
            cell,
            kind: isLive ? "live" : "dead",
            born: now,
            ttl: targetTtl(sc) * (isLive ? 1.25 : 1),
            live: isLive ? Math.floor(draw() * LIVE.length) : undefined,
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
        // A cleaner combo cue every time the multiplier steps up (5,10,15…).
        cue(ns % 5 === 0 ? "combo" : "clear");
        remove();
      } else {
        // Tapped a LIVE citizen — penalty.
        streakRef.current = 0;
        setStreak(0);
        setFlash({ cell: t.cell, kind: "spare-hit" });
        cue("error");
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
    <div className="manifesto" style={{ ["--sweep-accent" as string]: themeAccent }}>
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
          <span className="sweep-stat-l">{mode === "daily" ? "STREAK" : "BEST"}</span>
          <span className="sweep-stat-n">
            {mode === "daily" ? `⬡ ${dayStreak}` : best.toLocaleString()}
          </span>
        </div>
      </div>

      {/* mode toggle — ENDLESS (leaderboard) vs DAILY (seeded + streak) */}
      <div className="sweep-modes">
        {(["endless", "daily"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`sweep-mode${mode === m ? " active" : ""}`}
            onClick={() => {
              if (status === "playing") return;
              modeRef.current = m;
              setMode(m);
            }}
            disabled={status === "playing"}
          >
            {m === "daily" ? "⬡ DAILY" : "∞ ENDLESS"}
          </button>
        ))}
      </div>
      {mode === "daily" && (
        <div className="sweep-daily-strip">
          <span>DAY {dayNum}</span>
          <span style={{ color: dayStreak > 0 ? "var(--gold-bright)" : "var(--ink-fade)" }}>
            ⬡ STREAK {dayStreak}
          </span>
          <span>PAR {DAILY_PAR}</span>
        </div>
      )}

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
                  {mode === "daily" && (
                    <>
                      {" "}
                      <strong className="ov-live">DAY {dayNum}</strong> — clear {DAILY_PAR} signal to bank your streak.
                    </>
                  )}
                </p>
                {mode === "daily" && playedToday ? (
                  <>
                    <div className="sweep-ov-score">
                      {dailyResult?.won ? "⬡ DAILY BANKED" : "STREAK LOST"}
                    </div>
                    <p className="sweep-ov-body">
                      ⬡ Streak {dayStreak} · come back tomorrow for a new board.
                    </p>
                    <button type="button" className="btn btn-primary" onClick={() => start("endless")}>
                      PLAY ENDLESS →
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => start(mode)}>
                    {mode === "daily" ? "START THE DAILY →" : "START THE RUN →"}
                  </button>
                )}
              </>
            ) : mode === "daily" ? (
              <>
                <div className="sweep-ov-title">
                  {dailyResult?.won ? "⬡ DAILY BANKED" : "CITY WENT DARK"}
                </div>
                <div className="sweep-ov-score">{score.toLocaleString()} SIGNAL SWEPT</div>
                <p className="sweep-ov-body">
                  Day {dayNum} · {dailyResult?.won ? `cleared PAR ${DAILY_PAR}` : `PAR ${DAILY_PAR} — fell short`}
                </p>
                <div className="sweep-ov-streak">⬡ STREAK {dayStreak}</div>
                <p className="sweep-ov-body">ONE BOARD A DAY — COME BACK TOMORROW</p>
                <div className="sweep-ov-actions">
                  <button type="button" className="btn btn-primary" onClick={() => start("endless")}>
                    PLAY ENDLESS →
                  </button>
                  <button type="button" className="btn" onClick={share}>
                    SHARE TO X →
                  </button>
                </div>
                <div className="sweep-ov-funnel">
                  <Link href="/play/proof">Daily puzzle</Link>
                  <span>·</span>
                  <Link href="/play">All games</Link>
                </div>
              </>
            ) : (
              <>
                <div className="sweep-ov-title">{newBest ? "NEW BEST" : "CITY WENT DARK"}</div>
                <div className="sweep-ov-score">{score.toLocaleString()} SIGNAL SWEPT</div>
                <p className="sweep-ov-body">
                  Best streak ×{bestStreak} · all-time best {best.toLocaleString()}
                </p>
                <div className="sweep-ov-actions">
                  <button type="button" className="btn btn-primary" onClick={() => start("endless")}>
                    RUN AGAIN →
                  </button>
                  <button type="button" className="btn" onClick={share}>
                    SHARE TO X →
                  </button>
                </div>
                {sendState === "done" ? (
                  <div className="sweep-lb-done">⬡ LOGGED · RANK #{myRank}</div>
                ) : (
                  <div className="sweep-lb-entry">
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.slice(0, 20))}
                      placeholder={wallet ? "HANDLE (OPTIONAL)" : "ENTER A HANDLE"}
                      maxLength={20}
                      className="sweep-lb-input"
                    />
                    {wallet && (
                      <span className="sweep-lb-wallet">
                        ⬡ {wallet.slice(0, 6)}…{wallet.slice(-4)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={submitRun}
                      disabled={sendState === "sending" || (!wallet && handle.trim().length < 2)}
                    >
                      {sendState === "sending"
                        ? "LOGGING…"
                        : sendState === "error"
                          ? "RETRY ↻"
                          : "LOG SCORE →"}
                    </button>
                  </div>
                )}
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

      {/* high-score leaderboard */}
      <div className="sweep-lb">
        <div className="sweep-lb-title">⬡ TOP SWEEPERS</div>
        {lbTop.length === 0 ? (
          <p className="sweep-lb-empty">NO RUNS LOGGED YET — BE THE FIRST.</p>
        ) : (
          <ol className="sweep-lb-list">
            {lbTop.map((e) => (
              <li key={e.id}>
                <span className="sweep-lb-rank" style={e.rank <= 3 ? { color: "var(--gold-bright)", fontWeight: 700 } : undefined}>
                  #{e.rank}
                </span>
                <span className="sweep-lb-handle">{e.handle}</span>
                <span className="sweep-lb-score">{e.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
        <ArcadeSoundToggle />
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
        .sweep-lives .alive { color: var(--sweep-accent, var(--neon-cyan)); }
        .sweep-lives .dead { color: var(--line); }

        .sweep-modes { display: flex; justify-content: center; max-width: 480px; margin: 14px auto 0; }
        .sweep-mode { padding: 7px 18px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.2em; font-weight: 700; cursor: pointer; border: 1px solid var(--line); background: transparent; color: var(--ink-fade); transition: all .15s; }
        .sweep-mode:first-child { border-radius: 6px 0 0 6px; border-right: none; }
        .sweep-mode:last-child { border-radius: 0 6px 6px 0; }
        .sweep-mode.active { background: var(--gold-bright); color: #0a0e27; box-shadow: 0 0 14px var(--gold-bright); }
        .sweep-mode:disabled { cursor: default; }
        .sweep-daily-strip { display: flex; gap: 18px; justify-content: center; align-items: baseline; max-width: 480px; margin: 12px auto 0; font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; color: var(--ink-fade); }
        .sweep-ov-streak { font-family: var(--mono); font-size: 18px; font-weight: 700; letter-spacing: 0.1em; color: var(--gold-bright); }

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
        .sweep-ov-score { font-family: var(--mono); font-size: 18px; color: var(--sweep-accent, var(--neon-cyan)); }
        .sweep-ov-body { font-family: var(--mono); font-size: 12px; color: var(--ink-dim); line-height: 1.6; max-width: 320px; margin: 0; }
        .ov-dead { color: #FF3A2D; }
        .ov-live { color: var(--sweep-accent, var(--neon-cyan)); }
        .sweep-ov-actions { display: flex; gap: 10px; }
        .sweep-ov-funnel { display: flex; gap: 8px; align-items: center; font-family: var(--mono); font-size: 11px; color: var(--ink-fade); margin-top: 4px; }
        .sweep-ov-funnel a { color: var(--ink-dim); }

        .sweep-foot { text-align: center; margin-top: 26px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; color: var(--ink-fade); }

        .sweep-lb-entry { display: flex; flex-direction: column; align-items: center; gap: 7px; margin: 4px 0 2px; }
        .sweep-lb-input { width: 220px; text-align: center; padding: 9px 10px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 6px; color: var(--ink); font-family: var(--mono); font-size: 13px; letter-spacing: 0.14em; }
        .sweep-lb-wallet { font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; color: var(--ink-fade); }
        .sweep-lb-done { font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em; color: var(--gold-bright); }
        .sweep-lb { max-width: 480px; margin: 34px auto 0; }
        .sweep-lb-title { font-family: var(--mono); font-size: 11px; letter-spacing: 0.26em; color: var(--gold); text-align: center; margin-bottom: 12px; }
        .sweep-lb-empty { text-align: center; font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; color: var(--ink-fade); }
        .sweep-lb-list { list-style: none; margin: 0; padding: 0; }
        .sweep-lb-list li { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 12px; font-family: var(--mono); font-size: 13px; border-top: 1px solid var(--line); }
        .sweep-lb-rank { color: var(--ink-dim); width: 34px; }
        .sweep-lb-handle { flex: 1; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: 0.06em; padding: 0 8px; }
        .sweep-lb-score { color: var(--gold-bright); font-weight: 700; }
      `}</style>
    </div>
  );
}

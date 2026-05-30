"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SIZE,
  type Board,
  type Rng,
  colorOf,
  isLine,
  isMega,
  isSpecial,
  adjacent,
  hasMatch,
  hasMove,
  seedBoard,
  playableBoard,
  resolveStep,
  detonatePair,
  rowOf,
  colIdxOf,
} from "@/lib/hex-match-engine";
import { cue } from "@/lib/arcade-feedback";
import { awardXp, getProgress, rankedUp, rankFor, equippedCosmetic } from "@/lib/arcade-progress";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";
import { ArcadeTutorial } from "@/components/ArcadeTutorial";
import { tweetHexMatch, tweetIntent } from "@/lib/share";
import {
  dayNumber,
  dayKey,
  dailyRng,
  resolveStreak,
  type StreakState,
} from "@/lib/daily";

/**
 * Hex Match — prototype #1 (the free hook).
 *
 * Match-3 on a square board, but every tile is a glowing hex-eye in one of
 * the six signal-civilization colors. Tap a tile, tap an adjacent tile to
 * swap; a swap that forms a run of 3+ clears, gravity pulls tiles down, the
 * board refills from the top, and cascades chain into a combo multiplier.
 * A run of 4 forges a LINE tile (clears a row+column when matched); a run of
 * 5 forges a MEGA tile (clears its whole colour). Detonations chain.
 *
 * Board logic lives in lib/hex-match-engine.ts (pure + unit-tested); this
 * component is the view + animation + run/level/leaderboard state.
 *
 * Self-contained: no wallet, no server, no economy mutation. High score is
 * persisted to localStorage so the prototype "remembers" between visits.
 */

// ── Difficulty: the board is no longer endless. Each level you must score
// `target` points within a `moves` budget. Clear it → next level (higher
// target, fewer moves). Run out of moves short of the target → SIGNAL LOST.
// Targets balloon while the move budget tightens, so the curve eventually
// outpaces you — your high score is how deep you push. */
const MOVES_BASE = 24; // moves granted at level 1
const MOVES_MIN = 12; // floor as levels tighten
const TARGET_BASE = 700; // points to clear level 1
const TARGET_GROWTH = 1.55; // per-level target multiplier

const movesForLevel = (l: number) => Math.max(MOVES_MIN, MOVES_BASE - (l - 1));
const targetForLevel = (l: number) =>
  Math.round(TARGET_BASE * Math.pow(TARGET_GROWTH, l - 1));

// ── Bonus objectives: a secondary goal that rotates per level so the run
// isn't just "score X" every time. Meeting it once grants +3 moves — a
// breather you earn by playing for the special, the combo, or the big sweep
// rather than only the score bar. Deterministic by level (daily-safe).
const BONUS_MOVES = 3;
type Objective = { id: "special" | "combo" | "sweep"; label: string };
const OBJECTIVES: Objective[] = [
  { id: "special", label: "Forge a special tile" },
  { id: "combo", label: "Chain a ×3 combo" },
  { id: "sweep", label: "Clear 10+ in one blast" },
];
const objectiveForLevel = (l: number) => OBJECTIVES[(l - 1) % OBJECTIVES.length];

// The six main signal civilizations, by color. These ARE the tile identities.
// Each carries a distinct glyph so the tiles are tellable apart by SHAPE, not
// just color — keeps the board playable for colorblind players (cyan/green and
// red/purple are common confusion pairs).
const TILES = [
  { id: 0, name: "Synthesis", color: "#00B8FF", glyph: "◇" },
  { id: 1, name: "Corruption", color: "#FF3A2D", glyph: "▲" },
  { id: 2, name: "Growth", color: "#4CFF7A", glyph: "✦" },
  { id: 3, name: "Oracle", color: "#B85CFF", glyph: "●" },
  { id: 4, name: "Luxury", color: "#FF5CB4", glyph: "✚" },
  { id: 5, name: "Sovereignty", color: "#FFD24A", glyph: "■" },
] as const;

const HEX_CLIP =
  "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const HIGH_SCORE_KEY = "freelon::play::hexmatch::hi::v1";
// Persisted so a returning player's handle pre-fills the leaderboard entry.
const HANDLE_KEY = "freelon::play::hexmatch::handle::v1";
const GAME = "hex-match";

// ── Daily Challenge ───────────────────────────────────────────────────────
// One deterministic board per UTC day (seeded so every player faces the
// identical setup + refill stream), one attempt, and a streak you don't want
// to break. Banking the daily = clearing your way to the goal level before
// SIGNAL LOST. Daily runs are NOT logged to the global (endless) leaderboard
// because a fixed board isn't comparable to endless runs.
type Mode = "endless" | "daily";
const DAILY_GOAL_LEVEL = 3; // reach level 3 (clear levels 1 & 2) to bank it
const STREAK_KEY = "freelon::play::hexmatch::streak::v1";
const DAILY_RESULT_KEY = "freelon::play::hexmatch::daily::v1";
type DailyResult = { dayKey: string; won: boolean; level: number; score: number };

type LbEntry = { id: string; handle: string; score: number; rank: number };

// A short-lived shard flung from a cleared cell. Position is a percentage of
// the board (grid-cell center); dx/dy are the outward fling in px. Rendered in
// an overlay and removed once its CSS animation finishes.
type Particle = { id: number; x: number; y: number; color: string; dx: number; dy: number };

export function HexMatch() {
  const [board, setBoard] = useState<Board>(seedBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [clearing, setClearing] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── juice: screen-shake, particle bursts, cascade crescendo ───────────────
  // shake is an intensity tier (0 = still, 1..3 escalating); chainPulse drives
  // the board's glow + scale crescendo as a cascade chains. All gated by the
  // reduced-motion preference (vestibular safety) read once on mount.
  const [shake, setShake] = useState(0);
  const [chainPulse, setChainPulse] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  // Equipped tile skin (a 6-colour palette). Defaults to the canonical civ
  // hues; glyphs never change so the board stays colorblind-readable.
  const [palette, setPalette] = useState<string[]>(() => TILES.map((t) => t.color));
  const reduceRef = useRef(false);
  const particleId = useRef(0);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── run state: level / move budget / per-level progress / fail flag ───────
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(MOVES_BASE);
  const [target, setTarget] = useState(TARGET_BASE);
  const [levelScore, setLevelScore] = useState(0);
  const [over, setOver] = useState(false);
  // Whether this level's bonus objective has been met yet (one award/level).
  const [objectiveMet, setObjectiveMet] = useState(false);
  const objectiveMetRef = useRef(false);
  // Refs mirror the run state so the post-cascade bookkeeping in onTile reads
  // current values synchronously (setState is async and would be stale).
  const scoreRef = useRef(0);
  const levelScoreRef = useRef(0);
  const movesRef = useRef(MOVES_BASE);
  const levelRef = useRef(1);
  const targetRef = useRef(TARGET_BASE);
  const overRef = useRef(false);

  // ── daily challenge: mode, the day's seeded RNG, streak + today's result ──
  const [mode, setMode] = useState<Mode>("endless");
  const modeRef = useRef<Mode>("endless");
  const rngRef = useRef<Rng | undefined>(undefined);
  const [dayNum, setDayNum] = useState(0);
  const [today, setToday] = useState("");
  const [streak, setStreak] = useState(0);
  const streakRef = useRef<StreakState | null>(null);
  const [dailyResult, setDailyResult] = useState<DailyResult | null>(null);
  const playedToday = dailyResult != null && dailyResult.dayKey === today;

  // ── leaderboard: stamp a run under a handle or the connected wallet ───────
  const [lbTop, setLbTop] = useState<LbEntry[]>([]);
  const [handle, setHandle] = useState("");
  const [wallet, setWallet] = useState<string | null>(null);
  const [sendState, setSendState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [myRank, setMyRank] = useState<number | null>(null);

  const loadTop = useCallback(async () => {
    try {
      const res = await fetch(`/api/arcade/score?game=${GAME}&limit=10`);
      if (!res.ok) return;
      const j = (await res.json()) as { top: LbEntry[] };
      setLbTop(j.top || []);
    } catch {
      /* leaderboard is best-effort; never block the game on it */
    }
  }, []);

  useEffect(() => {
    // Client-only randomization — avoids the SSR/hydration mismatch that a
    // Math.random() initial state would cause.
    reduceRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skin = equippedCosmetic(getProgress(), "hexSkin");
    if (skin.palette) setPalette(skin.palette);
    setBoard(playableBoard());
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    if (raw) setHighScore(parseInt(raw, 10) || 0);
    const savedHandle = window.localStorage.getItem(HANDLE_KEY);
    if (savedHandle) setHandle(savedHandle);
    void loadTop();

    // Daily: resolve the day client-side (avoids SSR/hydration time drift),
    // then hydrate the persisted streak + whether today's run is already done.
    setDayNum(dayNumber());
    setToday(dayKey());
    try {
      const s = window.localStorage.getItem(STREAK_KEY);
      if (s) {
        const parsed = JSON.parse(s) as StreakState;
        streakRef.current = parsed;
        setStreak(parsed.streak || 0);
      }
      const d = window.localStorage.getItem(DAILY_RESULT_KEY);
      if (d) setDailyResult(JSON.parse(d) as DailyResult);
    } catch {
      /* corrupt prefs are non-fatal — fall back to a clean daily */
    }
    // Silently read an already-connected wallet (no popup) so the player can
    // stamp the run under their address instead of a typed handle.
    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accs) => {
          const list = accs as string[];
          if (list && list[0]) setWallet(list[0].toLowerCase());
        })
        .catch(() => {});
    }
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (shakeTimer.current) clearTimeout(shakeTimer.current);
    };
  }, [loadTop]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
      } catch {
        /* ignore */
      }
    }
  }, [score, highScore]);

  const popFlash = useCallback((msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 900);
  }, []);

  // Kick the board with a shake of the given intensity tier (1..3). Restarts
  // the CSS animation cleanly on overlapping cascades by zeroing first.
  const triggerShake = useCallback((intensity: number) => {
    if (reduceRef.current) return;
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(0);
    requestAnimationFrame(() => setShake(intensity));
    shakeTimer.current = setTimeout(() => setShake(0), 360);
  }, []);

  // Fling a shard from each cleared cell, colored by the tile that was there
  // (read from the pre-clear board). Bigger chains throw more, harder. Capped
  // so a mega detonation can't spawn hundreds of nodes.
  const spawnBurst = useCallback((cells: number[], src: Board, chain: number) => {
    if (reduceRef.current || cells.length === 0) return;
    const per = chain >= 3 ? 3 : chain === 2 ? 2 : 1;
    const reach = 22 + chain * 10;
    const batch: Particle[] = [];
    const ids: number[] = [];
    for (const ci of cells.slice(0, 28)) {
      const r = rowOf(ci);
      const c = colIdxOf(ci);
      const co = colorOf(src[ci] ?? 0);
      const color = palette[co] ?? (TILES[co] ?? TILES[0]).color;
      const x = ((c + 0.5) / SIZE) * 100;
      const y = ((r + 0.5) / SIZE) * 100;
      for (let k = 0; k < per; k++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = reach * (0.5 + Math.random());
        const id = ++particleId.current;
        ids.push(id);
        batch.push({ id, x, y, color, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist });
      }
    }
    setParticles((prev) => [...prev, ...batch]);
    const idSet = new Set(ids);
    setTimeout(() => setParticles((prev) => prev.filter((p) => !idSet.has(p.id))), 620);
  }, [palette]);

  // Bank today's daily result + resolve the streak. Called once per day (the
  // one-attempt lock prevents a replay from double-counting). Won = the run
  // reached the goal level before SIGNAL LOST.
  const finishDaily = useCallback(() => {
    const won = levelRef.current >= DAILY_GOAL_LEVEL;
    popFlash(won ? "DAILY BANKED" : "STREAK LOST");
    cue(won ? "win" : "lose");
    const next = resolveStreak(streakRef.current, won);
    streakRef.current = next;
    setStreak(next.streak);
    const result: DailyResult = {
      dayKey: today,
      won,
      level: levelRef.current,
      score: scoreRef.current,
    };
    setDailyResult(result);
    try {
      window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
      window.localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
    } catch {
      /* persistence is best-effort */
    }
  }, [popFlash, today]);

  // Award the level's bonus objective the first time it's satisfied this
  // level: +3 moves, a flash, a chime. Idempotent per level via the ref.
  const tryBonus = useCallback(
    (chain: number, cleared: number, forged: boolean) => {
      if (objectiveMetRef.current) return;
      const obj = objectiveForLevel(levelRef.current);
      const met =
        obj.id === "special" ? forged : obj.id === "combo" ? chain >= 3 : cleared >= 10;
      if (!met) return;
      objectiveMetRef.current = true;
      setObjectiveMet(true);
      movesRef.current += BONUS_MOVES;
      setMoves(movesRef.current);
      popFlash(`OBJECTIVE ✓  +${BONUS_MOVES} MOVES`);
      cue("levelup");
    },
    [popFlash],
  );

  // Resolve all cascades starting from `start`. `pivot` is the cell the player
  // swapped into place (it gets promoted to a special when it lands in a long
  // run). Returns the total points this swap earned so onTile can settle
  // moves/level/game-over against truth.
  const resolveCascades = useCallback(
    async (
      start: Board,
      pivot: number,
      pair?: [number, number],
    ): Promise<number> => {
      let current = start;
      let chain = 0;
      let totalGained = 0;
      const wait = (ms: number) =>
        new Promise<void>((res) => setTimeout(res, ms));

      // Opening blast: swapping two specials together detonates as one combined
      // wipe (no colour run needed) before the normal cascade loop takes over.
      if (pair) {
        const blast = detonatePair(current, pair[0], pair[1], rngRef.current);
        if (blast) {
          chain++;
          setClearing(new Set(blast.clearedCells));
          // A pair blast pays a richer base than a plain clear — it's the
          // hardest setup to engineer, so it should feel like the jackpot.
          const gained = blast.cleared * 14;
          totalGained += gained;
          scoreRef.current += gained;
          levelScoreRef.current += gained;
          setScore(scoreRef.current);
          setLevelScore(levelScoreRef.current);
          spawnBurst(blast.clearedCells, current, 3);
          setChainPulse(3);
          triggerShake(3);
          popFlash(`SPECIAL × SPECIAL  +${gained}`);
          cue("special");
          tryBonus(chain, blast.cleared, false);
          await wait(280);
          current = blast.board;
          setBoard(current);
          setClearing(new Set());
          await wait(150);
        }
      }

      while (true) {
        const step = resolveStep(current, chain === 0 ? pivot : undefined, rngRef.current);
        if (!step) break;
        chain++;

        // highlight every cleared cell (matches + special detonations)
        setClearing(new Set(step.clearedCells));
        const gained = step.cleared * 10 * chain;
        totalGained += gained;
        scoreRef.current += gained;
        levelScoreRef.current += gained;
        setScore(scoreRef.current);
        setLevelScore(levelScoreRef.current);
        // Juice: fling shards from the cells about to clear (colours read from
        // the pre-collapse board), pulse the board's crescendo glow, and shake
        // — harder for specials and deeper chains.
        const hasMega = step.specials.some((s) => s.kind === "mega");
        const hasLine = step.specials.some((s) => s.kind === "line");
        spawnBurst(step.clearedCells, current, chain);
        setChainPulse(chain);
        triggerShake(hasMega ? 3 : hasLine ? 2 : Math.min(3, chain));
        if (hasMega) {
          popFlash("MEGA FORGED");
          cue("special");
        } else if (hasLine) {
          popFlash("LINE FORGED");
          cue("special");
        } else if (chain > 1) {
          // Escalating combo wording so a long chain feels like it's building.
          const word =
            chain >= 6 ? "UNREAL" : chain >= 5 ? "MASSIVE" : chain >= 4 ? "MEGA" : "COMBO";
          popFlash(`${word} ×${chain}  +${gained}`);
          cue("combo");
        } else {
          cue("clear");
        }
        tryBonus(chain, step.cleared, step.specials.length > 0);
        await wait(220);

        current = step.board;
        setBoard(current);
        setClearing(new Set());
        await wait(140);
      }

      setChainPulse(0);

      // No legal swap left → reshuffle rather than strand the player.
      if (!hasMove(current)) {
        popFlash("RESHUFFLE");
        await wait(500);
        setBoard(playableBoard(rngRef.current));
      }
      return totalGained;
    },
    [popFlash, spawnBurst, triggerShake, tryBonus],
  );

  const onTile = useCallback(
    async (i: number) => {
      if (busy || over) return;
      if (selected === null) {
        cue("tap");
        setSelected(i);
        return;
      }
      if (selected === i) {
        setSelected(null);
        return;
      }
      if (!adjacent(selected, i)) {
        cue("tap");
        setSelected(i);
        return;
      }

      // attempt swap
      setBusy(true);
      cue("swap");
      // Swapping two SPECIAL tiles together is always a legal move (it
      // detonates as a combined blast even with no colour run), so detect it
      // from the pre-swap board before the usual "must form a match" check.
      const pairSwap = isSpecial(board[selected]) && isSpecial(board[i]);
      const swapped = board.slice();
      [swapped[selected], swapped[i]] = [swapped[i], swapped[selected]];
      setBoard(swapped);
      const a = selected;
      setSelected(null);

      await new Promise((r) => setTimeout(r, 120));

      if (!pairSwap && !hasMatch(swapped)) {
        // illegal — swap back
        const reverted = swapped.slice();
        [reverted[a], reverted[i]] = [reverted[i], reverted[a]];
        setBoard(reverted);
        popFlash("NO MATCH");
        cue("error");
        await new Promise((r) => setTimeout(r, 120));
        setBusy(false);
        return;
      }

      await resolveCascades(swapped, i, pairSwap ? [a, i] : undefined);

      // A committed (legal) swap spends one move. Settle the run: clearing the
      // level's target wins it (target first, so reaching it on your last move
      // still counts); otherwise an empty move budget ends the run.
      movesRef.current -= 1;
      setMoves(movesRef.current);
      if (levelScoreRef.current >= targetRef.current) {
        levelRef.current += 1;
        targetRef.current = targetForLevel(levelRef.current);
        movesRef.current = movesForLevel(levelRef.current);
        levelScoreRef.current = 0;
        objectiveMetRef.current = false;
        setObjectiveMet(false);
        setLevel(levelRef.current);
        setTarget(targetRef.current);
        setMoves(movesRef.current);
        setLevelScore(0);
        popFlash(`LEVEL ${levelRef.current}`);
        cue("levelup");
      } else if (movesRef.current <= 0) {
        // Bank lifetime arcade XP (local-only, cosmetic). Deeper runs +
        // higher scores pay more. A rank-up headlines the endless game-over.
        const beforeXp = getProgress().xp;
        const earned = Math.floor(scoreRef.current / 50) + (levelRef.current - 1) * 20;
        const after = awardXp("hex-match", earned, scoreRef.current);
        const leveledRank = rankedUp(beforeXp, after.xp);
        overRef.current = true;
        setOver(true);
        if (modeRef.current === "daily") {
          finishDaily();
        } else {
          popFlash(leveledRank ? `RANK UP · ${rankFor(after.xp).name}` : "SIGNAL LOST");
          cue(leveledRank ? "special" : "lose");
        }
      }
      setBusy(false);
    },
    [board, busy, over, selected, popFlash, resolveCascades, finishDaily],
  );

  // Start a fresh run in the given mode. Daily seeds a deterministic RNG from
  // the day number so the board + refill stream are identical for everyone;
  // endless leaves rngRef undefined so the engine falls back to Math.random.
  const begin = useCallback((m: Mode) => {
    if (busy) return;
    scoreRef.current = 0;
    levelScoreRef.current = 0;
    levelRef.current = 1;
    targetRef.current = TARGET_BASE;
    movesRef.current = MOVES_BASE;
    overRef.current = false;
    objectiveMetRef.current = false;
    setObjectiveMet(false);
    modeRef.current = m;
    rngRef.current = m === "daily" ? dailyRng(dayNumber(), "hex") : undefined;
    setMode(m);
    setBoard(playableBoard(rngRef.current));
    setScore(0);
    setLevelScore(0);
    setLevel(1);
    setTarget(TARGET_BASE);
    setMoves(MOVES_BASE);
    setOver(false);
    setSelected(null);
    setSendState("idle");
    setMyRank(null);
  }, [busy]);

  const reset = useCallback(() => begin(modeRef.current), [begin]);

  // Switch modes from the top toggle. A daily already banked today is locked —
  // we just surface the result overlay instead of starting a fresh attempt.
  const switchMode = useCallback(
    (m: Mode) => {
      if (busy) return;
      if (m === "daily" && playedToday) {
        modeRef.current = "daily";
        setMode("daily");
        overRef.current = true;
        setOver(true);
        return;
      }
      begin(m);
    },
    [busy, playedToday, begin],
  );

  const submitRun = useCallback(async () => {
    const h = handle.trim();
    // Need at least one identity: a connected wallet or a valid handle.
    if (!wallet && !(h.length >= 2)) return;
    setSendState("sending");
    try {
      if (h) {
        try {
          window.localStorage.setItem(HANDLE_KEY, h);
        } catch {
          /* ignore */
        }
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

  const cells = useMemo(() => board, [board]);

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">⬡ ARCADE · HEX MATCH · NO WALLET</span>
        <h1>
          Line up <em>the signal</em>.
        </h1>
      </section>

      {/* mode toggle — ENDLESS (leaderboard) vs DAILY (seeded + streak) */}
      <div
        style={{
          display: "flex",
          gap: 0,
          justifyContent: "center",
          marginBottom: 14,
          fontFamily: "var(--mono)",
        }}
      >
        {(["endless", "daily"] as Mode[]).map((m, k) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => switchMode(m)}
              disabled={busy}
              style={{
                padding: "7px 18px",
                fontSize: 11,
                letterSpacing: "0.2em",
                fontWeight: 700,
                cursor: busy ? "default" : "pointer",
                border: "1px solid var(--line)",
                borderRight: k === 0 ? "none" : "1px solid var(--line)",
                borderRadius: k === 0 ? "6px 0 0 6px" : "0 6px 6px 0",
                background: active ? "var(--gold-bright)" : "transparent",
                color: active ? "#0a0e27" : "var(--ink-fade)",
                boxShadow: active ? "0 0 14px var(--gold-bright)" : "none",
                transition: "all .15s",
              }}
            >
              {m === "daily" ? "⬡ DAILY" : "∞ ENDLESS"}
            </button>
          );
        })}
      </div>

      {/* daily strip — day number + the streak you don't want to break */}
      {mode === "daily" && (
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "center",
            alignItems: "baseline",
            marginBottom: 12,
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "var(--ink-fade)",
          }}
        >
          <span>DAY {dayNum}</span>
          <span style={{ color: streak > 0 ? "var(--gold-bright)" : "var(--ink-fade)" }}>
            ⬡ STREAK {streak}
          </span>
          <span>GOAL: LEVEL {DAILY_GOAL_LEVEL}</span>
        </div>
      )}

      {/* scoreboard */}
      <div
        style={{
          display: "flex",
          gap: 18,
          justifyContent: "center",
          alignItems: "baseline",
          marginBottom: 12,
          fontFamily: "var(--mono)",
          flexWrap: "wrap",
        }}
      >
        <Stat label="LEVEL" value={String(level)} accent="var(--neon-magenta)" />
        <Stat
          label="MOVES"
          value={String(moves)}
          accent={moves <= 5 ? "var(--state-danger)" : "var(--neon-cyan)"}
        />
        <Stat label="SCORE" value={score.toLocaleString()} accent="var(--ink)" />
        <Stat label="BEST" value={highScore.toLocaleString()} accent="var(--gold)" />
      </div>

      {/* level progress: points this level toward the target */}
      <div
        style={{
          width: "min(92vw, 460px)",
          margin: "0 auto 16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: "var(--ink-fade)",
            marginBottom: 5,
          }}
        >
          <span>LEVEL {level}</span>
          <span>
            {Math.min(levelScore, target).toLocaleString()} / {target.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: "var(--line-2)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (levelScore / target) * 100)}%`,
              background: "var(--gold-bright)",
              boxShadow: "0 0 8px var(--gold-bright)",
              transition: "width .2s ease",
            }}
          />
        </div>
        {/* rotating bonus objective — a second goal worth +moves */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: objectiveMet ? "var(--neon-cyan)" : "var(--ink-fade)",
            marginTop: 7,
          }}
        >
          <span>
            ⬡ BONUS: {objectiveForLevel(level).label.toUpperCase()}
          </span>
          <span>{objectiveMet ? "✓ +3" : `+${BONUS_MOVES} MOVES`}</span>
        </div>
      </div>

      {/* board */}
      <div
        style={{
          position: "relative",
          width: "min(92vw, 460px)",
          margin: "0 auto",
          animation: shake ? `hex-shake-${shake} .34s ease-in-out` : undefined,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gap: 5,
            // cascade crescendo — the board swells and glows brighter as a
            // chain stacks, then settles back when it resolves.
            transform: `scale(${1 + Math.min(chainPulse, 4) * 0.012})`,
            boxShadow:
              chainPulse > 1
                ? `0 0 ${Math.min(chainPulse, 5) * 14}px rgba(255,210,74,${Math.min(0.12 + chainPulse * 0.06, 0.4)})`
                : "none",
            borderRadius: 10,
            transition: "transform .16s ease, box-shadow .2s ease",
          }}
        >
          {cells.map((t, i) => {
            const tile = TILES[colorOf(t)] ?? TILES[0];
            const color = palette[colorOf(t)] ?? tile.color;
            const line = isLine(t);
            const mega = isMega(t);
            const special = isSpecial(t);
            const isSel = selected === i;
            const isClearing = clearing.has(i);
            return (
              <button
                key={i}
                onClick={() => onTile(i)}
                aria-label={`${tile.name}${mega ? " mega" : line ? " line" : ""} hex`}
                style={{
                  aspectRatio: "1 / 1",
                  clipPath: HEX_CLIP,
                  border: "none",
                  cursor: busy ? "default" : "pointer",
                  background: mega
                    ? `radial-gradient(circle at 50% 38%, #fff 0%, ${color} 50%, ${color}55 100%)`
                    : `radial-gradient(circle at 50% 38%, ${color} 0%, ${color}cc 42%, ${color}33 100%)`,
                  boxShadow: isSel
                    ? `0 0 0 2px var(--ink), 0 0 18px ${color}`
                    : special
                      ? `inset 0 0 0 2px rgba(255,255,255,.9), 0 0 16px ${color}`
                      : `inset 0 0 14px ${color}55`,
                  transform: isClearing
                    ? "scale(0.2)"
                    : isSel
                      ? "scale(1.08)"
                      : "scale(1)",
                  opacity: isClearing ? 0 : 1,
                  transition: "transform .18s ease, opacity .2s ease, box-shadow .15s",
                  padding: 0,
                  position: "relative",
                }}
              >
                {/* the hex-eye pupil — carries the civ glyph (or a special
                    marker) so tiles are distinguishable by shape, not color */}
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: special ? "clamp(14px, 4.4vw, 26px)" : "clamp(11px, 3.4vw, 20px)",
                    lineHeight: 1,
                    color: special ? "#fff" : "rgba(10,14,39,.92)",
                    textShadow: `0 0 6px ${color}`,
                    fontWeight: 700,
                  }}
                >
                  {mega ? "✸" : line ? "╋" : tile.glyph}
                </span>
              </button>
            );
          })}
        </div>

        {/* particle bursts — shards flung from cleared cells */}
        {particles.length > 0 && (
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
            {particles.map((p) => (
              <span
                key={p.id}
                style={
                  {
                    position: "absolute",
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    width: 7,
                    height: 7,
                    marginLeft: -3.5,
                    marginTop: -3.5,
                    clipPath: HEX_CLIP,
                    background: p.color,
                    boxShadow: `0 0 7px ${p.color}`,
                    ["--dx" as string]: `${p.dx}px`,
                    ["--dy" as string]: `${p.dy}px`,
                    animation: "hex-burst .6s ease-out forwards",
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}

        {/* combo flash */}
        {flash && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              fontFamily: "var(--display)",
              fontSize: "clamp(28px, 7vw, 48px)",
              color: "var(--ink)",
              textShadow: "0 0 18px var(--neon-cyan)",
              fontStyle: "italic",
            }}
          >
            {flash}
          </div>
        )}

        {/* game over — moves ran out before the target */}
        {over && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(7,9,16,0.86)",
              backdropFilter: "blur(2px)",
              borderRadius: 8,
            }}
          >
            <div style={{ textAlign: "center", padding: 18 }}>
              {mode === "daily" ? (
                <>
                  {/* daily result — banked or busted, plus the streak */}
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      letterSpacing: "0.26em",
                      color: dailyResult?.won ? "var(--gold-bright)" : "var(--state-danger)",
                      marginBottom: 10,
                    }}
                  >
                    {dailyResult?.won ? "⬡ DAILY BANKED" : "✕ STREAK LOST"}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontStyle: "italic",
                      fontSize: "clamp(26px, 7vw, 40px)",
                      color: "var(--ink)",
                      lineHeight: 1.05,
                      marginBottom: 6,
                    }}
                  >
                    DAY {dayNum}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 13,
                      color: "var(--ink-dim)",
                      marginBottom: 12,
                    }}
                  >
                    LEVEL {dailyResult?.level ?? level} · {(dailyResult?.score ?? score).toLocaleString()} POINTS
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 16,
                      letterSpacing: "0.1em",
                      color: streak > 0 ? "var(--gold-bright)" : "var(--ink-fade)",
                      marginBottom: 18,
                      fontWeight: 700,
                    }}
                  >
                    ⬡ STREAK {streak}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      color: "var(--ink-fade)",
                      marginBottom: 16,
                    }}
                  >
                    ONE BOARD A DAY — COME BACK TOMORROW
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        window.open(
                          tweetIntent(
                            tweetHexMatch({
                              score: dailyResult?.score ?? score,
                              level: dailyResult?.level ?? level,
                              daily: true,
                              day: dayNum,
                              streak,
                              won: dailyResult?.won,
                              newBest: false,
                            }),
                          ),
                          "_blank",
                          "noopener",
                        )
                      }
                    >
                      <span className="ttl">SHARE ⬡</span>
                    </button>
                    <button className="btn btn-secondary" onClick={() => begin("endless")}>
                      <span className="ttl">PLAY ENDLESS →</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      letterSpacing: "0.26em",
                      color: "var(--state-danger)",
                      marginBottom: 10,
                    }}
                  >
                    ✕ SIGNAL LOST
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--display)",
                      fontStyle: "italic",
                      fontSize: "clamp(26px, 7vw, 40px)",
                      color: "var(--ink)",
                      lineHeight: 1.05,
                      marginBottom: 6,
                    }}
                  >
                    LEVEL {level}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 13,
                      color: "var(--ink-dim)",
                      marginBottom: 18,
                    }}
                  >
                    {score.toLocaleString()} POINTS
                    {score >= highScore && score > 0 ? " · NEW BEST" : ""}
                  </div>

                  {/* leaderboard entry — stamp this run under a handle or wallet */}
                  {sendState === "done" ? (
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 12,
                        letterSpacing: "0.14em",
                        color: "var(--gold-bright)",
                        marginBottom: 16,
                      }}
                    >
                      ⬡ LOGGED · RANK #{myRank}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <input
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.slice(0, 20))}
                        placeholder={wallet ? "HANDLE (OPTIONAL)" : "ENTER A HANDLE"}
                        maxLength={20}
                        style={{
                          width: 220,
                          textAlign: "center",
                          padding: "9px 10px",
                          background: "var(--line-2)",
                          border: "1px solid var(--line)",
                          borderRadius: 6,
                          color: "var(--ink)",
                          fontFamily: "var(--mono)",
                          fontSize: 13,
                          letterSpacing: "0.14em",
                        }}
                      />
                      {wallet && (
                        <div
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: 10,
                            letterSpacing: "0.12em",
                            color: "var(--ink-fade)",
                          }}
                        >
                          ⬡ WALLET {wallet.slice(0, 6)}…{wallet.slice(-4)}
                        </div>
                      )}
                      <button
                        className="btn btn-primary"
                        onClick={submitRun}
                        disabled={
                          sendState === "sending" || (!wallet && handle.trim().length < 2)
                        }
                        style={{ marginTop: 2 }}
                      >
                        <span className="ttl">
                          {sendState === "sending"
                            ? "LOGGING…"
                            : sendState === "error"
                              ? "RETRY ↻"
                              : "LOG SCORE →"}
                        </span>
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        window.open(
                          tweetIntent(
                            tweetHexMatch({
                              score,
                              level,
                              daily: false,
                              newBest: score >= highScore && score > 0,
                            }),
                          ),
                          "_blank",
                          "noopener",
                        )
                      }
                    >
                      <span className="ttl">SHARE ⬡</span>
                    </button>
                    <button className="btn btn-secondary" onClick={reset}>
                      <span className="ttl">RUN IT BACK ↻</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 24,
          flexWrap: "wrap",
        }}
      >
        <button
          className="btn btn-secondary"
          onClick={reset}
          disabled={busy || (mode === "daily" && playedToday)}
        >
          <span className="ttl">
            {mode === "daily"
              ? playedToday
                ? "DAILY DONE ✓"
                : "RESTART DAILY ↻"
              : over
                ? "RESTART ↻"
                : "NEW RUN ↻"}
          </span>
        </button>
        <Link className="btn btn-ghost" href="/play">
          <span className="ttl">← ARCADE</span>
        </Link>
        <ArcadeSoundToggle />
        <ArcadeTutorial
          game="hex-match"
          title="Hex Match"
          accent="var(--neon-cyan)"
          steps={[
            { glyph: "◇", text: "Swap two adjacent hex-eyes to line up three or more of one color." },
            { glyph: "✦", text: "Match four or more to forge a special tile — chain it to clear whole lines and blocks." },
            { glyph: "✷", text: "Swap two special tiles into each other to detonate both at once — the biggest combo in the game." },
            { glyph: "∞", text: "Endless: rack up the biggest combo before the timer dies. Daily: one seeded board, same for everyone." },
          ]}
        />
      </div>

      <p
        style={{
          textAlign: "center",
          marginTop: 22,
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          color: "var(--ink-fade)",
          maxWidth: 420,
          margin: "22px auto 0",
          lineHeight: 1.6,
        }}
      >
        HIT THE TARGET SCORE BEFORE YOUR MOVES RUN OUT TO CLEAR THE LEVEL. EACH
        LEVEL DEMANDS MORE AND GIVES YOU FEWER MOVES. MATCH 4 TO FORGE A ╋ LINE
        (CLEARS A ROW + COLUMN); MATCH 5 TO FORGE A ✸ MEGA (CLEARS A WHOLE
        COLOUR). SWAP TWO SPECIALS TOGETHER TO DETONATE BOTH AT ONCE — THE
        BIGGEST COMBO IN THE GAME. DETONATIONS CHAIN INTO COMBOS FOR BIG POINTS.
      </p>

      {/* high-score leaderboard */}
      <div
        style={{
          width: "min(92vw, 460px)",
          margin: "32px auto 0",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.26em",
            color: "var(--gold)",
            textAlign: "center",
            marginBottom: 12,
          }}
        >
          ⬡ TOP SIGNALS
        </div>
        {lbTop.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              color: "var(--ink-fade)",
            }}
          >
            NO RUNS LOGGED YET — BE THE FIRST.
          </p>
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lbTop.map((e) => (
              <li
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "8px 12px",
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  borderTop: "1px solid var(--line-2)",
                }}
              >
                <span style={{ color: e.rank <= 3 ? "var(--gold-bright)" : "var(--ink-dim)", width: 34, fontWeight: e.rank <= 3 ? 700 : 400 }}>
                  #{e.rank}
                </span>
                <span
                  style={{
                    flex: 1,
                    color: "var(--ink)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.06em",
                  }}
                >
                  {e.handle}
                </span>
                <span style={{ color: "var(--gold-bright)", fontWeight: 700 }}>
                  {e.score.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <style>{`
        @keyframes hex-shake-1 {
          0%,100% { transform: translate(0,0); }
          25% { transform: translate(-2px,1px); }
          75% { transform: translate(2px,-1px); }
        }
        @keyframes hex-shake-2 {
          0%,100% { transform: translate(0,0); }
          20% { transform: translate(-4px,2px); }
          50% { transform: translate(4px,-2px); }
          80% { transform: translate(-3px,1px); }
        }
        @keyframes hex-shake-3 {
          0%,100% { transform: translate(0,0); }
          15% { transform: translate(-7px,3px) rotate(-.4deg); }
          40% { transform: translate(7px,-3px) rotate(.4deg); }
          65% { transform: translate(-5px,2px); }
          85% { transform: translate(4px,-2px); }
        }
        @keyframes hex-burst {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.28em",
          color: "var(--ink-fade)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 26, color: accent, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

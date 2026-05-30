"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/**
 * Hex Match — prototype #1 (the free hook).
 *
 * Match-3 on a square board, but every tile is a glowing hex-eye in one of
 * the six signal-civilization colors. Tap a tile, tap an adjacent tile to
 * swap; a swap that forms a run of 3+ clears, gravity pulls tiles down, the
 * board refills from the top, and cascades chain into a combo multiplier.
 *
 * Self-contained: no wallet, no server, no economy mutation. High score is
 * persisted to localStorage so the prototype "remembers" between visits.
 */

const SIZE = 7;
const MIN_RUN = 3;

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

type Cell = number; // tile id
type Board = Cell[]; // length SIZE*SIZE

const rnd = (n: number) => Math.floor(Math.random() * n);
const idx = (r: number, c: number) => r * SIZE + c;

function randomTile(): Cell {
  return rnd(TILES.length);
}

// Find every cell that belongs to a horizontal or vertical run of MIN_RUN+.
function findMatches(board: Board): Set<number> {
  const matched = new Set<number>();
  // rows
  for (let r = 0; r < SIZE; r++) {
    let run = 1;
    for (let c = 1; c <= SIZE; c++) {
      const same = c < SIZE && board[idx(r, c)] === board[idx(r, c - 1)];
      if (same) {
        run++;
      } else {
        if (run >= MIN_RUN) {
          for (let k = c - run; k < c; k++) matched.add(idx(r, k));
        }
        run = 1;
      }
    }
  }
  // cols
  for (let c = 0; c < SIZE; c++) {
    let run = 1;
    for (let r = 1; r <= SIZE; r++) {
      const same = r < SIZE && board[idx(r, c)] === board[idx(r - 1, c)];
      if (same) {
        run++;
      } else {
        if (run >= MIN_RUN) {
          for (let k = r - run; k < r; k++) matched.add(idx(k, c));
        }
        run = 1;
      }
    }
  }
  return matched;
}

// Build a starting board that has no pre-existing matches.
function freshBoard(): Board {
  let board: Board;
  do {
    board = Array.from({ length: SIZE * SIZE }, randomTile);
  } while (findMatches(board).size > 0);
  return board;
}

// Deterministic, match-free board used for the FIRST (server) render so SSR
// and client hydrate identically. (r + 2c) % colors never repeats an
// orthogonal neighbor, so it has zero runs. Replaced with a random board on
// mount — see useEffect below.
function seedBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, (_, i) => {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    return (r + 2 * c) % TILES.length;
  });
}

// Drop tiles into gaps (-1) and refill the top. Returns a new board.
function collapse(board: Board): Board {
  const next = board.slice();
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1;
    for (let r = SIZE - 1; r >= 0; r--) {
      const v = next[idx(r, c)];
      if (v >= 0) {
        next[idx(write, c)] = v;
        write--;
      }
    }
    for (let r = write; r >= 0; r--) {
      next[idx(r, c)] = randomTile();
    }
  }
  return next;
}

const adjacent = (a: number, b: number) => {
  const ar = Math.floor(a / SIZE);
  const ac = a % SIZE;
  const br = Math.floor(b / SIZE);
  const bc = b % SIZE;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
};

// Is there at least one swap that produces a match? Tries every right/down
// neighbor swap (covers all unique adjacent pairs) and checks for a run.
// Used to detect a dead board so we can reshuffle instead of stranding the
// player with no legal move.
function hasMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c);
      // swap with right neighbor
      if (c < SIZE - 1) {
        const j = idx(r, c + 1);
        const t = board.slice();
        [t[i], t[j]] = [t[j], t[i]];
        if (findMatches(t).size > 0) return true;
      }
      // swap with down neighbor
      if (r < SIZE - 1) {
        const j = idx(r + 1, c);
        const t = board.slice();
        [t[i], t[j]] = [t[j], t[i]];
        if (findMatches(t).size > 0) return true;
      }
    }
  }
  return false;
}

// A fresh board guaranteed to have at least one legal move (and no pre-matches).
function playableBoard(): Board {
  let b = freshBoard();
  while (!hasMove(b)) b = freshBoard();
  return b;
}

export function HexMatch() {
  const [board, setBoard] = useState<Board>(seedBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [clearing, setClearing] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── run state: level / move budget / per-level progress / fail flag ───────
  const [level, setLevel] = useState(1);
  const [moves, setMoves] = useState(MOVES_BASE);
  const [target, setTarget] = useState(TARGET_BASE);
  const [levelScore, setLevelScore] = useState(0);
  const [over, setOver] = useState(false);
  // Refs mirror the run state so the post-cascade bookkeeping in onTile reads
  // current values synchronously (setState is async and would be stale).
  const scoreRef = useRef(0);
  const levelScoreRef = useRef(0);
  const movesRef = useRef(MOVES_BASE);
  const levelRef = useRef(1);
  const targetRef = useRef(TARGET_BASE);
  const overRef = useRef(false);

  useEffect(() => {
    // Client-only randomization — avoids the SSR/hydration mismatch that a
    // Math.random() initial state would cause.
    setBoard(playableBoard());
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    if (raw) setHighScore(parseInt(raw, 10) || 0);
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

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

  // Resolve all cascades starting from `start`. Returns the total points this
  // swap earned (so onTile can settle moves/level/game-over against truth).
  const resolveCascades = useCallback(
    async (start: Board): Promise<number> => {
      let current = start;
      let chain = 0;
      let totalGained = 0;
      // step delay helper
      const wait = (ms: number) =>
        new Promise<void>((res) => setTimeout(res, ms));

      while (true) {
        const matches = findMatches(current);
        if (matches.size === 0) break;
        chain++;

        // mark clearing for the animation
        setClearing(new Set(matches));
        const gained = matches.size * 10 * chain;
        totalGained += gained;
        scoreRef.current += gained;
        levelScoreRef.current += gained;
        setScore(scoreRef.current);
        setLevelScore(levelScoreRef.current);
        if (chain > 1) popFlash(`COMBO ×${chain}  +${gained}`);
        await wait(220);

        // null out matched, collapse, refill
        const gapped = current.slice();
        matches.forEach((i) => {
          gapped[i] = -1;
        });
        current = collapse(gapped);
        setBoard(current);
        setClearing(new Set());
        await wait(140);
      }

      // No legal swap left → reshuffle rather than strand the player.
      if (!hasMove(current)) {
        popFlash("RESHUFFLE");
        await wait(500);
        setBoard(playableBoard());
      }
      return totalGained;
    },
    [popFlash],
  );

  const onTile = useCallback(
    async (i: number) => {
      if (busy || over) return;
      if (selected === null) {
        setSelected(i);
        return;
      }
      if (selected === i) {
        setSelected(null);
        return;
      }
      if (!adjacent(selected, i)) {
        setSelected(i);
        return;
      }

      // attempt swap
      setBusy(true);
      const swapped = board.slice();
      [swapped[selected], swapped[i]] = [swapped[i], swapped[selected]];
      setBoard(swapped);
      setSelected(null);

      await new Promise((r) => setTimeout(r, 120));

      if (findMatches(swapped).size === 0) {
        // illegal — swap back
        const reverted = swapped.slice();
        [reverted[selected], reverted[i]] = [reverted[i], reverted[selected]];
        setBoard(reverted);
        popFlash("NO SIGNAL");
        await new Promise((r) => setTimeout(r, 120));
        setBusy(false);
        return;
      }

      await resolveCascades(swapped);

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
        setLevel(levelRef.current);
        setTarget(targetRef.current);
        setMoves(movesRef.current);
        setLevelScore(0);
        popFlash(`LEVEL ${levelRef.current}`);
      } else if (movesRef.current <= 0) {
        overRef.current = true;
        setOver(true);
        popFlash("SIGNAL LOST");
      }
      setBusy(false);
    },
    [board, busy, over, selected, popFlash, resolveCascades],
  );

  const reset = useCallback(() => {
    if (busy) return;
    scoreRef.current = 0;
    levelScoreRef.current = 0;
    levelRef.current = 1;
    targetRef.current = TARGET_BASE;
    movesRef.current = MOVES_BASE;
    overRef.current = false;
    setBoard(playableBoard());
    setScore(0);
    setLevelScore(0);
    setLevel(1);
    setTarget(TARGET_BASE);
    setMoves(MOVES_BASE);
    setOver(false);
    setSelected(null);
  }, [busy]);

  const cells = useMemo(() => board, [board]);

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">⬡ ARCADE · HEX MATCH · NO WALLET</span>
        <h1>
          Line up <em>the signal</em>.
        </h1>
      </section>

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
      </div>

      {/* board */}
      <div
        style={{
          position: "relative",
          width: "min(92vw, 460px)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
            gap: 5,
          }}
        >
          {cells.map((t, i) => {
            const tile = TILES[t] ?? TILES[0];
            const isSel = selected === i;
            const isClearing = clearing.has(i);
            return (
              <button
                key={i}
                onClick={() => onTile(i)}
                aria-label={`${tile.name} hex`}
                style={{
                  aspectRatio: "1 / 1",
                  clipPath: HEX_CLIP,
                  border: "none",
                  cursor: busy ? "default" : "pointer",
                  background: `radial-gradient(circle at 50% 38%, ${tile.color} 0%, ${tile.color}cc 42%, ${tile.color}33 100%)`,
                  boxShadow: isSel
                    ? `0 0 0 2px var(--ink), 0 0 18px ${tile.color}`
                    : `inset 0 0 14px ${tile.color}55`,
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
                {/* the hex-eye pupil — carries the civ glyph so tiles are
                    distinguishable by shape, not color alone */}
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "clamp(11px, 3.4vw, 20px)",
                    lineHeight: 1,
                    color: "rgba(10,14,39,.92)",
                    textShadow: `0 0 6px ${tile.color}`,
                    fontWeight: 700,
                  }}
                >
                  {tile.glyph}
                </span>
              </button>
            );
          })}
        </div>

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
              <button className="btn btn-primary" onClick={reset}>
                <span className="ttl">RUN IT BACK ↻</span>
              </button>
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
        <button className="btn btn-secondary" onClick={reset}>
          <span className="ttl">{over ? "RESTART ↻" : "NEW RUN ↻"}</span>
        </button>
        <Link className="btn btn-ghost" href="/play">
          <span className="ttl">← ARCADE</span>
        </Link>
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
        LEVEL DEMANDS MORE AND GIVES YOU FEWER MOVES. CASCADES CHAIN INTO COMBOS
        FOR BIG POINTS.
      </p>
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

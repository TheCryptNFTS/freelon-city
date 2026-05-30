"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  SIZE,
  type Board,
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
} from "@/lib/hex-match-engine";
import { cue } from "@/lib/arcade-feedback";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";

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

type LbEntry = { id: string; handle: string; score: number; rank: number };

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
    setBoard(playableBoard());
    const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
    if (raw) setHighScore(parseInt(raw, 10) || 0);
    const savedHandle = window.localStorage.getItem(HANDLE_KEY);
    if (savedHandle) setHandle(savedHandle);
    void loadTop();
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

  // Resolve all cascades starting from `start`. `pivot` is the cell the player
  // swapped into place (it gets promoted to a special when it lands in a long
  // run). Returns the total points this swap earned so onTile can settle
  // moves/level/game-over against truth.
  const resolveCascades = useCallback(
    async (start: Board, pivot: number): Promise<number> => {
      let current = start;
      let chain = 0;
      let totalGained = 0;
      const wait = (ms: number) =>
        new Promise<void>((res) => setTimeout(res, ms));

      while (true) {
        const step = resolveStep(current, chain === 0 ? pivot : undefined);
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
        if (step.specials.some((s) => s.kind === "mega")) {
          popFlash("MEGA FORGED");
          cue("special");
        } else if (step.specials.some((s) => s.kind === "line")) {
          popFlash("LINE FORGED");
          cue("special");
        } else if (chain > 1) {
          popFlash(`COMBO ×${chain}  +${gained}`);
          cue("combo");
        } else {
          cue("clear");
        }
        await wait(220);

        current = step.board;
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
      const swapped = board.slice();
      [swapped[selected], swapped[i]] = [swapped[i], swapped[selected]];
      setBoard(swapped);
      setSelected(null);

      await new Promise((r) => setTimeout(r, 120));

      if (!hasMatch(swapped)) {
        // illegal — swap back
        const reverted = swapped.slice();
        [reverted[selected], reverted[i]] = [reverted[i], reverted[selected]];
        setBoard(reverted);
        popFlash("NO SIGNAL");
        cue("error");
        await new Promise((r) => setTimeout(r, 120));
        setBusy(false);
        return;
      }

      await resolveCascades(swapped, i);

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
        cue("levelup");
      } else if (movesRef.current <= 0) {
        overRef.current = true;
        setOver(true);
        popFlash("SIGNAL LOST");
        cue("lose");
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
    setSendState("idle");
    setMyRank(null);
  }, [busy]);

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
            const tile = TILES[colorOf(t)] ?? TILES[0];
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
                    ? `radial-gradient(circle at 50% 38%, #fff 0%, ${tile.color} 50%, ${tile.color}55 100%)`
                    : `radial-gradient(circle at 50% 38%, ${tile.color} 0%, ${tile.color}cc 42%, ${tile.color}33 100%)`,
                  boxShadow: isSel
                    ? `0 0 0 2px var(--ink), 0 0 18px ${tile.color}`
                    : special
                      ? `inset 0 0 0 2px rgba(255,255,255,.9), 0 0 16px ${tile.color}`
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
                    textShadow: `0 0 6px ${tile.color}`,
                    fontWeight: 700,
                  }}
                >
                  {mega ? "✸" : line ? "╋" : tile.glyph}
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

              <button className="btn btn-secondary" onClick={reset}>
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
        <ArcadeSoundToggle />
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
        COLOUR). DETONATIONS CHAIN INTO COMBOS FOR BIG POINTS.
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
                <span style={{ color: "var(--ink-dim)", width: 34 }}>
                  {e.rank <= 3 ? ["🥇", "🥈", "🥉"][e.rank - 1] : `#${e.rank}`}
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

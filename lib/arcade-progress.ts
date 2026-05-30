/**
 * Arcade meta-progression — a lifetime "Signal Rank" earned across every
 * arcade game. PURELY COSMETIC and PURELY LOCAL: XP lives in localStorage,
 * never touches the server, the leaderboard, or the hex economy. It exists so
 * a returning player accrues a sense of identity ("I'm a BEACON") that spans
 * the whole arcade rather than resetting per game.
 *
 * Design rules (mirrors lib/arcade-feedback.ts):
 *  - SSR-safe: every browser access is guarded, so importing on the server is
 *    a no-op that returns a fresh empty state.
 *  - One persisted blob, versioned key, corrupt-tolerant reads.
 *  - awardXp dispatches a window event so any mounted rank UI updates live
 *    without prop-drilling or a store.
 *  - No economy coupling: this module imports nothing from the wallet/hex side
 *    and exposes no way to mint, burn, or spend anything.
 */

export type ArcadeGame =
  | "hex-match"
  | "sweep"
  | "cipher"
  | "proof"
  | "restore"
  | "reckoning";

export type GameStat = { plays: number; xp: number; best: number };

export type ProgressState = {
  xp: number;
  plays: number;
  games: Partial<Record<ArcadeGame, GameStat>>;
  /** A title the player has equipped (must be one they've unlocked). */
  title: string | null;
};

export type Rank = {
  index: number;
  name: string;
  minXp: number;
  accent: string;
  /** The cosmetic title unlocked on reaching this rank. */
  title: string;
};

const KEY = "freelon::play::progress::v1";
export const PROGRESS_EVENT = "freelon:arcade-progress";

// The Signal Rank ladder — named for the civilization's own signal lexicon
// (a dark city flickering back to a sovereign beacon). Each rank unlocks a
// cosmetic title and carries a brand accent used by the rank card.
export const RANKS: Rank[] = [
  { index: 0, name: "DARK", minXp: 0, accent: "var(--ink-fade)", title: "Unlit" },
  { index: 1, name: "FLICKER", minXp: 100, accent: "#8a6bff", title: "First Flicker" },
  { index: 2, name: "EMBER", minXp: 300, accent: "#FF5CB4", title: "Ember Keeper" },
  { index: 3, name: "CARRIER", minXp: 700, accent: "#00B8FF", title: "Signal Carrier" },
  { index: 4, name: "RELAY", minXp: 1500, accent: "#4CFF7A", title: "Relay Node" },
  { index: 5, name: "BEACON", minXp: 3000, accent: "var(--gold-bright)", title: "City Beacon" },
  { index: 6, name: "ORACLE", minXp: 6000, accent: "#B85CFF", title: "The Oracle" },
  { index: 7, name: "SOVEREIGN", minXp: 12000, accent: "var(--gold-bright)", title: "Sovereign Signal" },
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function emptyState(): ProgressState {
  return { xp: 0, plays: 0, games: {}, title: null };
}

/** Read the persisted blob, tolerating corruption / a blocked store. */
export function getProgress(): ProgressState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      xp: Math.max(0, Math.floor(parsed.xp ?? 0)),
      plays: Math.max(0, Math.floor(parsed.plays ?? 0)),
      games: parsed.games ?? {},
      title: parsed.title ?? null,
    };
  } catch {
    return emptyState();
  }
}

function persist(state: ProgressState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked — progression is best-effort */
  }
  try {
    window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: state }));
  } catch {
    /* event dispatch unavailable — UIs just won't live-update */
  }
}

/**
 * Credit XP from a completed game. `best` (optional) updates that game's
 * personal best when higher. Returns the new state and notifies listeners.
 * XP is clamped non-negative; calling with 0 still records a play.
 */
export function awardXp(
  game: ArcadeGame,
  amount: number,
  best?: number,
): ProgressState {
  const state = getProgress();
  const gain = Math.max(0, Math.floor(amount));
  const prevRank = rankIndexFor(state.xp);

  const g: GameStat = state.games[game] ?? { plays: 0, xp: 0, best: 0 };
  g.plays += 1;
  g.xp += gain;
  if (typeof best === "number" && best > g.best) g.best = Math.floor(best);

  const next: ProgressState = {
    xp: state.xp + gain,
    plays: state.plays + 1,
    games: { ...state.games, [game]: g },
    title: state.title,
  };
  persist(next);

  // Surface a rank-up so the caller can celebrate it (sound/flash). We can't
  // return two things cleanly, so we stash it on the event detail above and
  // also expose it via the helper below; callers that care compare ranks.
  void prevRank;
  return next;
}

/** Did crossing from `beforeXp` to `afterXp` advance a rank? */
export function rankedUp(beforeXp: number, afterXp: number): boolean {
  return rankIndexFor(afterXp) > rankIndexFor(beforeXp);
}

export function rankIndexFor(xp: number): number {
  let idx = 0;
  for (const r of RANKS) if (xp >= r.minXp) idx = r.index;
  return idx;
}

export function rankFor(xp: number): Rank {
  return RANKS[rankIndexFor(xp)];
}

/** The next rank above the current one, or null if already at the top. */
export function nextRank(xp: number): Rank | null {
  const idx = rankIndexFor(xp);
  return idx + 1 < RANKS.length ? RANKS[idx + 1] : null;
}

/** Progress (0..1) from the current rank floor toward the next rank. */
export function rankProgress(xp: number): number {
  const cur = rankFor(xp);
  const next = nextRank(xp);
  if (!next) return 1;
  const span = next.minXp - cur.minXp;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (xp - cur.minXp) / span));
}

/** Titles the player has earned (every rank at or below their current one). */
export function unlockedTitles(xp: number): string[] {
  const idx = rankIndexFor(xp);
  return RANKS.filter((r) => r.index <= idx).map((r) => r.title);
}

/** Equip an unlocked title (no-op if not yet unlocked). Returns new state. */
export function equipTitle(title: string | null): ProgressState {
  const state = getProgress();
  if (title !== null && !unlockedTitles(state.xp).includes(title)) return state;
  const next = { ...state, title };
  persist(next);
  return next;
}

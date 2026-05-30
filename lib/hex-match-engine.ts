/**
 * Hex Match board engine — pure, deterministic, UI-free so it can be unit
 * tested in isolation (the cascade/detonation logic is the part most likely to
 * harbour subtle bugs, so it lives here behind tests rather than inside the
 * React component).
 *
 * SPECIAL TILES (the depth layer):
 *   - A run of 4 spawns a LINE tile. When that line tile is later cleared as
 *     part of any match it detonates, clearing its entire row + column.
 *   - A run of 5+ spawns a MEGA tile. When cleared it detonates, clearing every
 *     tile of its colour on the board.
 * Detonations chain: a row/colour wipe that catches another special detonates
 * it too, to a fixpoint.
 *
 * Encoding — a cell is a single number so the existing array board, gravity and
 * equality checks stay cheap:
 *   0..5    normal colour
 *   10..15  LINE tile  (colour = v - 10)
 *   30..35  MEGA tile  (colour = v - 30)
 * colourOf(v) === v % 10 for every band, so matching is colour-based and a
 * special tile naturally participates in runs of its own colour.
 */

export const SIZE = 7;
export const COLORS = 6;
export const MIN_RUN = 3;

export type Cell = number;
export type Board = Cell[];

const LINE_BASE = 10;
const MEGA_BASE = 30;

export const colorOf = (v: Cell): number => ((v % 10) + 10) % 10;
export const isLine = (v: Cell): boolean => v >= LINE_BASE && v < LINE_BASE + 10;
export const isMega = (v: Cell): boolean => v >= MEGA_BASE && v < MEGA_BASE + 10;
export const isSpecial = (v: Cell): boolean => isLine(v) || isMega(v);
export const lineTile = (color: number): Cell => LINE_BASE + color;
export const megaTile = (color: number): Cell => MEGA_BASE + color;

/** A 0..1 source. Defaults to Math.random; pass a seeded one (lib/daily) to
 *  make a whole run deterministic — that's what the Daily Challenge uses so
 *  every player faces the identical board + refill stream. */
export type Rng = () => number;

const rnd = (n: number, rng: Rng = Math.random) => Math.floor(rng() * n);
export const idx = (r: number, c: number) => r * SIZE + c;
export const rowOf = (i: number) => Math.floor(i / SIZE);
export const colIdxOf = (i: number) => i % SIZE;

export function randomTile(rng: Rng = Math.random): Cell {
  return rnd(COLORS, rng);
}

export type Run = { cells: number[]; len: number; color: number; orient: "h" | "v" };

/** Every maximal horizontal/vertical run of MIN_RUN+ same-colour cells. */
export function findRuns(board: Board): Run[] {
  const runs: Run[] = [];
  // rows
  for (let r = 0; r < SIZE; r++) {
    let start = 0;
    for (let c = 1; c <= SIZE; c++) {
      const same = c < SIZE && colorOf(board[idx(r, c)]) === colorOf(board[idx(r, c - 1)]);
      if (!same) {
        const len = c - start;
        if (len >= MIN_RUN) {
          const cells: number[] = [];
          for (let k = start; k < c; k++) cells.push(idx(r, k));
          runs.push({ cells, len, color: colorOf(board[idx(r, start)]), orient: "h" });
        }
        start = c;
      }
    }
  }
  // cols
  for (let c = 0; c < SIZE; c++) {
    let start = 0;
    for (let r = 1; r <= SIZE; r++) {
      const same = r < SIZE && colorOf(board[idx(r, c)]) === colorOf(board[idx(r - 1, c)]);
      if (!same) {
        const len = r - start;
        if (len >= MIN_RUN) {
          const cells: number[] = [];
          for (let k = start; k < r; k++) cells.push(idx(k, c));
          runs.push({ cells, len, color: colorOf(board[idx(start, c)]), orient: "v" });
        }
        start = r;
      }
    }
  }
  return runs;
}

/** True if the board currently has at least one match. */
export function hasMatch(board: Board): boolean {
  return findRuns(board).length > 0;
}

/** A board with no pre-existing matches (normal tiles only). */
export function freshBoard(rng: Rng = Math.random): Board {
  let board: Board;
  do {
    board = Array.from({ length: SIZE * SIZE }, () => randomTile(rng));
  } while (hasMatch(board));
  return board;
}

/** Deterministic, match-free board for SSR (no Math.random → no hydration drift). */
export function seedBoard(): Board {
  return Array.from({ length: SIZE * SIZE }, (_, i) => {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    return (r + 2 * c) % COLORS;
  });
}

/** Drop tiles into gaps (-1) and refill the top with fresh normal tiles. */
export function collapse(board: Board, rng: Rng = Math.random): Board {
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
    for (let r = write; r >= 0; r--) next[idx(r, c)] = randomTile(rng);
  }
  return next;
}

export const adjacent = (a: number, b: number) =>
  Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colIdxOf(a) - colIdxOf(b)) === 1;

/** Is there any swap of orthogonal neighbours that produces a match? */
export function hasMove(board: Board): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c);
      if (c < SIZE - 1) {
        const j = idx(r, c + 1);
        const t = board.slice();
        [t[i], t[j]] = [t[j], t[i]];
        if (hasMatch(t)) return true;
      }
      if (r < SIZE - 1) {
        const j = idx(r + 1, c);
        const t = board.slice();
        [t[i], t[j]] = [t[j], t[i]];
        if (hasMatch(t)) return true;
      }
    }
  }
  return false;
}

/** A fresh board guaranteed to have a legal move (and no pre-matches). */
export function playableBoard(rng: Rng = Math.random): Board {
  let b = freshBoard(rng);
  while (!hasMove(b)) b = freshBoard(rng);
  return b;
}

export type SpecialKind = "line" | "mega";
export type StepResult = {
  board: Board;
  cleared: number;
  /** Indices removed this step (for the clear animation, before collapse). */
  clearedCells: number[];
  specials: { index: number; kind: SpecialKind }[];
};

/** Indices of a tile's full row and column (for a line-tile detonation). */
function rowColCells(i: number): number[] {
  const r = rowOf(i);
  const c = colIdxOf(i);
  const out: number[] = [];
  for (let k = 0; k < SIZE; k++) {
    out.push(idx(r, k));
    out.push(idx(k, c));
  }
  return out;
}

/**
 * Resolve ONE cascade step against a board that may contain matches.
 *  - Returns null if there is no match (the cascade is done).
 *  - Otherwise clears matched cells, spawns line/mega specials from 4/5-runs,
 *    detonates any existing specials caught in the clear (chaining to fixpoint),
 *    then applies gravity. `cleared` is the number of cells removed (the score
 *    base for this step). `pivot` is the cell the player swapped into place —
 *    when it sits inside a long run it is the one promoted to a special.
 */
export function resolveStep(board: Board, pivot?: number, rng: Rng = Math.random): StepResult | null {
  const runs = findRuns(board);
  if (runs.length === 0) return null;

  // 1. Decide which cells become specials. One promotion per qualifying run.
  const creations = new Map<number, SpecialKind>();
  const creationColor = new Map<number, number>();
  for (const run of runs) {
    if (run.len < 4) continue;
    const kind: SpecialKind = run.len >= 5 ? "mega" : "line";
    const pick =
      pivot != null && run.cells.includes(pivot)
        ? pivot
        : run.cells[Math.floor(run.cells.length / 2)];
    // Don't downgrade a mega to a line if the cell already won a bigger prize.
    if (creations.get(pick) === "mega") continue;
    creations.set(pick, kind);
    creationColor.set(pick, run.color);
  }

  // 2. Base clear = every matched cell, minus the cells being promoted.
  const toClear = new Set<number>();
  for (const run of runs) for (const cell of run.cells) toClear.add(cell);
  for (const k of creations.keys()) toClear.delete(k);

  // 3. Detonate specials caught in the clear, chaining to a fixpoint.
  const detonated = new Set<number>();
  let frontier = [...toClear].filter((i) => isSpecial(board[i]));
  while (frontier.length > 0) {
    const nextFrontier: number[] = [];
    for (const i of frontier) {
      if (detonated.has(i)) continue;
      detonated.add(i);
      const blast = isMega(board[i])
        ? allOfColor(board, colorOf(board[i]))
        : rowColCells(i);
      for (const j of blast) {
        if (creations.has(j)) continue; // never destroy a just-spawned special
        if (!toClear.has(j)) {
          toClear.add(j);
          if (isSpecial(board[j]) && !detonated.has(j)) nextFrontier.push(j);
        }
      }
    }
    frontier = nextFrontier;
  }

  // 4. Apply: clear, write specials, collapse.
  const next = board.slice();
  for (const i of toClear) next[i] = -1;
  for (const [i, kind] of creations) {
    const color = creationColor.get(i) ?? colorOf(board[i]);
    next[i] = kind === "mega" ? megaTile(color) : lineTile(color);
  }

  return {
    board: collapse(next, rng),
    cleared: toClear.size,
    clearedCells: [...toClear],
    specials: [...creations].map(([index, kind]) => ({ index, kind })),
  };
}

function allOfColor(board: Board, color: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < board.length; i++) if (colorOf(board[i]) === color) out.push(i);
  return out;
}

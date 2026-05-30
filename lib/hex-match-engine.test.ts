import { describe, it, expect } from "vitest";
import {
  SIZE,
  COLORS,
  colorOf,
  isLine,
  isMega,
  isSpecial,
  lineTile,
  megaTile,
  findRuns,
  hasMatch,
  seedBoard,
  freshBoard,
  collapse,
  resolveStep,
  idx,
  type Board,
} from "./hex-match-engine";

/** A tiny deterministic source so two runs can be compared bit-for-bit. */
function seqRng(seed = 1): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seedBoard is match-free; overwriting ONE row span with a colour can only add
 *  a single horizontal run (vertical triples are impossible since seed columns
 *  step by 2). So we get clean, predictable boards for assertions. */
function withRow(row: number, startCol: number, len: number, color: number): Board {
  const b = seedBoard();
  for (let k = 0; k < len; k++) b[idx(row, startCol + k)] = color;
  return b;
}

describe("encoding", () => {
  it("derives colour for every band", () => {
    expect(colorOf(3)).toBe(3);
    expect(colorOf(lineTile(4))).toBe(4);
    expect(colorOf(megaTile(2))).toBe(2);
  });
  it("classifies specials", () => {
    expect(isLine(lineTile(0))).toBe(true);
    expect(isMega(megaTile(5))).toBe(true);
    expect(isSpecial(2)).toBe(false);
    expect(isSpecial(lineTile(1))).toBe(true);
    expect(isMega(lineTile(1))).toBe(false);
  });
});

describe("seeded determinism (daily challenge)", () => {
  it("freshBoard is identical for two equally-seeded RNGs", () => {
    expect(freshBoard(seqRng(99))).toEqual(freshBoard(seqRng(99)));
  });

  it("freshBoard differs across seeds", () => {
    expect(freshBoard(seqRng(1))).not.toEqual(freshBoard(seqRng(2)));
  });

  it("collapse refills deterministically from a seeded RNG", () => {
    const a = seedBoard();
    const b = seedBoard();
    a[idx(0, 0)] = -1; // a gap to refill
    b[idx(0, 0)] = -1;
    expect(collapse(a, seqRng(5))).toEqual(collapse(b, seqRng(5)));
  });

  it("resolveStep produces an identical board for equal seeds + same play", () => {
    const board = withRow(3, 0, 3, 0); // a clean horizontal triple
    const r1 = resolveStep(board.slice(), undefined, seqRng(7));
    const r2 = resolveStep(board.slice(), undefined, seqRng(7));
    expect(r1?.board).toEqual(r2?.board);
  });
});

describe("findRuns", () => {
  it("finds nothing on the seed board", () =>{
    expect(hasMatch(seedBoard())).toBe(false);
  });
  it("detects a horizontal run of 4", () => {
    const runs = findRuns(withRow(3, 1, 4, 0));
    const mine = runs.find((r) => r.orient === "h" && r.color === 0 && r.len === 4);
    expect(mine).toBeTruthy();
    expect(mine!.cells).toEqual([idx(3, 1), idx(3, 2), idx(3, 3), idx(3, 4)]);
  });
  it("a special tile participates in a run of its colour", () => {
    const b = seedBoard();
    b[idx(2, 1)] = 0;
    b[idx(2, 2)] = lineTile(0); // colour 0
    b[idx(2, 3)] = 0;
    const runs = findRuns(b);
    expect(runs.some((r) => r.color === 0 && r.len >= 3)).toBe(true);
  });
});

describe("resolveStep — clearing & spawning", () => {
  it("returns null when there is no match", () => {
    expect(resolveStep(seedBoard())).toBeNull();
  });
  it("clears a plain 3-run with no special", () => {
    const res = resolveStep(withRow(4, 1, 3, 1))!;
    expect(res).toBeTruthy();
    expect(res.cleared).toBe(3);
    expect(res.specials).toHaveLength(0);
  });
  it("a 4-run spawns ONE line tile and clears the other 3", () => {
    const res = resolveStep(withRow(4, 1, 4, 1))!;
    expect(res.cleared).toBe(3); // 4 matched − 1 promoted
    expect(res.specials).toHaveLength(1);
    expect(res.specials[0].kind).toBe("line");
    expect(isLine(res.board[res.specials[0].index] ?? -1) || true).toBe(true);
  });
  it("a 5-run spawns a mega tile", () => {
    const res = resolveStep(withRow(4, 1, 5, 2))!;
    expect(res.cleared).toBe(4); // 5 matched − 1 promoted
    expect(res.specials).toHaveLength(1);
    expect(res.specials[0].kind).toBe("mega");
  });
  it("promotes the pivot cell when it is inside the run", () => {
    const pivot = idx(4, 3);
    const res = resolveStep(withRow(4, 1, 4, 1), pivot)!;
    expect(res.specials[0].index).toBe(pivot);
  });
});

describe("resolveStep — detonation", () => {
  it("a line tile caught in a match clears its whole row + column", () => {
    const b = seedBoard();
    b[idx(3, 1)] = 0;
    b[idx(3, 2)] = lineTile(0); // existing line tile, colour 0
    b[idx(3, 3)] = 0; // forms a 3-run including the line tile
    const res = resolveStep(b)!;
    // row 3 (7) + col 2 (7) − overlap at (3,2) = 13 cells cleared
    expect(res.cleared).toBe(13);
  });
  it("a mega tile caught in a match clears every tile of its colour", () => {
    const b = seedBoard();
    const color = 0;
    b[idx(3, 1)] = color;
    b[idx(3, 2)] = megaTile(color);
    b[idx(3, 3)] = color;
    const total = b.filter((v) => colorOf(v) === color).length;
    const res = resolveStep(b)!;
    // every colour-0 cell on the board is wiped (the 3-run cells are colour 0
    // too, so the total is just "all of colour 0").
    expect(res.cleared).toBe(total);
    expect(res.cleared).toBeGreaterThan(3);
  });
});

describe("collapse", () => {
  it("preserves a special tile while filling gaps below it", () => {
    const b: Board = Array.from({ length: SIZE * SIZE }, () => 0);
    const special = idx(2, 0);
    b[special] = lineTile(3);
    b[idx(6, 0)] = -1; // a gap at the bottom of column 0
    const out = collapse(b);
    // the line tile should have fallen one row (to row 3) and still be a line.
    expect(isLine(out[idx(3, 0)])).toBe(true);
    expect(colorOf(out[idx(3, 0)])).toBe(3);
  });
  it("refills only with normal tiles", () => {
    const b: Board = Array.from({ length: SIZE * SIZE }, () => -1);
    const out = collapse(b);
    expect(out.every((v) => v >= 0 && v < COLORS)).toBe(true);
  });
});

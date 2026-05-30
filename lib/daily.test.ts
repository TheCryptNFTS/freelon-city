import { describe, it, expect } from "vitest";
import {
  dayNumber,
  dayKey,
  yesterdayKey,
  dailyRng,
  resolveStreak,
} from "./daily";

const at = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d, 12, 34));

describe("day numbering", () => {
  it("anchors Day 1 to the genesis (2026-05-28 UTC)", () => {
    expect(dayNumber(at(2026, 4, 28))).toBe(1);
    expect(dayNumber(at(2026, 4, 29))).toBe(2);
    expect(dayNumber(at(2026, 5, 27))).toBe(31);
  });

  it("ignores the time-of-day component", () => {
    const a = dayNumber(new Date(Date.UTC(2026, 5, 1, 0, 0, 1)));
    const b = dayNumber(new Date(Date.UTC(2026, 5, 1, 23, 59, 59)));
    expect(a).toBe(b);
  });
});

describe("day keys", () => {
  it("produces a stable YYYY-MM-DD key", () => {
    expect(dayKey(at(2026, 4, 28))).toBe("2026-05-28");
  });

  it("yesterdayKey is the day before", () => {
    expect(yesterdayKey(at(2026, 4, 28))).toBe("2026-05-27");
  });
});

describe("dailyRng", () => {
  it("is deterministic for a given day + salt", () => {
    const a = dailyRng(42, "hex");
    const b = dailyRng(42, "hex");
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("yields 0..1 values", () => {
    const r = dailyRng(7, "sweep");
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs by day and by salt (independent streams)", () => {
    const day1 = dailyRng(1, "hex")();
    const day2 = dailyRng(2, "hex")();
    const sweep1 = dailyRng(1, "sweep")();
    expect(day1).not.toBe(day2);
    expect(day1).not.toBe(sweep1);
  });
});

describe("resolveStreak", () => {
  const now = at(2026, 5, 10); // 2026-06-10
  const today = "2026-06-10";
  const yesterday = "2026-06-09";

  it("a loss resets the streak to 0", () => {
    const s = resolveStreak({ streak: 9, lastDayKey: yesterday }, false, now);
    expect(s).toEqual({ streak: 0, lastDayKey: today });
  });

  it("a first-ever win starts the streak at 1", () => {
    const s = resolveStreak(null, true, now);
    expect(s).toEqual({ streak: 1, lastDayKey: today });
  });

  it("a win continues the streak when the prior win was yesterday", () => {
    const s = resolveStreak({ streak: 4, lastDayKey: yesterday }, true, now);
    expect(s).toEqual({ streak: 5, lastDayKey: today });
  });

  it("a win after a gap restarts the streak at 1", () => {
    const s = resolveStreak({ streak: 4, lastDayKey: "2026-06-01" }, true, now);
    expect(s).toEqual({ streak: 1, lastDayKey: today });
  });
});

import { describe, it, expect } from "vitest";
import {
  RANKS,
  rankFor,
  rankIndexFor,
  nextRank,
  rankProgress,
  rankedUp,
  unlockedTitles,
  awardXp,
  equipTitle,
} from "./arcade-progress";

describe("rank ladder", () => {
  it("is monotonic in minXp and indexed in order", () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp);
      expect(RANKS[i].index).toBe(i);
    }
  });

  it("maps xp to the highest rank whose floor it has reached", () => {
    expect(rankFor(0).name).toBe("DARK");
    expect(rankFor(99).name).toBe("DARK");
    expect(rankFor(100).name).toBe("FLICKER");
    expect(rankFor(2999).name).toBe("RELAY");
    expect(rankFor(3000).name).toBe("BEACON");
    expect(rankFor(999999).name).toBe("SOVEREIGN");
  });

  it("nextRank is null only at the top", () => {
    expect(nextRank(0)?.name).toBe("FLICKER");
    expect(nextRank(RANKS[RANKS.length - 1].minXp)).toBeNull();
  });

  it("rankProgress runs 0..1 within a band and pins to 1 at the top", () => {
    // FLICKER floor 100, EMBER floor 300 → halfway is 200.
    expect(rankProgress(100)).toBeCloseTo(0);
    expect(rankProgress(200)).toBeCloseTo(0.5);
    expect(rankProgress(300)).toBeCloseTo(0);
    expect(rankProgress(999999)).toBe(1);
  });

  it("rankedUp detects a threshold crossing", () => {
    expect(rankedUp(50, 120)).toBe(true); // DARK → FLICKER
    expect(rankedUp(120, 150)).toBe(false); // still FLICKER
    expect(rankedUp(0, 0)).toBe(false);
  });
});

describe("titles", () => {
  it("unlocks every title at or below the current rank", () => {
    expect(unlockedTitles(0)).toEqual(["Unlit"]);
    const atBeacon = unlockedTitles(3000);
    expect(atBeacon).toContain("City Beacon");
    expect(atBeacon).toContain("Signal Carrier");
    expect(atBeacon).not.toContain("The Oracle");
  });

  it("equipTitle rejects a title that isn't unlocked yet", () => {
    // node env → progress starts empty (xp 0), only 'Unlit' is unlocked.
    expect(equipTitle("Unlit").title).toBe("Unlit");
    expect(equipTitle("Sovereign Signal").title).toBeNull();
  });
});

describe("awardXp", () => {
  it("credits xp + a play and records the game's best (single-call compute)", () => {
    // In the node test env there is no localStorage, so each call reads a
    // fresh empty state; we assert the computed result of one award.
    const s = awardXp("hex-match", 250, 1800);
    expect(s.xp).toBe(250);
    expect(s.plays).toBe(1);
    expect(s.games["hex-match"]).toEqual({ plays: 1, xp: 250, best: 1800 });
    expect(rankFor(s.xp).name).toBe("FLICKER");
  });

  it("clamps negative xp to zero and floors fractional gains", () => {
    expect(awardXp("sweep", -50).xp).toBe(0);
    expect(awardXp("sweep", 33.9).xp).toBe(33);
  });
});

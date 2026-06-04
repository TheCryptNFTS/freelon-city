import { describe, it, expect } from "vitest";
import {
  applyJob,
  getProgress,
  levelForXp,
  xpForLevel,
  topCitizens,
} from "@/lib/progression-store";
import { ECONOMY } from "@/lib/economy-constants";

// No UPSTASH_* env in the test runner, so the store uses its in-memory Map.
// That's exactly what we want: a hermetic test of the loop math.

describe("level curve", () => {
  it("is quadratic and monotonic", () => {
    expect(levelForXp(0)).toBe(1);
    expect(xpForLevel(2)).toBe(ECONOMY.JOB_XP_LEVEL_BASE); // 100
    expect(xpForLevel(3)).toBe(ECONOMY.JOB_XP_LEVEL_BASE * 4); // 400
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(399)).toBe(2);
    expect(levelForXp(400)).toBe(3);
  });
});

describe("applyJob — the loop", () => {
  it("awards XP/skill/reputation, logs memory, and levels up", async () => {
    const tokenId = 9001;
    const res = await applyJob({
      tokenId,
      jobTitle: "Decode a Signal Fragment",
      requiredSkill: "research",
      rewardXp: ECONOMY.JOB_XP_T2, // 150 → crosses level 2 (needs 100)
      difficulty: 2,
      signalReward: ECONOMY.JOB_SIGNAL_T2,
      civSlug: "blue-synthesis", // 1.1× bonus
    });

    // civ bonus applied: 150 * 1.1 = 165
    expect(res.xpGained).toBe(Math.round(ECONOMY.JOB_XP_T2 * 1.1));
    expect(res.leveledUp).toBe(true);

    const p = await getProgress(tokenId);
    expect(p.xp).toBe(165);
    expect(p.level).toBe(levelForXp(165)); // 2
    expect(p.skills.research).toBe(1);
    expect(p.reputation).toBe(ECONOMY.REP_PER_DIFFICULTY * 2); // 20
    expect(p.jobsCompleted).toBe(1);

    // memory log: newest-first, level-up entry sits above the job entry
    expect(p.memoryLog[0].type).toBe("levelup");
    expect(p.memoryLog[1].type).toBe("job");
    expect(p.memoryLog[1].signalChange).toBe(ECONOMY.JOB_SIGNAL_T2);
  });

  it("accumulates across multiple jobs", async () => {
    const tokenId = 9002;
    await applyJob({ tokenId, jobTitle: "A", requiredSkill: "risk", rewardXp: 50, difficulty: 1, signalReward: 5, civSlug: "red-corruption" });
    await applyJob({ tokenId, jobTitle: "B", requiredSkill: "risk", rewardXp: 50, difficulty: 1, signalReward: 5, civSlug: "red-corruption" });
    const p = await getProgress(tokenId);
    expect(p.jobsCompleted).toBe(2);
    expect(p.skills.risk).toBe(2);
  });
});

describe("topCitizens leaderboard (in-memory)", () => {
  it("ranks worked citizens by jobs completed, descending", async () => {
    // 9001 has 1 job, 9002 has 2 jobs (from tests above). Order is not
    // guaranteed across files, so seed a clear leader here.
    const leader = 9003;
    for (let i = 0; i < 5; i++) {
      await applyJob({ tokenId: leader, jobTitle: "J", requiredSkill: "strategy", rewardXp: 50, difficulty: 1, signalReward: 5, civSlug: "pink-luxury" });
    }
    const rows = await topCitizens("jobs", 50);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].tokenId).toBe(leader);
    expect(rows[0].value).toBe(5);
    // strictly descending
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].value).toBeGreaterThanOrEqual(rows[i].value);
    }
  });
});

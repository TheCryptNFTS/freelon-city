import { describe, it, expect } from "vitest";
import { awardRuns, EARN_RUNS } from "@/lib/missions/earn-runs";
import { unlockStatus, isUnlocked, spendCredit } from "@/lib/missions/unlock-store";

describe("earn premium runs (streak / referral)", () => {
  it("awarding runs activates a locked citizen and credits the runs", async () => {
    const T = 8700; // never activated
    expect(await isUnlocked(T)).toBe(false);
    const r = await awardRuns(T, "referral");
    expect(r.runs).toBe(EARN_RUNS.referral);
    expect(r.balance).toBe(EARN_RUNS.referral);
    // earned runs ACTIVATE the agent so the holder can use them
    expect(await isUnlocked(T)).toBe(true);
    expect((await unlockStatus(T)).credits).toBe(EARN_RUNS.referral);
  });

  it("multiple earns stack; a streak30 is worth more than a streak7", async () => {
    const T = 8701;
    await awardRuns(T, "streak7");
    const after = await awardRuns(T, "streak30");
    expect(after.balance).toBe(EARN_RUNS.streak7 + EARN_RUNS.streak30);
    expect(EARN_RUNS.streak30).toBeGreaterThan(EARN_RUNS.streak7);
  });

  it("earned runs are spendable like paid ones", async () => {
    const T = 8702;
    await awardRuns(T, "referral"); // 5 runs
    const s = await spendCredit(T);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.remaining).toBe(EARN_RUNS.referral - 1);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { consumeFreeRun, refundFreeRun, agentsKilled, runsPerCitizenPerDay } from "@/lib/missions/budget";

// No Upstash in test → in-memory cents counter. Each test pins its own budget/
// kill via env and restores after.
describe("free-run budget guardrails", () => {
  const saved = {
    budget: process.env.AGENT_DAILY_BUDGET_USD,
    off: process.env.AGENT_AGENTS_OFF,
    ramp: process.env.AGENT_TEST_RAMP,
    runs: process.env.AGENT_TEST_RUNS_PER_DAY,
  };
  beforeEach(() => {
    delete process.env.AGENT_AGENTS_OFF;
    delete process.env.AGENT_TEST_RAMP;
    delete process.env.AGENT_TEST_RUNS_PER_DAY;
    process.env.AGENT_DAILY_BUDGET_USD = "0.03"; // 3¢ pool → 3 text runs (1¢ each)
  });
  afterEach(() => {
    process.env.AGENT_DAILY_BUDGET_USD = saved.budget;
    process.env.AGENT_AGENTS_OFF = saved.off;
    process.env.AGENT_TEST_RAMP = saved.ramp;
    process.env.AGENT_TEST_RUNS_PER_DAY = saved.runs;
  });

  it("per-citizen daily runs: strict 1 by default, ramped when AGENT_TEST_RAMP on", () => {
    expect(runsPerCitizenPerDay()).toBe(1); // strict default — unfakeable pace
    process.env.AGENT_TEST_RAMP = "1";
    expect(runsPerCitizenPerDay()).toBe(25); // ramp default
    process.env.AGENT_TEST_RUNS_PER_DAY = "10";
    expect(runsPerCitizenPerDay()).toBe(10); // explicit override
  });

  it("kill-switch refuses every run with reason 'killed'", async () => {
    process.env.AGENT_AGENTS_OFF = "1";
    expect(agentsKilled()).toBe(true);
    const v = await consumeFreeRun(1);
    expect(v.ok).toBe(false);
    expect(v.ok ? null : v.reason).toBe("killed");
  });

  it("charges cents against the $ budget; refund frees the charge", async () => {
    // 3¢ pool, 1¢/text run (counter is process-global; only test touching it).
    const first3 = [await consumeFreeRun(1), await consumeFreeRun(1), await consumeFreeRun(1)];
    expect(first3.every((v) => v.ok)).toBe(true);
    const overflow = await consumeFreeRun(1);
    expect(overflow.ok).toBe(false);
    expect(overflow.ok ? null : overflow.reason).toBe("cap");
    // Refund 1¢ → the next attempt succeeds again.
    await refundFreeRun(1);
    const retry = await consumeFreeRun(1);
    expect(retry.ok).toBe(true);
  });

  it("charges an image run more than a text run (cost-weighted)", async () => {
    process.env.AGENT_DAILY_BUDGET_USD = "100"; // huge pool → no cap interference
    const a = await consumeFreeRun(1); // text
    const b = await consumeFreeRun(5); // image
    expect(a.ok && b.ok).toBe(true);
    // The image charge advanced the tally 5× the text charge — residual-independent.
    expect((b.ok ? b.usedCents : 0) - (a.ok ? a.usedCents : 0)).toBe(5);
  });
});

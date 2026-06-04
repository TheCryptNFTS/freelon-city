/**
 * PRIVATE SMOKE — multi-turn follow-up: does priorOutput actually make the agent
 * REVISE its last result rather than start over? Skipped unless RUN_LIVE=1.
 *   RUN_LIVE=1 ./node_modules/.bin/vitest run lib/missions/followup-smoke.test.ts
 * In-memory; never touches prod.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { makeAbilityResolver } from "@/lib/missions/abilities/ability";
import { MAKER } from "@/lib/missions/abilities/maker";
import type { MissionContext } from "@/lib/missions/types";

const LIVE = process.env.RUN_LIVE === "1";

describe.runIf(LIVE)("SMOKE: multi-turn follow-up refines the prior output", () => {
  beforeAll(() => {
    for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
      const or = line.match(/^OPENROUTER_API_KEY=(.+)$/);
      const oa = line.match(/^OPENAI_API_KEY=(.+)$/);
      if (or) process.env.OPENROUTER_API_KEY = or[1].trim();
      if (oa && !process.env.OPENROUTER_API_KEY) process.env.OPENAI_API_KEY = oa[1].trim();
    }
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("a 'make it shorter' follow-up returns a shorter version of the same idea", async () => {
    const citizen = getCitizen(1)!;
    const progress = empty(1);
    progress.level = 20;
    const resolve = makeAbilityResolver(MAKER);
    const ctx = (input: string, prior?: string): MissionContext => ({ citizen, progress, input, walletAddress: "0x", paid: true, priorOutput: prior });

    // 1. First output.
    const first = await resolve(ctx("post: write a tweet announcing a trainable-AI-agent NFT relaunch"));
    expect(first.ok).toBe(true);

    // 2. Follow-up: make it shorter, carrying the first output as context.
    const refined = await resolve(ctx("post: make it much shorter and punchier", first.body));
    expect(refined.ok).toBe(true);

    writeFileSync("/tmp/followup-output.md",
      `# FOLLOW-UP SMOKE\n\n## FIRST (${first.body.length} chars)\n${first.body}\n\n## REFINED — "shorter & punchier" (${refined.body.length} chars)\n${refined.body}\n`);

    // The refinement should be meaningfully shorter than the original.
    expect(refined.body.length).toBeLessThan(first.body.length);
  }, 120_000);
});

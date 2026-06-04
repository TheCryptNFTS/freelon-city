/**
 * PRIVATE SMOKE — the fix for "freshly-activated (Level 1) citizen gives shallow
 * paid output". Proves a PAID Red Team on a Level-1 citizen now reasons at full
 * depth (not the 180-token novice stub). Skipped unless RUN_LIVE=1.
 *   RUN_LIVE=1 ./node_modules/.bin/vitest run lib/missions/level1-paid.test.ts
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { makeAbilityResolver } from "@/lib/missions/abilities/ability";
import { RISK } from "@/lib/missions/abilities/scout";
import type { MissionContext } from "@/lib/missions/types";

const LIVE = process.env.RUN_LIVE === "1";

const BRIEF = "red-team: I'm relaunching an NFT project where each NFT is a trainable AI agent you activate with ETH. Floor is near zero. Find the biggest reasons a holder won't pay to activate, and what I must fix first. Be specific.";

describe.runIf(LIVE)("SMOKE: paid Red Team on a LEVEL-1 citizen is deep, not shallow", () => {
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

  it("a Level-1 PAID run produces a full, deep answer (the fix)", async () => {
    const citizen = getCitizen(1337)!;
    const progress = empty(1337); // LEVEL 1 — the exact freshly-activated case
    expect(progress.level).toBe(1);
    const resolve = makeAbilityResolver(RISK);
    const ctx: MissionContext = { citizen, progress, input: BRIEF, walletAddress: "0x", paid: true };

    const out = await resolve(ctx);
    expect(out.ok).toBe(true);
    writeFileSync("/tmp/level1-paid.md", `# LEVEL-1 PAID RED TEAM (after fix)\n${out.body.length} chars\n\n${out.body}\n`);

    // Before the fix this was ~180-token shallow. A real paid red-team should be
    // substantial — assert it's clearly deeper than the old novice cap.
    expect(out.body.length).toBeGreaterThan(900);
  }, 120_000);
});

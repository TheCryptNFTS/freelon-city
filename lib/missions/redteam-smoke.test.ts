/**
 * PRIVATE SMOKE — run the EXACT Red Team prompt through the PAID path (premium
 * model, paid:true) so we can judge output quality BEFORE flipping PAYMENTS_LIVE.
 * Skipped by default. Run:
 *   RUN_LIVE=1 ./node_modules/.bin/vitest run lib/missions/redteam-smoke.test.ts
 * In-memory only (vitest doesn't load .env.local Upstash) → never touches prod.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { makeAbilityResolver } from "@/lib/missions/abilities/ability";
import { RISK } from "@/lib/missions/abilities/scout";
import type { MissionContext } from "@/lib/missions/types";

const LIVE = process.env.RUN_LIVE === "1";

const BRIEF = `red-team: Red-team the FREELON CITY relaunch. The current pitch is: FREELONS are 4,040 trainable AI agents you own. You give them jobs, they level up, develop a role, build a visible work history, and that history stays with the NFT. The ecosystem is: FREELONS = trainable agents; HEX = shared reward layer; EMILE = creative/emotional AI branch; TCG + Crypt OGs = game branch; OOGIES = hidden utility coming. Be brutally honest. Find: (1) the 10 biggest reasons holders or new buyers might not care; (2) the 10 biggest confusion points on the website; (3) the exact wording that sounds like overpromising; (4) the strongest simple pitch; (5) the top 5 changes to make before announcing.`;

describe.runIf(LIVE)("SMOKE: paid Red Team output quality", () => {
  beforeAll(() => {
    for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
      const or = line.match(/^OPENROUTER_API_KEY=(.+)$/);
      const oa = line.match(/^OPENAI_API_KEY=(.+)$/);
      const pm = line.match(/^AGENT_MODEL_PREMIUM=(.+)$/);
      if (or) process.env.OPENROUTER_API_KEY = or[1].trim();
      if (oa && !process.env.OPENROUTER_API_KEY) process.env.OPENAI_API_KEY = oa[1].trim();
      if (pm) process.env.AGENT_MODEL_PREMIUM = pm[1].trim();
    }
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("produces a sharp, specific red-team (paid=premium model)", async () => {
    const citizen = getCitizen(1337)!; // a Red-Corruption 1/1 — fitting for Red Team
    const progress = empty(1337);
    progress.level = 30; // high rank → deep persona band
    const resolve = makeAbilityResolver(RISK);
    const ctx: MissionContext = { citizen, progress, input: BRIEF, walletAddress: "0x", paid: true };

    const out = await resolve(ctx);
    expect(out.ok).toBe(true);
    // Write to a file so the full output survives vitest's console capture.
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      "/tmp/redteam-output.md",
      `# PAID RED TEAM OUTPUT\nmodel: ${process.env.AGENT_MODEL_PREMIUM} · ${out.body.length} chars\n\n${out.body}\n`,
    );
    expect(out.body.length).toBeGreaterThan(400);
  }, 120_000);
});

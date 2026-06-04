/**
 * PRIVATE SMOKE — Strategy + Dossier through the PAID path (premium model,
 * paid:true) to judge quality BEFORE PAYMENTS_LIVE. Skipped by default:
 *   RUN_LIVE=1 ./node_modules/.bin/vitest run lib/missions/premium-smoke.test.ts
 * In-memory only; never touches prod. Writes outputs to /tmp for review.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { makeAbilityResolver } from "@/lib/missions/abilities/ability";
import { STRATEGY } from "@/lib/missions/abilities/analyst";
import { dossierResolver } from "@/lib/missions/resolvers/dossier";
import type { MissionContext } from "@/lib/missions/types";

const LIVE = process.env.RUN_LIVE === "1";

const STRATEGY_BRIEF =
  `fix-launch: Create a launch plan for taking FREELON CITY live after the Red Team fixes. ` +
  `Context: FREELONS are 4,040 trainable AI agents you own — give them jobs, they level up, ` +
  `build a work history that stays with the NFT. We have a free tier plus a paid "activate" ` +
  `(one-time ETH, by rarity) that grants premium runs. The site is relaunching to a near-dead ` +
  `floor (~0.0009 ETH) with existing holders as the warm audience. Plan the rollout: holders first, ` +
  `then first paid users, what screenshots to show, and the Discord/Twitter sequence. Be specific.`;

const DOSSIER_BRIEF =
  `Build a FREELON CITY project dossier from this ecosystem: FREELONS = trainable agents; ` +
  `HEX = reward layer; EMILE = creative/emotional branch; TCG + Crypt OGs = game branch; ` +
  `OOGIES = hidden utility coming. Main goal: make holders understand and use FREELONS without ` +
  `getting lost. Audience is existing NFT holders + crypto-native newcomers. Tone: confident, ` +
  `terse, no hype. Constraint: solo founder, tiny budget, dead floor to revive.`;

describe.runIf(LIVE)("SMOKE: paid Strategy + Dossier quality", () => {
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

  it("Strategy: builds a specific, finished launch plan (paid premium)", async () => {
    const citizen = getCitizen(1)!;
    const progress = empty(1);
    progress.level = 30;
    const resolve = makeAbilityResolver(STRATEGY);
    const ctx: MissionContext = { citizen, progress, input: STRATEGY_BRIEF, walletAddress: "0x", paid: true };
    const out = await resolve(ctx);
    expect(out.ok).toBe(true);
    writeFileSync("/tmp/strategy-output.md", `# PAID STRATEGY OUTPUT\nmodel: ${process.env.AGENT_MODEL_PREMIUM} · ${out.body.length} chars\n\n${out.body}\n`);
    expect(out.body.length).toBeGreaterThan(800);
  }, 120_000);

  it("Dossier: builds a practical operating profile (paid premium)", async () => {
    const citizen = getCitizen(404)!;
    const progress = empty(404);
    progress.level = 30;
    const ctx: MissionContext = { citizen, progress, input: DOSSIER_BRIEF, walletAddress: "0x", paid: true };
    const out = await dossierResolver(ctx);
    expect(out.ok).toBe(true);
    writeFileSync("/tmp/dossier-output.md", `# PAID DOSSIER OUTPUT\n${out.body.length} chars\n\n${out.body}\n`);
    expect(out.body.length).toBeGreaterThan(600);
  }, 120_000);
});

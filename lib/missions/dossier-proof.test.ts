/**
 * LIVE MOAT PROOF — does the Dossier actually make an agent "remember you"?
 *
 * Skipped by default (it makes real LLM calls). Run explicitly:
 *   RUN_LIVE=1 ./node_modules/.bin/vitest run lib/missions/dossier-proof.test.ts
 *
 * It exercises the REAL resolvers (not re-inlined logic) against the in-memory
 * store (vitest does not load .env.local, so hasUpstash=false → nothing touches
 * prod Redis). Flow:
 *   1. Strategy mission on a citizen with NO dossier  → generic answer (control)
 *   2. Dossier mission feeds it a specific project    → it builds a profile
 *   3. SAME Strategy mission again                     → answer now references
 *      the project — proof the agent remembered.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { makeAbilityResolver } from "@/lib/missions/abilities/ability";
import { STRATEGY } from "@/lib/missions/abilities/analyst";
import { dossierResolver } from "@/lib/missions/resolvers/dossier";
import type { MissionContext } from "@/lib/missions/types";

const LIVE = process.env.RUN_LIVE === "1";

// A distinctive, made-up project so we can detect "it remembered" unambiguously.
const PROJECT = "Lumenbridge";
const PROJECT_BRIEF =
  `My project is ${PROJECT}: a solo-built marketplace that lets indie game devs ` +
  `sell mod assets for a 3% fee. Audience is hobbyist Unity devs. I'm pre-launch, ` +
  `no waitlist, tiny budget, and my one-liner is "the App Store for game mods."`;

describe.runIf(LIVE)("LIVE: Dossier moat — the agent remembers your project", () => {
  beforeAll(() => {
    // Inject ONLY the LLM key from .env.local. Never load the Upstash creds —
    // keep this run in-memory so it cannot touch prod.
    try {
      for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
        const or = line.match(/^OPENROUTER_API_KEY=(.+)$/);
        const oa = line.match(/^OPENAI_API_KEY=(.+)$/);
        if (or) process.env.OPENROUTER_API_KEY = or[1].trim();
        if (oa && !process.env.OPENROUTER_API_KEY) process.env.OPENAI_API_KEY = oa[1].trim();
      }
    } catch { /* key may be provided via the shell instead */ }
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("answers generically first, then references the project after a Dossier", async () => {
    const TOKEN = 7;
    const citizen = getCitizen(TOKEN)!;
    const progress = empty(TOKEN);
    progress.level = 20; // an established agent so it reasons in depth
    const strategy = makeAbilityResolver(STRATEGY); // returns the resolve fn directly
    const ctx = (input: string): MissionContext => ({ citizen, progress, input, walletAddress: "0x", paid: false });

    // 1. CONTROL — no dossier yet.
    const before = await strategy(ctx("growth-plan: What should I focus on first to get my first 100 users?"));
    expect(before.ok).toBe(true);

    // 2. Build the dossier (real merge + save).
    const dossier = await dossierResolver(ctx(PROJECT_BRIEF));
    expect(dossier.ok).toBe(true);
    expect(dossier.body.toLowerCase()).toContain(PROJECT.toLowerCase());

    // 3. SAME question again — the persona now reads the saved dossier.
    const after = await strategy(ctx("growth-plan: What should I focus on first to get my first 100 users?"));
    expect(after.ok).toBe(true);

    // PROOF: the rigorous, unfakeable signal is the MADE-UP project name. The
    // control was never told it (and can't invent it); the post-dossier answer
    // surfaces it because the agent read the saved profile. Generic words like
    // "marketplace" are too loose — the name is the clean proof.
    const knowsProject = (t: string) => t.toLowerCase().includes(PROJECT.toLowerCase());

    // Print the contrast so a human can read it.
    /* eslint-disable no-console */
    console.log("\n===== CONTROL (no dossier) =====\n" + before.body);
    console.log("\n===== DOSSIER BUILT =====\n" + dossier.body);
    console.log("\n===== AFTER DOSSIER (same question) =====\n" + after.body + "\n");
    /* eslint-enable no-console */

    expect(knowsProject(after.body)).toBe(true);   // remembered the project by name
    expect(knowsProject(before.body)).toBe(false); // control had no idea
  }, 90_000);
});

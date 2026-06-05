/**
 * Mission catalog — registers the test missions. These are deliberately a
 * SPREAD across output kinds and tiers, not a committed first mission. The
 * point is to run several for a month and let telemetry show which one holders
 * actually burn ⬡ on; then wire the real resolver behind the winner.
 *
 * Importing this module registers the missions (side effect). The endpoint and
 * any server component that needs the catalog imports "@/lib/missions" (the
 * barrel) which imports this.
 */

import { registerMission } from "@/lib/missions/registry";
import { ECONOMY } from "@/lib/economy-constants";
import { deployResolver } from "@/lib/missions/resolvers/deploy";
import { deployVideoResolver } from "@/lib/missions/resolvers/deploy-video";
import { dossierResolver } from "@/lib/missions/resolvers/dossier";
import { feudResolver } from "@/lib/missions/resolvers/feud";
import { versusResolver } from "@/lib/missions/resolvers/versus";
import { crewResolver } from "@/lib/missions/resolvers/crew";
import { makeAbilityResolver } from "@/lib/missions/abilities/ability";
import { ABILITY_DEFS } from "@/lib/missions/abilities";

// Mission catalog — the agent's PRACTICAL money-work, plus the image render.
// FREE/internal for now (cost 0, no payment rail). The old lore stubs
// (scout-report / transmission / consult) were RETIRED — superseded by the six
// real ability missions below. The flagship is Strategy → "Fix My Launch".

// Deploy Citizen — the image product. Renders the citizen into a server-
// allowlisted cinematic scene off its real shipped art. Owner-gated +
// one-per-citizen-per-day at the endpoint. Gated on the DESIGN skill.
registerMission({
  id: "deploy-citizen",
  title: "Deploy Citizen",
  tagline: "Render your citizen into a cinematic scene.",
  description:
    "Deploy this citizen into a dramatic scene — Neon City, Signal Fire, or Throne Room — rendered from its own art. Gains XP and a memory of the deployment. (Free internal test.)",
  cost: 0, // FREE during internal testing — no payment, no FUEL, no discount
  gate: { skill: "design", minLevel: 1 },
  rewardXp: ECONOMY.MISSION_XP_T1, // tiny XP — cosmetic, shouldn't fast-track the résumé
  outputKind: "ai",
  inputMode: "prompt", // input = scene KEY (allowlisted), NOT a free prompt
  category: "cosmetic", // gallery only — does NOT make the citizen "tuned for neon rooftops"
  resolve: deployResolver,
});

// Deploy Video — the premium tier above images: animate the citizen into a short
// branded clip. Server-allowlisted motion KEY (no free prompt). Higher skill gate
// + price (video is the most expensive lever). Ships keyless-safe (see video-gen).
registerMission({
  id: "deploy-video",
  title: "Animate Citizen",
  tagline: "Animate your citizen into a short branded clip.",
  description:
    "Bring this citizen to life — a short looping video rendered from its own art, branded and shareable. The premium tier above images.",
  cost: 0,
  gate: { skill: "design", minLevel: 3 },
  rewardXp: ECONOMY.MISSION_XP_T2,
  outputKind: "ai",
  inputMode: "prompt", // input = motion-style KEY (allowlisted)
  category: "cosmetic",
  resolve: deployVideoResolver,
});

// Citizen Dossier — the MOAT product. The citizen keeps a persistent file on the
// holder; every other mission reads it (see ability.ts). Premium model.
registerMission({
  id: "dossier",
  title: "Citizen Dossier",
  tagline: "Your citizen keeps a living file on you — every mission gets sharper.",
  description:
    "Tell your citizen about you and your project. It builds and maintains a private dossier that all its future missions read from — so it becomes YOUR specialist over time. (Free internal test.)",
  cost: 0,
  gate: { skill: "research", minLevel: 1 },
  rewardXp: ECONOMY.MISSION_XP_T2,
  outputKind: "ai",
  inputMode: "prompt",
  category: "professional", // builds the citizen's knowledge of the holder
  resolve: dossierResolver,
});

// Citizen Feud / Collab — the VIRAL product. Two citizens, one shareable output.
registerMission({
  id: "feud",
  title: "Citizen Feud",
  tagline: "Stage your citizen with another holder's — a rivalry, duet, or heist.",
  description:
    "Name a second citizen (token #). Your two agents co-produce a short, shareable scene in both their voices. (Free internal test.)",
  cost: 0,
  gate: { skill: "content", minLevel: 1 },
  rewardXp: ECONOMY.MISSION_XP_T1,
  outputKind: "ai",
  inputMode: "prompt", // input = "<otherTokenId> [theme]"
  category: "social", // reputation/social — no professional-profile pollution
  resolve: feudResolver,
});

// Agent vs Agent — the RIVALRY product. Your citizen red-teams another holder's
// idea, naming them as the opponent. Two NFTs per result, viral by design.
registerMission({
  id: "versus",
  title: "Agent vs Agent",
  tagline: "Your agent red-teams another holder's idea — name the token, pitch the idea.",
  description:
    "Name a second citizen (token #) and pitch an idea. Your agent tears into it in its own voice, naming the other as the opponent. Sharp, screenshot-ready. (Free internal test.)",
  cost: 0,
  gate: { skill: "risk", minLevel: 1 },
  rewardXp: ECONOMY.MISSION_XP_T1,
  outputKind: "ai",
  inputMode: "prompt", // input = "<otherTokenId> <idea>"
  category: "social", // social/viral — no professional-profile pollution
  resolve: versusResolver,
});

// Crew Brief — the COLLAB product. Two named citizens co-produce one output.
registerMission({
  id: "crew",
  title: "Crew Brief",
  tagline: "Two citizens, one job — your agent teams up with another holder's.",
  description:
    "Name a second citizen (token #) and a brief. Your two agents collaborate on a short, shareable output in both voices. (Free internal test.)",
  cost: 0,
  gate: { skill: "content", minLevel: 1 },
  rewardXp: ECONOMY.MISSION_XP_T1,
  outputKind: "ai",
  inputMode: "prompt", // input = "<otherTokenId> <brief>"
  category: "social",
  resolve: crewResolver,
});

// THE SIX MONEY-WORK ABILITIES — Content / Strategy / Sales / Research / Design /
// Risk. FREE/internal for now (cost 0). Input = "taskKey: brief". Each trains
// its own skill so the class lines up. ABILITY_DEFS is the single source of
// truth (shared with the dashboard view). Premium model is used on the deep/
// strategy abilities (see each ability's modelTask); cheap on the light ones.
for (const { ability, skill } of ABILITY_DEFS) {
  registerMission({
    id: ability.id,
    title: `${ability.label} · Agent`,
    tagline: ability.blurb,
    description: `${ability.blurb} Gets sharper as the citizen levels. (Free internal test.) AI-generated — review before acting.`,
    cost: 0,
    gate: { skill, minLevel: 1 },
    rewardXp: ECONOMY.MISSION_XP_T1,
    outputKind: "ai",
    inputMode: "prompt",
    category: "professional", // real work → shapes the résumé (class + specialist area)
    resolve: makeAbilityResolver(ability),
  });
}

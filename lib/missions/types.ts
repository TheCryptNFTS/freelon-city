/**
 * Mission framework — the SINK side of the citizen loop.
 *
 *   burn ⬡ → deploy citizen on a mission → get an output back + XP
 *
 * A Mission is a pluggable unit: it declares its cost, the progression gate
 * that unlocks it, how much XP it grants, what KIND of output it produces, and
 * a `resolve` handler that actually produces the output. Adding a new mission
 * is one registerMission() call — the endpoint, UI, and telemetry are generic
 * over the Mission shape, so we can A/B test many missions without touching
 * the plumbing. This is deliberately NOT hardcoded to one mission: the product
 * question ("which mission do holders pay for?") is answered by the telemetry,
 * not by a guess up front.
 */

import type { SkillKey, CitizenProgress } from "@/lib/progression-store";
import type { Citizen } from "@/lib/citizens";

/**
 * What a mission returns. Extensible — new kinds slot in without changing the
 * endpoint or the registry:
 *   - "ai":      output produced by an LLM call (resolver wires the model)
 *   - "content": generated/templated content (lore, dossier, transmission)
 *   - "data":    a computed report over on-site data (floor, rarity, etc)
 */
export type MissionOutputKind = "ai" | "content" | "data";

/** Whether a mission needs a free-text prompt from the user. */
export type MissionInputMode = "none" | "prompt";

/**
 * What KIND of work a mission is — controls how it shapes the citizen's RÉSUMÉ.
 * The rule (founder, 2026-06-03): "every FREELON needs a resume, not a junk
 * drawer." Only PROFESSIONAL work shapes the citizen's specialist profile.
 *   - professional: real work (Fix My Launch, Research…) → shapes class +
 *     "specialist in X" + the buyer-facing mission record.
 *   - cosmetic: images/banners (Deploy Citizen) → gallery + tiny XP only;
 *     NEVER sets "tuned for neon rooftops". Doesn't pollute the professional brain.
 *   - social: feuds/collabs → reputation + social, light skill, no focus pollution.
 *   - training: free jobs → small XP.
 */
export type MissionCategory = "professional" | "cosmetic" | "social" | "training";

export type MissionContext = {
  citizen: Citizen;
  progress: CitizenProgress;
  /** Free-text input when inputMode === "prompt"; "" otherwise. Already
   *  length-clamped + trimmed by the endpoint. */
  input: string;
  walletAddress: string;
  /** True only when this run was PAID FOR (payments live + priced + tx verified).
   *  Resolvers use this to gate the expensive premium model: free runs ALWAYS
   *  use the cheap model so we can never serve premium compute for free. */
  paid: boolean;
  /** Optional prior output the holder is refining (multi-turn follow-up). When
   *  present, the resolver treats `input` as a refinement instruction applied to
   *  this previous result — so "make that punchier" works. Server-capped. */
  priorOutput?: string;
};

export type MissionOutput = {
  ok: boolean;
  /** Short headline for the result + the memory-log entry. */
  title: string;
  /** The body the user sees. For "ai"/"content" this is the generated text. */
  body: string;
  /** Optional structured extras (e.g. a data report's rows). */
  meta?: Record<string, unknown>;
  /** When ok===false, a user-facing reason. The endpoint refunds the burn. */
  error?: string;
};

export type Mission = {
  id: string;
  title: string;
  /** One-line pitch shown on the card. */
  tagline: string;
  description: string;
  /** ⬡ burned to deploy. Must come from ECONOMY (source-of-truth). */
  cost: number;
  /** Progression gate: the citizen needs >= minLevel, and the skill is the
   *  one this mission trains (so deploying it also deepens that skill). */
  gate: { skill: SkillKey; minLevel: number };
  /** XP granted on a successful run. From ECONOMY tiers. */
  rewardXp: number;
  outputKind: MissionOutputKind;
  inputMode: MissionInputMode;
  /** Résumé impact bucket. Defaults to "professional" if unset. */
  category?: MissionCategory;
  /** Produce the output. May call an LLM (kind "ai"), template content, or
   *  compute over data. Throwing or returning ok:false triggers a refund. */
  resolve: (ctx: MissionContext) => Promise<MissionOutput>;
};

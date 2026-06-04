/**
 * Static catalog of jobs a citizen can work. This catalog is the SERVER-SIDE
 * ALLOWLIST: the completion route looks a job up by id here and reads the
 * reward from it, so a client can never POST a fabricated jobId or an inflated
 * reward (same defensive role isValidStepForQuest plays in quests-store).
 *
 * Rewards are NOT inline literals — they reference ECONOMY tiers so all economy
 * numbers stay in lib/economy-constants.ts (the source-of-truth file).
 *
 * Each job is re-completable once per UTC day per citizen (the route enforces
 * the cooldown via an atomic SET NX claim key).
 */

import { ECONOMY } from "@/lib/economy-constants";
import type { SkillKey } from "@/lib/progression-store";

export type JobDifficulty = 1 | 2 | 3;

export type Job = {
  id: string;
  title: string;
  /** Flavor category shown in the UI. */
  category: string;
  description: string;
  requiredSkill: SkillKey;
  rewardSignal: number; // ⬡, from ECONOMY tiers
  rewardXp: number; // from ECONOMY tiers
  difficulty: JobDifficulty;
};

function signalFor(d: JobDifficulty): number {
  return d === 1 ? ECONOMY.JOB_SIGNAL_T1 : d === 2 ? ECONOMY.JOB_SIGNAL_T2 : ECONOMY.JOB_SIGNAL_T3;
}
function xpFor(d: JobDifficulty): number {
  return d === 1 ? ECONOMY.JOB_XP_T1 : d === 2 ? ECONOMY.JOB_XP_T2 : ECONOMY.JOB_XP_T3;
}

function job(
  id: string,
  title: string,
  category: string,
  requiredSkill: SkillKey,
  difficulty: JobDifficulty,
  description: string,
): Job {
  return {
    id,
    title,
    category,
    description,
    requiredSkill,
    difficulty,
    rewardSignal: signalFor(difficulty),
    rewardXp: xpFor(difficulty),
  };
}

// One starter job per skill at each difficulty tier (18 total). Flavored to
// the FREELON CITY signal mythology, not generic RPG quests.
export const JOBS: readonly Job[] = [
  // research
  job("decode-fragment", "Decode a Signal Fragment", "Research", "research", 1, "Pull a corrupted packet from the noise floor and reconstruct one clean byte."),
  job("trace-origin", "Trace the Origin Signal", "Research", "research", 2, "Follow a transmission upstream through three relays to its source."),
  job("map-the-void", "Map the Void", "Research", "research", 3, "Chart an uncharted dead zone where the signal never reached."),
  // creativity
  job("compose-tone", "Compose a Hex Tone", "Creativity", "content", 1, "Write a short carrier melody other citizens can broadcast."),
  job("render-glyph", "Render a New Glyph", "Creativity", "content", 2, "Design a sigil the city can stamp on a transmission."),
  job("author-doctrine", "Author a Doctrine Verse", "Creativity", "content", 3, "Add a canonical line to your civilization's doctrine."),
  // engineering
  job("patch-relay", "Patch a Relay", "Engineering", "design", 1, "Restore a flickering relay node back to a stable hex."),
  job("build-antenna", "Raise an Antenna", "Engineering", "design", 2, "Erect a new tower to widen the city's broadcast range."),
  job("rebuild-grid", "Rebuild the Grid", "Engineering", "design", 3, "Re-lay a collapsed district's power and signal grid."),
  // diplomacy
  job("relay-message", "Relay a Message", "Diplomacy", "sales", 1, "Carry a sealed transmission between two civilizations."),
  job("broker-truce", "Broker a Truce", "Diplomacy", "sales", 2, "Cool a flaring civ-war before it corrupts the channel."),
  job("unite-doctrines", "Unite Two Doctrines", "Diplomacy", "sales", 3, "Negotiate a synthesis between rival signal doctrines."),
  // security
  job("scan-intrusion", "Scan for Intrusion", "Security", "risk", 1, "Sweep a channel for a foreign packet and log it."),
  job("repel-corruption", "Repel Corruption", "Security", "risk", 2, "Drive a corruption bloom out of a held district."),
  job("seal-the-breach", "Seal the Breach", "Security", "risk", 3, "Close a 404 breach before the void spreads citywide."),
  // trading
  job("run-the-floor", "Run the Floor", "Trading", "strategy", 1, "Move a small hex position across the city exchange."),
  job("corner-supply", "Corner a Supply", "Trading", "strategy", 2, "Accumulate a scarce signal good before a price spike."),
  job("stabilize-market", "Stabilize the Market", "Trading", "strategy", 3, "Defend a collapsing market and restore the peg."),
];

export const JOBS_BY_ID: Record<string, Job> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export function getJob(id: string): Job | null {
  return JOBS_BY_ID[id] ?? null;
}

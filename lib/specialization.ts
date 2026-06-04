/**
 * Citizen specialization — PURE derivation from a CitizenProgress record.
 *
 * A bare "Level 80" is meaningless. A "Level 80 Signal Artist, tuned for portraits,
 * 412 images created" is an asset. This module turns the raw skill points a citizen
 * has accumulated into a CLASS (the lane it specialized into) + a RANK (depth within
 * that lane) + TUNING (what it actually did, mined from its memory log).
 *
 * Design constraints (locked):
 *   - PURE + synchronous. No I/O, no async, no stored fields on the record. Class is
 *     a function of skills+level+memory, so it works on every one of the 4040 citizens
 *     the instant it ships — zero migration, zero backfill, consistent everywhere
 *     (profile render AND mission resolver see the same derived class).
 *   - Class is NOT chosen and NOT respec'd — it EMERGES from where XP actually went.
 *     The scarcity is that history is unfakeable.
 *   - Class must be able to TUNE mission output (a Signal Artist's image prompt differs
 *     from a Warden's), not just be a cosmetic label.
 */

import type { SkillKey, CitizenProgress, MemoryEntry } from "@/lib/progression-store";
import { SKILL_KEYS } from "@/lib/progression-store";

export type CitizenClass =
  | "drifter" // no dominant skill yet (untrained)
  | "content-agent" // content
  | "strategist" // strategy
  | "closer" // sales
  | "analyst" // research
  | "designer" // design
  | "red-team"; // risk

/** Which class each skill path leads to. */
export const CLASS_BY_SKILL: Record<SkillKey, CitizenClass> = {
  content: "content-agent",
  strategy: "strategist",
  sales: "closer",
  research: "analyst",
  design: "designer",
  risk: "red-team",
};

/** Human display name + the practical capability the class implies (UI + resolver). */
export const CLASS_META: Record<CitizenClass, { name: string; capability: string }> = {
  drifter: { name: "Trainee", capability: "Untrained — run missions to specialize." },
  "content-agent": { name: "Content Agent", capability: "Writes posts, copy, threads & content plans." },
  strategist: { name: "Strategist", capability: "Fixes launches, plans growth & positioning." },
  closer: { name: "Closer", capability: "Sharpens sales pitches, DMs & landing copy." },
  analyst: { name: "Analyst", capability: "Researches markets, summarizes, scans competitors." },
  designer: { name: "Designer", capability: "Generates images & visual concepts." },
  "red-team": { name: "Red Team", capability: "Finds weak points & red-teams your ideas." },
};

/** Résumé framing per class: the NOUN for the work it has shipped (so dominant
 *  skill points read as "61 red-team reports") and the AUDIENCE it's best for.
 *  Pure data — drives the buyer-facing résumé headline. */
export const CLASS_RESUME: Record<CitizenClass, { outputNoun: string; bestFor: string }> = {
  drifter: { outputNoun: "missions", bestFor: "owners who want to specialize it" },
  "content-agent": { outputNoun: "content jobs", bestFor: "creators & founders shipping content" },
  strategist: { outputNoun: "strategy briefs", bestFor: "founders fixing a launch" },
  closer: { outputNoun: "sales rewrites", bestFor: "anyone who has to sell" },
  analyst: { outputNoun: "research reports", bestFor: "operators sizing a market" },
  designer: { outputNoun: "visual concepts", bestFor: "brands & PFP projects" },
  "red-team": { outputNoun: "red-team reports", bestFor: "founders pre-mint" },
};

/** Rank labels by DOMINANT-skill point count. Generic ladder; a class may override
 *  its top label for flavor (see CLASS_TOP_LABEL). */
const RANK_LADDER: { min: number; label: string }[] = [
  { min: 0, label: "Initiate" },
  { min: 10, label: "Adept" },
  { min: 30, label: "Specialist" },
  { min: 75, label: "Master" },
  { min: 150, label: "Oracle" },
  { min: 300, label: "Legend" },
  { min: 600, label: "Mythic" },
];

/** The Oracle tier index — the rank that gets per-class flavoring (see CLASS_TOP_LABEL).
 *  Anchored by min so it stays correct as PRESTIGE tiers are appended above it. */
const ORACLE_TIER = RANK_LADDER.findIndex((r) => r.min === 150);

/** PRESTIGE tiers — status labels above the per-class top rank, shared by all classes
 *  so they read as a universal ceiling. Never flavored. */
const PRESTIGE_LABELS = new Set(["Legend", "Mythic"]);

/** True when a rank is a PRESTIGE tier (Legend / Mythic). */
export function isPrestige(rank: ClassRank): boolean {
  return PRESTIGE_LABELS.has(rank.label);
}

/** Flavored top-rank label per class (replaces "Oracle" at the 150+ tier). */
const CLASS_TOP_LABEL: Partial<Record<CitizenClass, string>> = {
  "content-agent": "Virtuoso",
  strategist: "Mastermind",
  closer: "Rainmaker",
  designer: "Art Director",
  "red-team": "Adversary",
  // analyst keeps "Oracle"
};

export type ClassRank = { tier: number; label: string };

export type Tuning = {
  /** Top focus tokens mined from the memory log (e.g. recurring activity). */
  focuses: { token: string; count: number }[];
  /** Headline "tuned for X" string, or null if not enough signal yet. */
  tunedFor: string | null;
  /** Total jobs+missions reflected in the record. */
  activityCount: number;
};

export type Specialization = {
  cls: CitizenClass;
  className: string;
  capability: string;
  rank: ClassRank;
  dominantSkill: SkillKey | null;
  dominantPoints: number;
  /** How lopsided the build is: 1.0 = monoclass, ~0.17 = perfectly even. */
  purity: number;
  tuning: Tuning;
  /** Buyer-facing résumé framing (output noun + target audience + track record). */
  resume: {
    outputNoun: string;
    bestFor: string;
    /** e.g. "61 red-team reports", or null if it hasn't shipped real work yet. */
    trackRecord: string | null;
  };
  /** Headline string for the spec sheet, e.g. "Level 80 Signal Artist · Master". */
  title: (level: number) => string;
};

function rankFor(cls: CitizenClass, points: number): ClassRank {
  let tier = 0;
  let label = RANK_LADDER[0].label;
  for (let i = 0; i < RANK_LADDER.length; i++) {
    if (points >= RANK_LADDER[i].min) {
      tier = i;
      label = RANK_LADDER[i].label;
    }
  }
  // Flavor the per-class top rank (the Oracle tier) — PRESTIGE tiers above it stay
  // universal/unflavored so Legend & Mythic read as a shared ceiling.
  if (tier === ORACLE_TIER && CLASS_TOP_LABEL[cls]) {
    label = CLASS_TOP_LABEL[cls]!;
  }
  return { tier, label };
}

/** Surface "tuned for X" from explicit [focus:x] tags in the memory log. */
export function deriveTuning(memoryLog: MemoryEntry[], jobsCompleted: number): Tuning {
  const counts = new Map<string, number>();
  let activity = 0;
  for (const e of memoryLog) {
    if (e.type === "levelup") continue;
    activity++;
    // RÉSUMÉ RULE: "tuned for X" comes ONLY from explicit [focus:x] tags, which
    // the route writes only for PROFESSIONAL missions. We do NOT tokenize raw
    // descriptions — that would let cosmetic/social work ("Deploy → neon-city")
    // pollute the professional profile. No tag → contributes to activity count
    // but never to the specialist focus.
    const tag = /\[focus:([a-z0-9 _-]{1,24})\]/i.exec(e.description);
    if (tag) {
      const t = tag[1].trim().toLowerCase();
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const focuses = Array.from(counts.entries())
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  // Only call it a "tuning" once a focus has real repetition.
  const top = focuses[0];
  const tunedFor = top && top.count >= 3 ? top.token : null;
  return { focuses, tunedFor, activityCount: Math.max(activity, jobsCompleted) };
}

/** THE derivation. Dominant skill = argmax(skills); ties broken by SKILL_KEYS order
 *  for determinism. All-zero → drifter. */
export function deriveSpec(p: CitizenProgress): Specialization {
  let dominant: SkillKey | null = null;
  let dominantPoints = 0;
  let total = 0;
  for (const k of SKILL_KEYS) {
    const v = p.skills[k] ?? 0;
    total += v;
    if (v > dominantPoints) {
      dominantPoints = v;
      dominant = k;
    }
  }

  const cls: CitizenClass = dominant && dominantPoints > 0 ? CLASS_BY_SKILL[dominant] : "drifter";
  const meta = CLASS_META[cls];
  const rank = rankFor(cls, dominantPoints);
  const purity = total > 0 ? dominantPoints / total : 0;
  const tuning = deriveTuning(p.memoryLog, p.jobsCompleted);

  // Track record = dominant-skill point count (each professional mission grants
  // +1 to its skill), framed with the class's output noun. "61 red-team reports",
  // or singular "1 red-team report" when there's exactly one.
  const resumeMeta = CLASS_RESUME[cls];
  const noun =
    dominantPoints === 1 ? resumeMeta.outputNoun.replace(/s$/, "") : resumeMeta.outputNoun;
  const trackRecord =
    cls !== "drifter" && dominantPoints > 0 ? `${dominantPoints} ${noun}` : null;

  return {
    cls,
    className: meta.name,
    capability: meta.capability,
    rank,
    dominantSkill: dominant,
    dominantPoints,
    purity,
    tuning,
    resume: { outputNoun: resumeMeta.outputNoun, bestFor: resumeMeta.bestFor, trackRecord },
    title: (level: number) =>
      cls === "drifter"
        ? `Level ${level} · Untrained`
        : `Level ${level} ${meta.name} · ${rank.label}`,
  };
}

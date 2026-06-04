/**
 * Abilities registry — the list of the six agent abilities and a safe, display-
 * only view of them for the UI (no resolvers, no instructions exposed).
 */
import type { Ability } from "@/lib/missions/abilities/ability";
import type { SkillKey } from "@/lib/progression-store";
import { MAKER } from "@/lib/missions/abilities/maker";
import { ANALYST } from "@/lib/missions/abilities/analyst";
import { BUILDER } from "@/lib/missions/abilities/builder";
import { COMMUNICATOR } from "@/lib/missions/abilities/communicator";
import { GUARDIAN } from "@/lib/missions/abilities/guardian";
import { SCOUT } from "@/lib/missions/abilities/scout";

/** The six abilities + the skill path each is gated on (must match catalog.ts).
 *  Each ability trains its own skill, so the class lines up with the work. */
export const ABILITY_DEFS: { ability: Ability; skill: SkillKey }[] = [
  { ability: MAKER, skill: "content" },        // CONTENT — write
  { ability: ANALYST, skill: "strategy" },     // STRATEGY — fix my launch (flagship)
  { ability: BUILDER, skill: "sales" },        // SALES — closer
  { ability: COMMUNICATOR, skill: "research" },// RESEARCH — analyst
  { ability: GUARDIAN, skill: "design" },      // DESIGN — designer
  { ability: SCOUT, skill: "risk" },           // RISK — red team
];

/** Display-only shape for the agent dashboard. Exposes labels + task keys/labels
 *  + the blurb, but NEVER the internal instructions or guardrail text. */
export type AbilityView = {
  id: string;
  label: string;
  blurb: string;
  skill: SkillKey;
  tasks: { key: string; label: string }[];
};

export function listAbilityViews(): AbilityView[] {
  return ABILITY_DEFS.map(({ ability, skill }) => ({
    id: ability.id,
    label: ability.label,
    blurb: ability.blurb,
    skill,
    tasks: ability.tasks.map((t) => ({ key: t.key, label: t.label })),
  }));
}

/**
 * Weekly city STATE — the spectatorship plane behind The Signal Report.
 *
 * Two hardened, status-only primitives (no money, no LLM-decided rewards), both
 * keyed to the ISO week:
 *
 *  1. CIV-WEEK TALLY — distinct citizens of a civilization that completed a
 *     COST-BEARING mission this week. Stored as a Redis SET (`SADD`/`SCARD`), so
 *     a citizen counts ONCE no matter how many times it ran (kills the
 *     whale-clicks win), attribution comes from getCitizen().civilization passed
 *     by the server (never parsed from a note string), and the winner is the civ
 *     with the most distinct PARTICIPANTS — a breadth signal, not a spend trophy.
 *     (security-redteam guardrails, 2026-06-09.)
 *
 *  2. WEEK-STAMPED ARTIFACT — each cost-bearing participant earns that week's
 *     "Carrier" artifact for its civ, e.g. `2026-W24 Carrier of Red Corruption`.
 *     The grant is IDEMPOTENT (a SET-NX gate per citizen per week → at most one
 *     per week, no re-roll fishing) and the artifact is an ENUM ID derived
 *     server-side (never free text from a brief). This is the renewable,
 *     un-backfillable collectible that turns a depleting record into a weekly
 *     ritual (economy-liveops: the D30 fix). It is STATUS, never currency — it
 *     cannot be transferred, priced, or cashed.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import { weekKeyOf } from "@/lib/carrier-of-week";
import { CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

const CIV_SUPPLY: Record<string, number> = {};
for (const c of citizensData as Array<{ civilization: string }>) {
  CIV_SUPPLY[c.civilization] = (CIV_SUPPLY[c.civilization] || 0) + 1;
}

// DEV-ONLY in-memory fallback (used only when !hasUpstash, i.e. local without
// Upstash creds). Production always has Upstash, so these Maps are never touched.
type Mem = { civWeek: Map<string, Set<number>>; granted: Set<string>; artifacts: Map<number, Set<string>> };
const g = globalThis as unknown as { __cityWeekMem?: Mem };
const mem: Mem = g.__cityWeekMem ?? (g.__cityWeekMem = { civWeek: new Map(), granted: new Set(), artifacts: new Map() });

function civWeekKey(week: string, slug: string): string {
  return `freelon:civweek:${week}:${slug}`;
}
function artifactSetKey(tokenId: number): string {
  return `freelon:artifacts:${tokenId}`;
}
function weekGrantKey(tokenId: number, week: string): string {
  return `freelon:artifact:granted:${tokenId}:${week}`;
}

// ── 1. CIV-WEEK TALLY ───────────────────────────────────────────────────────

/** Record that a citizen of `civSlug` completed a cost-bearing mission this
 *  week. Idempotent (set membership) — re-runs by the same citizen don't inflate
 *  the count. Best-effort: never throws (caller is in a paid response path). */
export async function tallyCivMission(tokenId: number, civSlug: string): Promise<void> {
  if (!civSlug || !CIVILIZATIONS[civSlug as keyof typeof CIVILIZATIONS]) return;
  const week = weekKeyOf(new Date());
  if (!hasUpstash) {
    const key = civWeekKey(week, civSlug);
    (mem.civWeek.get(key) ?? mem.civWeek.set(key, new Set()).get(key)!).add(tokenId);
    return;
  }
  await upstash(["SADD", civWeekKey(week, civSlug), String(tokenId)]).catch(() => {});
}

export type CivWeekStanding = {
  slug: string;
  name: string;
  color: string;
  active: number; // distinct citizens that acted this week
  supply: number; // total citizens of this civ
  rate: number; // active / supply (0..1)
};

/** Standings for a week: distinct active citizens per civ, supply-normalized.
 *  Sorted by active count desc (the winner = most distinct participants). */
export async function getCivWeekStandings(
  week: string = weekKeyOf(new Date()),
): Promise<{ week: string; standings: CivWeekStanding[]; totalActive: number }> {
  const slugs = Object.keys(CIVILIZATIONS);
  let counts: number[];
  if (!hasUpstash) {
    counts = slugs.map((s) => mem.civWeek.get(civWeekKey(week, s))?.size ?? 0);
  } else {
    counts = await Promise.all(
      slugs.map(async (s) => {
        const n = await upstash(["SCARD", civWeekKey(week, s)]).catch(() => 0);
        return typeof n === "number" ? n : Number(n) || 0;
      }),
    );
  }
  const standings: CivWeekStanding[] = slugs.map((slug, i) => {
    const def = CIVILIZATIONS[slug as keyof typeof CIVILIZATIONS];
    const supply = CIV_SUPPLY[slug] || 1;
    const active = counts[i];
    return { slug, name: def.name, color: def.color, active, supply, rate: active / supply };
  });
  standings.sort((a, b) => b.active - a.active || b.rate - a.rate);
  const totalActive = standings.reduce((s, c) => s + c.active, 0);
  return { week, standings, totalActive };
}

// ── 2. WEEK-STAMPED ARTIFACT ────────────────────────────────────────────────

export type Artifact = { id: string; title: string; week: string; civSlug: string; civName: string };

/** The deterministic artifact for a (week, civ) — pure, no I/O. */
export function weekArtifactFor(week: string, civSlug: string): Artifact {
  const def = CIVILIZATIONS[civSlug as keyof typeof CIVILIZATIONS];
  const civName = def?.name || "FREELON CITY";
  return { id: `weekcarrier:${week}:${civSlug}`, title: `${week} Carrier of ${civName}`, week, civSlug, civName };
}

/** Reconstruct an artifact's display from its enum id (no free text is ever
 *  stored — the id IS the artifact, the title is derived). */
export function artifactFromId(id: string): Artifact | null {
  const parts = id.split(":");
  if (parts[0] !== "weekcarrier" || parts.length < 3) return null;
  return weekArtifactFor(parts[1], parts[2]);
}

/** Grant this week's Carrier artifact to a citizen. IDEMPOTENT via SET-NX — at
 *  most one grant per citizen per ISO week (no re-roll fishing). Status only. */
export async function grantWeekArtifact(
  tokenId: number,
  civSlug: string,
): Promise<{ granted: boolean; artifact: Artifact }> {
  const week = weekKeyOf(new Date());
  const artifact = weekArtifactFor(week, civSlug);
  if (!hasUpstash) {
    const gk = weekGrantKey(tokenId, week);
    if (mem.granted.has(gk)) return { granted: false, artifact };
    mem.granted.add(gk);
    (mem.artifacts.get(tokenId) ?? mem.artifacts.set(tokenId, new Set()).get(tokenId)!).add(artifact.id);
    return { granted: true, artifact };
  }
  const nx = await upstash(["SET", weekGrantKey(tokenId, week), "1", "NX"]).catch(() => null);
  if (nx === "OK") {
    await upstash(["SADD", artifactSetKey(tokenId), artifact.id]).catch(() => {});
    return { granted: true, artifact };
  }
  return { granted: false, artifact };
}

/** All artifacts a citizen has earned (newest week first). */
export async function getArtifacts(tokenId: number): Promise<Artifact[]> {
  let ids: string[];
  if (!hasUpstash) {
    ids = Array.from(mem.artifacts.get(tokenId) ?? []);
  } else {
    const raw = await upstash(["SMEMBERS", artifactSetKey(tokenId)]).catch(() => []);
    ids = Array.isArray(raw) ? (raw as string[]) : [];
  }
  return ids
    .map(artifactFromId)
    .filter((a): a is Artifact => !!a)
    .sort((a, b) => b.week.localeCompare(a.week));
}

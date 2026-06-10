/**
 * "Top agents" — the public proof that citizens become real, specialized assets.
 * Reads the level leaderboard (only citizens with activity are in it), enriches
 * each with its derived spec, and keeps the ones that have actually SPECIALIZED
 * (non-drifter). This is the buyer-facing "look what these are becoming" rail.
 *
 * PURE-derived spec + read-only — safe to render server-side on a cached page.
 */
import { topCitizens, getProgress } from "@/lib/progression-store";
import { deriveSpec, type CitizenClass } from "@/lib/specialization";

export type TopAgent = {
  tokenId: number;
  level: number;
  cls: CitizenClass;
  className: string;
  rankLabel: string;
  tunedFor: string | null;
  trackRecord: string | null;
  /** True for hand-seeded founder display-models (honesty flag for the UI). */
  demo: boolean;
};

export async function topTrainedAgents(limit = 8): Promise<TopAgent[]> {
  // Pull a wider slice by level, then keep only the specialized ones (a citizen
  // that only ran the cosmetic toy is still a drifter and shouldn't headline).
  // includeDemo: this rail's consumers (TopAgents, CitizenResume) render the
  // "· EXAMPLE" label themselves — the demo flag is surfaced, never hidden.
  // Callers that must EXCLUDE demo (carrier-of-week crown) filter on .demo.
  const rows = await topCitizens("level", limit * 4, { includeDemo: true }).catch(() => []);
  if (rows.length === 0) return [];

  const progs = await Promise.all(rows.map((r) => getProgress(r.tokenId).catch(() => null)));

  const out: TopAgent[] = [];
  for (let i = 0; i < rows.length; i++) {
    const p = progs[i];
    if (!p) continue;
    const spec = deriveSpec(p);
    if (spec.cls === "drifter") continue;
    out.push({
      tokenId: rows[i].tokenId,
      level: p.level,
      cls: spec.cls,
      className: spec.className,
      rankLabel: spec.rank.label,
      tunedFor: spec.tuning.tunedFor,
      trackRecord: spec.resume.trackRecord,
      demo: !!p.demo,
    });
    if (out.length >= limit) break;
  }
  return out;
}

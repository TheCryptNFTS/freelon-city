/**
 * runRealMission — run ONE genuine mission on a citizen, server-side, the same
 * way the HTTP route does: resolve via the real resolver (a REAL LLM call), then
 * apply real progression (XP + skill + memory). This produces GENUINE history,
 * not seeded numbers — the agent actually did the work.
 *
 * Distinct from seedProgress (which fakes the numbers for a display model). The
 * founder "train" tool uses THIS so the trained agents on the live site are real
 * work, with real AI output stored in the body-of-work.
 *
 * It intentionally skips the route's owner-auth / payment / budget gates — it's
 * an admin/operator action, not a holder request — but the RESOLVER and
 * PROGRESSION are the exact production code paths.
 */
import { getCitizen } from "@/lib/citizens";
import { getProgress, applyMission } from "@/lib/progression-store";
// Import the BARREL (not registry directly) so importing this module also runs
// the catalog's registerMission() side effects — otherwise getMission() sees an
// empty registry. Same reason the HTTP route imports "@/lib/missions".
import { getMission } from "@/lib/missions";
import { addAgentWork } from "@/lib/agent-history";
import { briefIsStorable } from "@/lib/missions/memory-filter";
import type { MissionContext } from "@/lib/missions/types";

export type RealMissionResult =
  | { ok: true; tokenId: number; missionId: string; level: number; title: string; preview: string }
  | { ok: false; tokenId: number; missionId: string; error: string };

export async function runRealMission(args: {
  tokenId: number;
  missionId: string;
  brief: string;
}): Promise<RealMissionResult> {
  const { tokenId, missionId, brief } = args;
  const citizen = getCitizen(tokenId);
  if (!citizen) return { ok: false, tokenId, missionId, error: "unknown_citizen" };
  const mission = getMission(missionId);
  if (!mission) return { ok: false, tokenId, missionId, error: "unknown_mission" };

  const progress = await getProgress(tokenId);

  // Build the mission input the way the route does: "taskKey: brief" for prompt
  // abilities. For abilities we let the caller pass the full "task: brief".
  const input = mission.inputMode === "prompt" ? brief.trim().slice(0, 600) : "";

  // REAL resolve — this calls the live model. paid:false → cheap model (cost guard).
  const ctx: MissionContext = { citizen, progress, input, walletAddress: "admin", paid: false };
  let output;
  try {
    output = await mission.resolve(ctx);
  } catch (e) {
    return { ok: false, tokenId, missionId, error: `resolver_threw:${(e as Error).message}` };
  }
  if (!output.ok) return { ok: false, tokenId, missionId, error: output.error || "no_output" };

  // Same résumé rule as the route: only professional work shapes class + focus.
  const category = mission.category ?? "professional";
  const focusHint =
    category === "professional" && typeof output.meta?.focus === "string" ? output.meta.focus : undefined;

  const result = await applyMission({
    tokenId,
    missionTitle: mission.title,
    outputTitle: output.title,
    skill: mission.gate.skill,
    rewardXp: mission.rewardXp,
    costBurned: mission.cost,
    civSlug: citizen.civilization,
    focusHint,
    countsTowardClass: category === "professional",
  });

  // Store the real output in the body of work (if storable), like the route.
  const metaAbility = typeof output.meta?.ability === "string" ? output.meta.ability : null;
  const isImage = output.meta?.kind === "image";
  if ((metaAbility || isImage) && (isImage || briefIsStorable(input))) {
    await addAgentWork(tokenId, {
      ability: metaAbility ?? "deploy",
      abilityLabel: metaAbility ?? "Deploy",
      task: typeof output.meta?.task === "string" ? output.meta.task : "",
      brief: input,
      kind: isImage ? "image" : "text",
      body: output.body,
      level: result.progress.level,
    }).catch(() => {});
  }

  return {
    ok: true,
    tokenId,
    missionId,
    level: result.progress.level,
    title: output.title,
    preview: output.body.slice(0, 120),
  };
}

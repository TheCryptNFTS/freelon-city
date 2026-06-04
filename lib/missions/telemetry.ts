/**
 * Mission telemetry — the data that actually answers the product question:
 * "which mission do holders pay ⬡ for?"
 *
 * Two counters per mission, incremented on every successful run:
 *   - runs:   how many times deployed
 *   - burned: total ⬡ spent on it
 *
 * Atomic INCR via Upstash; in-memory fallback for dev. Read listMissionStats()
 * for a dashboard once there's data to show.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const RUNS = (id: string) => `freelon:mission:runs:${id}`;
const BURNED = (id: string) => `freelon:mission:burned:${id}`;

const memRuns = new Map<string, number>();
const memBurned = new Map<string, number>();

/** Record a successful, paid run. Non-fatal — telemetry must never break the
 *  mission. */
export async function recordRun(missionId: string, costBurned: number): Promise<void> {
  if (hasUpstash) {
    try {
      await Promise.all([
        upstash(["INCR", RUNS(missionId)]),
        upstash(["INCRBY", BURNED(missionId), String(costBurned)]),
      ]);
      return;
    } catch {
      /* fall through to memory */
    }
  }
  memRuns.set(missionId, (memRuns.get(missionId) ?? 0) + 1);
  memBurned.set(missionId, (memBurned.get(missionId) ?? 0) + costBurned);
}

export type MissionStat = { missionId: string; runs: number; burned: number };

export async function getMissionStat(missionId: string): Promise<MissionStat> {
  if (!hasUpstash) {
    return {
      missionId,
      runs: memRuns.get(missionId) ?? 0,
      burned: memBurned.get(missionId) ?? 0,
    };
  }
  try {
    const [r, b] = (await Promise.all([
      upstash(["GET", RUNS(missionId)]),
      upstash(["GET", BURNED(missionId)]),
    ])) as [string | null, string | null];
    return { missionId, runs: Number(r ?? 0), burned: Number(b ?? 0) };
  } catch {
    return { missionId, runs: 0, burned: 0 };
  }
}

/** Stats for a set of mission ids, sorted by ⬡ burned (the money signal). */
export async function listMissionStats(missionIds: string[]): Promise<MissionStat[]> {
  const stats = await Promise.all(missionIds.map(getMissionStat));
  return stats.sort((a, b) => b.burned - a.burned);
}

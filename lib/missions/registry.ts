/**
 * Mission registry. The catalog registers missions here at import time; the
 * endpoint and UI read them back. getMission() is the server-side ALLOWLIST —
 * a client can only run an id that exists here, and the cost/gate/reward are
 * read from the registered Mission, never from the request body.
 */

import type { Mission } from "@/lib/missions/types";
import type { CitizenProgress } from "@/lib/progression-store";

const registry = new Map<string, Mission>();

export function registerMission(m: Mission): void {
  registry.set(m.id, m);
}

export function getMission(id: string): Mission | null {
  return registry.get(id) ?? null;
}

export function listMissions(): Mission[] {
  return Array.from(registry.values());
}

/** A mission is unlocked when the citizen's skill level meets the gate. */
export function isUnlocked(m: Mission, progress: CitizenProgress): boolean {
  // The gate is on a skill, but "level" in the gate means the citizen's
  // overall level — skills feed XP feeds level. We gate on overall level so
  // any path of work can unlock a mission, while the skill names the relevant
  // discipline (and the mission trains it).
  return progress.level >= m.gate.minLevel;
}

/** Missions split into unlocked / locked for the given citizen, for the UI. */
export function listMissionsForCitizen(progress: CitizenProgress): {
  unlocked: Mission[];
  locked: Mission[];
} {
  const all = listMissions();
  return {
    unlocked: all.filter((m) => isUnlocked(m, progress)),
    locked: all.filter((m) => !isUnlocked(m, progress)),
  };
}

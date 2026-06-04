/**
 * Agent output history — a per-citizen log of what its agents actually produced
 * (the citizen's "body of work"). Distinct from the progression memory log: this
 * stores the real OUTPUTS (text/image URL) so the holder can see and revisit
 * everything their citizen has made. Surfaced on the agent dashboard.
 *
 * Keyed by token (survives sale, like all progression). Capped ring buffer.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type AgentWork = {
  id: string; // unique per entry
  ability: string; // e.g. "maker"
  abilityLabel: string;
  task: string; // e.g. "caption"
  brief: string; // the holder's brief (clamped)
  kind: "text" | "image";
  body: string; // text output, or image URL
  level: number; // citizen level when produced
  timestamp: number;
};

const CAP = 40;
const KEY = (tokenId: number) => `freelon:agentwork:v1:${tokenId}`;
// globalThis-backed so the dev in-memory fallback is shared across Next's
// per-route module bundles (a write from one route is visible to another). Prod
// uses Upstash, so this Map is never the source of truth there.
const memory: Map<number, AgentWork[]> =
  ((globalThis as { __freelonAgentWorkMem?: Map<number, AgentWork[]> }).__freelonAgentWorkMem ??=
    new Map<number, AgentWork[]>());

export async function getAgentHistory(tokenId: number): Promise<AgentWork[]> {
  if (!hasUpstash) return memory.get(tokenId) ?? [];
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    return raw ? (JSON.parse(raw) as AgentWork[]) : [];
  } catch {
    return [];
  }
}

export async function addAgentWork(tokenId: number, entry: Omit<AgentWork, "id" | "timestamp">): Promise<void> {
  const rec: AgentWork = {
    ...entry,
    id: `${tokenId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    brief: entry.brief.slice(0, 200),
  };
  const list = await getAgentHistory(tokenId);
  list.unshift(rec);
  if (list.length > CAP) list.length = CAP;
  if (!hasUpstash) {
    memory.set(tokenId, list);
    return;
  }
  try {
    await upstash(["SET", KEY(tokenId), JSON.stringify(list)]);
  } catch {
    /* non-fatal — history is a nicety, never blocks the mission */
  }
}

/**
 * Per-wallet (or per-handle) quest progress + completion log.
 * Stores a Set of completed quest IDs and a progress map for in-flight quests.
 */

import { creditWalletHex } from "@/lib/wallet-hex-store";

export type QuestId =
  | "city-tourist"   // visit all 10 civilization pages
  | "archivist"      // open all 35 honorary deep-lore panels
  | "hex-hunter"     // find 5+ secrets in /secrets
  | "doctrine-master"; // find all 10 doctrines' hidden quotes (future)

export const QUEST_REWARDS: Record<QuestId, number> = {
  "city-tourist": 25,
  archivist: 100,
  "hex-hunter": 75,
  "doctrine-master": 500,
};

export const QUEST_TARGETS: Record<QuestId, number> = {
  "city-tourist": 10,
  archivist: 35,
  "hex-hunter": 5,
  "doctrine-master": 10,
};

export type QuestState = {
  key: string; // wallet address (lowercased) OR `handle:<name>`
  progress: Record<string, string[]>; // questId → array of completed step IDs (e.g. ["blue-synthesis"])
  completed: string[]; // [questId, ...]
  lastUpdate: number;
};

const memory = new Map<string, QuestState>();
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY = (key: string) => `freelon:quests:v1:${key.toLowerCase()}`;

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

function empty(key: string): QuestState {
  return {
    key: key.toLowerCase(),
    progress: {},
    completed: [],
    lastUpdate: Date.now(),
  };
}

export async function getQuests(key: string): Promise<QuestState> {
  if (!hasUpstash) return memory.get(key.toLowerCase()) ?? empty(key);
  try {
    const raw = (await upstash(["GET", KEY(key)])) as string | null;
    if (!raw) return empty(key);
    return JSON.parse(raw) as QuestState;
  } catch {
    return empty(key);
  }
}

async function setQuests(rec: QuestState): Promise<void> {
  rec.key = rec.key.toLowerCase();
  rec.lastUpdate = Date.now();
  if (!hasUpstash) {
    memory.set(rec.key, rec);
    return;
  }
  await upstash(["SET", KEY(rec.key), JSON.stringify(rec)]);
}

/**
 * Mark a step of a quest as done. If this completes the quest and it wasn't
 * already complete, award the reward to the wallet (key must be an address
 * for the credit to land in the hex ledger — for handle-keyed callers, the
 * reward is recorded but not credited until they bind a wallet).
 */
export async function markStep(
  key: string,
  questId: QuestId,
  stepId: string,
): Promise<{
  state: QuestState;
  justCompleted: boolean;
  reward: number;
  progress: number;
  target: number;
}> {
  const state = await getQuests(key);
  const target = QUEST_TARGETS[questId];

  if (state.completed.includes(questId)) {
    return {
      state,
      justCompleted: false,
      reward: 0,
      progress: target,
      target,
    };
  }

  const steps = new Set(state.progress[questId] || []);
  steps.add(stepId);
  state.progress[questId] = Array.from(steps);
  await setQuests(state);

  if (steps.size >= target) {
    state.completed.push(questId);
    state.lastUpdate = Date.now();
    await setQuests(state);
    const reward = QUEST_REWARDS[questId];
    // Credit hex if key looks like a 0x address
    if (/^0x[a-f0-9]{40}$/i.test(state.key)) {
      try {
        await creditWalletHex(state.key, reward, {
          kind: "quest",
          note: `Quest: ${questId} (+${reward}⬡)`,
        });
      } catch {
        /* non-fatal */
      }
    }
    return { state, justCompleted: true, reward, progress: target, target };
  }

  return {
    state,
    justCompleted: false,
    reward: 0,
    progress: steps.size,
    target,
  };
}

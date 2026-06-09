/**
 * Per-wallet (or per-handle) quest progress + completion log.
 * Stores a Set of completed quest IDs and a progress map for in-flight quests.
 */

import { creditWalletHex } from "@/lib/wallet-hex-store";
import { CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";
import { ECONOMY } from "@/lib/economy-constants";
import { upstash, hasUpstash } from "@/lib/upstash-client";

// Allowlists per quest. Reject anything not on the list — closes the
// "submit fake stepIds to farm the reward" exploit.
const CIV_SLUGS = new Set(Object.keys(CIVILIZATIONS));
const HONORARY_IDS = new Set(
  (citizensData as Array<{ id: number; tier: string }>)
    .filter((c) => c.tier === "Honorary")
    .map((c) => `honoree:${c.id.toString().padStart(4, "0")}`),
);
const HEX_HUNTER_STEPS = new Set([
  "code0404",
  "all-civs",
  "ghost404",
  "fifth-bracket",
  "channels",
]);
// Doctrine Master fragment stepIds match the doctrine slugs lowercased
const DOCTRINE_STEPS = new Set([
  "synthesis", "corruption", "growth", "oracle", "sovereignty",
  "void", "luxury", "transmission", "fracture", "machine",
]);

function isValidStepForQuest(quest: QuestId, stepId: string): boolean {
  switch (quest) {
    case "city-tourist":    return CIV_SLUGS.has(stepId);
    case "archivist":       return HONORARY_IDS.has(stepId);
    case "hex-hunter":      return HEX_HUNTER_STEPS.has(stepId);
    case "doctrine-master": return DOCTRINE_STEPS.has(stepId);
    default:                return false;
  }
}

export type QuestId =
  | "city-tourist"   // visit all 10 civilization pages
  | "archivist"      // open all 35 honorary deep-lore panels
  | "hex-hunter"     // find 5+ secrets in /secrets
  | "doctrine-master"; // find all 10 doctrines' hidden quotes (future)

export const QUEST_REWARDS: Record<QuestId, number> = {
  "city-tourist": ECONOMY.CITY_TOURIST_REWARD,
  archivist: ECONOMY.ARCHIVIST_REWARD,
  "hex-hunter": ECONOMY.HEX_HUNTER_REWARD,
  "doctrine-master": ECONOMY.DOCTRINE_MASTER_REWARD,
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

const KEY = (key: string) => `freelon:quests:v1:${key.toLowerCase()}`;

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
 * Advisory mutex per quest-key to serialize the read-modify-write in
 * markStep. Closes the classic race where two concurrent step submissions
 * read the same initial state, add their own step locally, and the second
 * write clobbers the first — losing one step of progress.
 *
 * 3s TTL means a crash mid-update self-heals within 3s.
 */
async function acquireLock(key: string, retries = 5): Promise<boolean> {
  if (!hasUpstash) return true; // in-process JS is single-threaded
  const lockKey = `freelon:quests:lock:${key.toLowerCase()}`;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await upstash(["SET", lockKey, "1", "NX", "EX", "3"]);
      if (res === "OK") return true;
    } catch { return false; }
    await new Promise((r) => setTimeout(r, 80 + i * 40));
  }
  return false;
}

async function releaseLock(key: string): Promise<void> {
  if (!hasUpstash) return;
  const lockKey = `freelon:quests:lock:${key.toLowerCase()}`;
  try { await upstash(["DEL", lockKey]); } catch {}
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
  // Serialize concurrent submissions for this key to prevent step loss
  // under contention. If we can't grab the lock in ~600ms, proceed
  // anyway — a lost step is a recoverable annoyance, not a security
  // issue, and we don't want to block legitimate users on a hot key.
  const gotLock = await acquireLock(key);
  try {
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

    // SECURITY: reject stepIds not on the allowlist for this quest.
    // Without this, callers could POST arbitrary strings to farm rewards.
    if (!isValidStepForQuest(questId, stepId)) {
      const current = state.progress[questId]?.length ?? 0;
      return {
        state,
        justCompleted: false,
        reward: 0,
        progress: current,
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
          }, { farmable: true });
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
  } finally {
    if (gotLock) await releaseLock(key);
  }
}

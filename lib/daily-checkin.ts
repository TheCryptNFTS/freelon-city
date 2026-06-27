/**
 * Daily Check-In — the free retention hook (behavioral expert's #1).
 *
 * Once per UTC day, each citizen says ONE short thing only IT would say — shaped
 * by its identity, civilization, class, level, and memory. It's free, generated
 * once and cached for the day (so it can't be farmed and costs ~nothing), and
 * different for every NFT. This is the surface a holder returns to daily, and
 * where paid upskilling later gets offered.
 *
 * NOT a currency, NOT earned-balance, NOT farmable. Pure words + a visible rank.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";

export type CheckIn = {
  tokenId: number;
  day: string; // UTC YYYY-MM-DD
  line: string;
  level: number;
  className: string;
  generatedAt: number;
  /** Consecutive days this citizen has transmitted (yesterday existed → +1). */
  streak?: number;
  /** True when yesterday's transmission existed — i.e. someone came back. */
  isReturn?: boolean;
};

const KEY = (tokenId: number, day: string) => `freelon:checkin:v1:${tokenId}:${day}`;
const TTL_SEC = 48 * 60 * 60; // keep 2 days; one day is the live one

function utcDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** The UTC day before the given YYYY-MM-DD string. */
function prevUtcDay(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const memory = new Map<string, CheckIn>();

/** Read today's check-in if it already exists (no generation). Public/cheap. */
export async function getCheckIn(tokenId: number, day = utcDay()): Promise<CheckIn | null> {
  const k = KEY(tokenId, day);
  if (!hasUpstash) return memory.get(k) ?? null;
  try {
    const raw = (await upstash(["GET", k])) as string | null;
    return raw ? (JSON.parse(raw) as CheckIn) : null;
  } catch {
    return null;
  }
}

async function store(rec: CheckIn): Promise<void> {
  const k = KEY(rec.tokenId, rec.day);
  if (!hasUpstash) {
    memory.set(k, rec);
    return;
  }
  await upstash(["SET", k, JSON.stringify(rec), "EX", String(TTL_SEC)]);
}

/**
 * Get today's check-in, generating it once if absent. The SET-NX guard makes
 * generation idempotent per citizen per day — concurrent loads don't double-call
 * the model, and it genuinely can't be farmed (one line per day, cached).
 */
export async function getOrGenerateCheckIn(tokenId: number, day = utcDay()): Promise<CheckIn | null> {
  const existing = await getCheckIn(tokenId, day);
  if (existing) return existing;

  const citizen = getCitizen(tokenId);
  if (!citizen) return null;

  // Idempotency lock: only the first caller generates; others read the result.
  const lockKey = `freelon:checkin:lock:${tokenId}:${day}`;
  if (hasUpstash) {
    try {
      const got = await upstash(["SET", lockKey, "1", "NX", "EX", "30"]);
      if (got !== "OK") {
        // Someone else is generating — brief wait then read.
        await new Promise((r) => setTimeout(r, 1200));
        return (await getCheckIn(tokenId, day)) ?? null;
      }
    } catch {
      /* proceed without lock */
    }
  }

  const progress = await getProgress(tokenId);
  const { system, classLabel } = buildPersona(citizen, progress);

  // Continuity is the whole thesis: a FREELON that REMEMBERS you. If it transmitted
  // yesterday, the holder has returned — so the line must visibly pick up the thread
  // instead of regenerating from scratch. This is what makes "it remembers me" felt.
  const prev = await getCheckIn(tokenId, prevUtcDay(day));
  const isReturn = !!prev;
  const streak = prev ? (prev.streak ?? 1) + 1 : 1;

  const continuity = prev
    ? `Yesterday you transmitted: "${prev.line}". The holder has come back today` +
      (streak >= 3 ? ` — ${streak} days running` : "") +
      `. Open by acknowledging their return and pick up the thread from yesterday (a follow-up, a change, a consequence). Do NOT repeat yesterday's line. `
    : "";

  const prompt =
    "It is a new day in FREELON CITY. " + continuity +
    "In ONE or TWO sentences, give your daily transmission — " +
    "a brief in-character thought, observation, or report for the holder who watches over you. " +
    "Make it specific to who you are and what you've done. No preamble, no quotes, just the line.";

  // Daily check-in is a light background task — always the cheap model.
  const res = await citizenReason({ system, user: prompt, maxTokens: 120, model: modelFor("dailyCheckIn") });
  if (!res.ok) return null;

  const rec: CheckIn = {
    tokenId,
    day,
    line: res.text,
    level: progress.level,
    className: classLabel,
    generatedAt: Date.now(),
    streak,
    isReturn,
  };
  await store(rec);
  return rec;
}

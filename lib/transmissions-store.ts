/**
 * TRANSMISSIONS store — user-generated content from carriers.
 *
 * Each transmission is an image URL + caption + civ alignment posted by
 * an X-verified carrier (≥1 citizen, 100 hex burn). Other carriers can
 * signal (free 1-per-wallet upvote) or boost (hex-burn amplification).
 *
 * Storage:
 *   freelon:tx:v1:<id>                → JSON record
 *   freelon:tx:index                  → sorted set, score = createdAt (recency)
 *   freelon:tx:byCiv:<slug>           → sorted set per civ, score = createdAt
 *   freelon:tx:byScore                → sorted set, score = signals + sqrt(boostHex)
 *   freelon:tx:signal:<id>:<wallet>   → marker (one signal per wallet)
 *   freelon:tx:report:<id>:<wallet>   → marker (one report per wallet)
 *
 * Soft-launch moderation: 3 reports auto-hide pending review.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const memory = {
  records: new Map<string, Transmission>(),
  index: new Map<string, number>(), // id → ts
  byScore: new Map<string, number>(),
  votes: new Set<string>(),         // "id:wallet"
  reports: new Set<string>(),       // "id:wallet"
};

const KEY = (id: string) => `freelon:tx:v1:${id}`;
const IDX_RECENT = "freelon:tx:index";
const IDX_SCORE = "freelon:tx:byScore";
const IDX_CIV = (slug: string) => `freelon:tx:byCiv:${slug}`;
const KEY_SIGNAL = (id: string, w: string) => `freelon:tx:signal:${id}:${w.toLowerCase()}`;
const KEY_REPORT = (id: string, w: string) => `freelon:tx:report:${id}:${w.toLowerCase()}`;

// ─── Types ───────────────────────────────────────────────────────────

export type Transmission = {
  id: string;
  /** Lowercased wallet of the author. */
  author: string;
  /** Author's X handle at submit time (lowercased, no @). */
  authorHandle: string;
  /** Civ slug the transmission is aligned with. */
  civ: string;
  /** 1-280 char caption. */
  caption: string;
  /** Public URL of the image (paste-host model). */
  imageUrl: string;
  /** Unix ms. */
  createdAt: number;
  /** Free 1-per-wallet upvotes. */
  signals: number;
  /** Total hex burned in boost amplification. */
  boostHex: number;
  /** Soft-moderation counter. ≥3 hides the entry pending review. */
  reports: number;
  /** "live" | "hidden" (3+ reports) | "removed" (manual). */
  status: "live" | "hidden" | "removed";
};

export type TransmissionPublic = Omit<Transmission, "author"> & {
  authorShort: string;
  score: number;
};

// ─── Helpers ────────────────────────────────────────────────────────

/** Score: signals × √(1 + boostHex/100). Boosts amplify but never dominate
 * pure community signals; the sqrt curve ensures 10× the hex isn't 10× score. */
export function computeScore(t: Transmission): number {
  const boostMultiplier = Math.sqrt(1 + t.boostHex / 100);
  return Math.round(t.signals * boostMultiplier * 10) / 10;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function toPublic(t: Transmission): TransmissionPublic {
  const { author, ...rest } = t;
  return {
    ...rest,
    authorShort: shortAddr(author),
    score: computeScore(t),
  };
}

export function generateId(): string {
  // 12 chars base36 timestamp + 8 random — short, sortable, collision-safe enough
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${ts}${rnd}`;
}

// ─── CRUD ───────────────────────────────────────────────────────────

export async function saveTransmission(t: Transmission): Promise<void> {
  if (!hasUpstash) {
    memory.records.set(t.id, t);
    memory.index.set(t.id, t.createdAt);
    memory.byScore.set(t.id, computeScore(t));
    return;
  }
  await Promise.all([
    upstash(["SET", KEY(t.id), JSON.stringify(t)]),
    upstash(["ZADD", IDX_RECENT, String(t.createdAt), t.id]),
    upstash(["ZADD", IDX_SCORE, String(computeScore(t)), t.id]),
    upstash(["ZADD", IDX_CIV(t.civ), String(t.createdAt), t.id]),
  ]);
}

export async function getTransmission(id: string): Promise<Transmission | null> {
  if (!hasUpstash) return memory.records.get(id) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(id)])) as string | null;
    if (!raw) return null;
    return JSON.parse(raw) as Transmission;
  } catch {
    return null;
  }
}

export async function listTransmissions(opts: {
  by?: "recent" | "score";
  civ?: string | null;
  limit?: number;
  offset?: number;
} = {}): Promise<TransmissionPublic[]> {
  const limit = Math.min(opts.limit ?? 30, 100);
  const offset = opts.offset ?? 0;
  const by = opts.by ?? "recent";
  const civ = opts.civ || null;

  if (!hasUpstash) {
    const all = [...memory.records.values()].filter(
      (t) => t.status === "live" && (!civ || t.civ === civ),
    );
    all.sort((a, b) => by === "score" ? computeScore(b) - computeScore(a) : b.createdAt - a.createdAt);
    return all.slice(offset, offset + limit).map(toPublic);
  }

  // Upstash: pick the right index, ZREVRANGE
  const indexKey = civ ? IDX_CIV(civ) : by === "score" ? IDX_SCORE : IDX_RECENT;
  try {
    const ids = (await upstash([
      "ZREVRANGE",
      indexKey,
      String(offset),
      String(offset + limit - 1),
    ])) as string[] | null;
    if (!ids || ids.length === 0) return [];
    // Batch GET
    const keys = ids.map((id) => KEY(id));
    const raws = (await upstash(["MGET", ...keys])) as (string | null)[];
    const out: TransmissionPublic[] = [];
    for (const raw of raws) {
      if (!raw) continue;
      try {
        const t = JSON.parse(raw) as Transmission;
        if (t.status === "live") out.push(toPublic(t));
      } catch {/* skip corrupt */}
    }
    return out;
  } catch {
    return [];
  }
}

// ─── Interactions ────────────────────────────────────────────────────

export async function hasSignaled(id: string, wallet: string): Promise<boolean> {
  if (!hasUpstash) return memory.votes.has(`${id}:${wallet.toLowerCase()}`);
  try {
    const r = await upstash(["EXISTS", KEY_SIGNAL(id, wallet)]);
    return r === 1 || r === "1";
  } catch {
    return false;
  }
}

export async function signalTransmission(id: string, wallet: string): Promise<{ ok: boolean; alreadyVoted?: boolean; t?: Transmission }> {
  const w = wallet.toLowerCase();
  if (await hasSignaled(id, w)) return { ok: false, alreadyVoted: true };
  const t = await getTransmission(id);
  if (!t || t.status !== "live") return { ok: false };

  if (!hasUpstash) {
    memory.votes.add(`${id}:${w}`);
  } else {
    // 90-day TTL on the vote marker so memory doesn't grow forever
    await upstash(["SETEX", KEY_SIGNAL(id, w), String(90 * 86400), "1"]);
  }

  t.signals++;
  await saveTransmission(t);
  return { ok: true, t };
}

export async function boostTransmission(
  id: string,
  wallet: string,
  hexAmount: number,
): Promise<{ ok: boolean; t?: Transmission }> {
  if (hexAmount <= 0) return { ok: false };
  const t = await getTransmission(id);
  if (!t || t.status !== "live") return { ok: false };
  // Boost does NOT deduplicate per wallet — anyone can keep boosting.
  // The hex debit is handled by the caller (API route).
  t.boostHex += hexAmount;
  await saveTransmission(t);
  void wallet; // not used in store; caller verifies session
  return { ok: true, t };
}

export async function reportTransmission(id: string, wallet: string): Promise<{ ok: boolean; alreadyReported?: boolean; hidden?: boolean }> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) {
    if (memory.reports.has(`${id}:${w}`)) return { ok: false, alreadyReported: true };
    memory.reports.add(`${id}:${w}`);
  } else {
    const existed = await upstash(["EXISTS", KEY_REPORT(id, w)]);
    if (existed === 1 || existed === "1") return { ok: false, alreadyReported: true };
    await upstash(["SETEX", KEY_REPORT(id, w), String(90 * 86400), "1"]);
  }
  const t = await getTransmission(id);
  if (!t || t.status !== "live") return { ok: false };
  t.reports++;
  let hidden = false;
  if (t.reports >= 3) {
    t.status = "hidden";
    hidden = true;
  }
  await saveTransmission(t);
  return { ok: true, hidden };
}

// ─── Author-side ─────────────────────────────────────────────────────

export async function recentByAuthor(wallet: string, limit = 5): Promise<TransmissionPublic[]> {
  const lower = wallet.toLowerCase();
  if (!hasUpstash) {
    return [...memory.records.values()]
      .filter((t) => t.author === lower && t.status === "live")
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map(toPublic);
  }
  // Pragmatic: scan top-N recent transmissions and filter client-side. For
  // higher scale we'd add a per-author index, but this is fine for v1.
  const ids = (await upstash([
    "ZREVRANGE",
    IDX_RECENT,
    "0",
    "200",
  ])) as string[] | null;
  if (!ids || ids.length === 0) return [];
  const raws = (await upstash(["MGET", ...ids.map(KEY)])) as (string | null)[];
  const out: TransmissionPublic[] = [];
  for (const raw of raws) {
    if (!raw) continue;
    try {
      const t = JSON.parse(raw) as Transmission;
      if (t.author === lower && t.status === "live") out.push(toPublic(t));
      if (out.length >= limit) break;
    } catch {/* skip */}
  }
  return out;
}

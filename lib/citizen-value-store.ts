/**
 * Per-citizen accumulated hex + value + civ rank.
 *
 * Spec (founder 2026-05-25):
 *   - Each citizen NFT accumulates hex from trade events only.
 *     Every sale that touches token #X adds +CITIZEN_HEX_PER_SALE to
 *     that token's lifetime hex ledger.
 *   - Citizen "value" = weighted blend of last sale ETH, trait rarity,
 *     accumulated hex, and days-held-by-current-carrier. 0–1000 scale.
 *   - Civ rank = position within citizen's own civilization, by value.
 *     "#3 of 600 in Red Corruption" — bragging right.
 *
 * Storage (Upstash Redis with in-memory fallback for dev):
 *   freelon:cit:hex:{tokenId}    — accumulated hex (INT, monotonic)
 *   freelon:cit:lastSale:{tokenId} — most recent sale price in ETH (FLOAT as string)
 *   freelon:cit:lastSaleTs:{tokenId} — UNIX ts of most recent sale
 *   freelon:cit:transferTs:{tokenId} — UNIX ts of most recent transfer
 *                                       (used as "carrier hold start" since
 *                                       a transfer marks a new owner)
 *
 * Dedupe: tx hash + tokenId via SETNX so retries don't double-credit.
 *   freelon:cit:hex:event:{tx}:{tokenId}
 *
 * The value computation is pure + deterministic — caller can recompute
 * any time without storing it. Civ rankings are computed at read-time
 * by fetching all citizens of a civ + their values + sorting. For a
 * 4040-token collection this is fast enough to do on demand (≤300ms
 * with Upstash MGET batching).
 */

import { getCitizen, getAllCitizens } from "@/lib/citizens";
import { upstash, hasUpstash } from "@/lib/upstash-client";

/** Small wrapper since lib/citizens doesn't export a civ-of helper. */
function civilizationOf(tokenId: number): string | null {
  const c = getCitizen(tokenId);
  return c?.civilization ?? null;
}
const allCitizens = () => getAllCitizens();

export const CITIZEN_HEX_PER_SALE = 25;

// In-memory fallback so the helper compiles + runs in local dev.
const mem = {
  hex: new Map<number, number>(),
  lastSale: new Map<number, number>(),
  lastSaleTs: new Map<number, number>(),
  transferTs: new Map<number, number>(),
  seenEvents: new Set<string>(),
};

const KEY_HEX = (id: number) => `freelon:cit:hex:${id}`;
const KEY_LAST_SALE = (id: number) => `freelon:cit:lastSale:${id}`;
const KEY_LAST_SALE_TS = (id: number) => `freelon:cit:lastSaleTs:${id}`;
const KEY_TRANSFER_TS = (id: number) => `freelon:cit:transferTs:${id}`;
const KEY_EVENT = (tx: string, id: number) => `freelon:cit:hex:event:${tx}:${id}`;

async function upstashPipeline(cmds: string[][]): Promise<unknown[]> {
  if (cmds.length === 0) return [];
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const r = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error(`Upstash pipeline ${r.status}`);
  const j = (await r.json()) as Array<{ result: unknown }>;
  return j.map((x) => x.result);
}

/**
 * Credit a sale event to a single citizen. Idempotent on (tx, tokenId).
 * Called from the sweep-bounty cron alongside the wallet credit.
 *
 * Returns whether this call actually credited (vs being a dedupe hit).
 */
export async function creditCitizenSale(input: {
  tokenId: number;
  tx: string;
  priceEth: number;
  ts: number; // unix seconds
}): Promise<{ credited: boolean; newTotal: number }> {
  const { tokenId, tx, priceEth, ts } = input;
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return { credited: false, newTotal: 0 };
  }

  if (hasUpstash) {
    try {
      // SETNX dedupe — if event already credited, bail.
      const setRes = await upstash([
        "SET",
        KEY_EVENT(tx, tokenId),
        "1",
        "NX",
        "EX",
        "5184000", // 60d
      ]);
      if (setRes !== "OK") {
        const cur = (await upstash(["GET", KEY_HEX(tokenId)])) as string | null;
        return { credited: false, newTotal: cur ? Number(cur) : 0 };
      }
      // Pipelined: incr hex, write last sale price + ts + transfer ts
      const results = (await upstashPipeline([
        ["INCRBY", KEY_HEX(tokenId), String(CITIZEN_HEX_PER_SALE)],
        ["SET", KEY_LAST_SALE(tokenId), priceEth.toString()],
        ["SET", KEY_LAST_SALE_TS(tokenId), String(ts)],
        ["SET", KEY_TRANSFER_TS(tokenId), String(ts)],
      ])) as unknown[];
      const newTotal = Number(results[0]) || CITIZEN_HEX_PER_SALE;
      return { credited: true, newTotal };
    } catch {
      // Fall through to in-memory
    }
  }

  if (mem.seenEvents.has(KEY_EVENT(tx, tokenId))) {
    return { credited: false, newTotal: mem.hex.get(tokenId) || 0 };
  }
  mem.seenEvents.add(KEY_EVENT(tx, tokenId));
  const cur = (mem.hex.get(tokenId) || 0) + CITIZEN_HEX_PER_SALE;
  mem.hex.set(tokenId, cur);
  mem.lastSale.set(tokenId, priceEth);
  mem.lastSaleTs.set(tokenId, ts);
  mem.transferTs.set(tokenId, ts);
  return { credited: true, newTotal: cur };
}

/** Single-token read. */
export async function getCitizenStats(tokenId: number): Promise<{
  hex: number;
  lastSaleEth: number;
  lastSaleTs: number;
  transferTs: number;
}> {
  if (hasUpstash) {
    try {
      const results = (await upstashPipeline([
        ["GET", KEY_HEX(tokenId)],
        ["GET", KEY_LAST_SALE(tokenId)],
        ["GET", KEY_LAST_SALE_TS(tokenId)],
        ["GET", KEY_TRANSFER_TS(tokenId)],
      ])) as Array<string | null>;
      return {
        hex: results[0] ? Number(results[0]) : 0,
        lastSaleEth: results[1] ? Number(results[1]) : 0,
        lastSaleTs: results[2] ? Number(results[2]) : 0,
        transferTs: results[3] ? Number(results[3]) : 0,
      };
    } catch {
      // fall through
    }
  }
  return {
    hex: mem.hex.get(tokenId) || 0,
    lastSaleEth: mem.lastSale.get(tokenId) || 0,
    lastSaleTs: mem.lastSaleTs.get(tokenId) || 0,
    transferTs: mem.transferTs.get(tokenId) || 0,
  };
}

/** Batch read for many citizens. Uses a single pipeline. */
export async function getCitizenStatsBatch(
  tokenIds: number[],
): Promise<Map<number, { hex: number; lastSaleEth: number; lastSaleTs: number; transferTs: number }>> {
  const out = new Map<number, { hex: number; lastSaleEth: number; lastSaleTs: number; transferTs: number }>();
  if (tokenIds.length === 0) return out;
  if (hasUpstash) {
    try {
      const cmds: string[][] = [];
      for (const id of tokenIds) {
        cmds.push(["GET", KEY_HEX(id)]);
        cmds.push(["GET", KEY_LAST_SALE(id)]);
        cmds.push(["GET", KEY_LAST_SALE_TS(id)]);
        cmds.push(["GET", KEY_TRANSFER_TS(id)]);
      }
      const results = (await upstashPipeline(cmds)) as Array<string | null>;
      for (let i = 0; i < tokenIds.length; i++) {
        const base = i * 4;
        out.set(tokenIds[i], {
          hex: results[base] ? Number(results[base]) : 0,
          lastSaleEth: results[base + 1] ? Number(results[base + 1]) : 0,
          lastSaleTs: results[base + 2] ? Number(results[base + 2]) : 0,
          transferTs: results[base + 3] ? Number(results[base + 3]) : 0,
        });
      }
      return out;
    } catch {
      // fall through
    }
  }
  for (const id of tokenIds) {
    out.set(id, {
      hex: mem.hex.get(id) || 0,
      lastSaleEth: mem.lastSale.get(id) || 0,
      lastSaleTs: mem.lastSaleTs.get(id) || 0,
      transferTs: mem.transferTs.get(id) || 0,
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- *
 *  VALUE COMPUTATION
 * -------------------------------------------------------------------------- */

/**
 * Trait rarity score 0-1. Higher = rarer.
 *
 * Source: the citizens dataset itself. Count how often each token's
 * (shape, caste, sub_archetype, aura) trait values appear in the full
 * 4040. Rarer combos → higher score.
 *
 * Pre-computed at module load — the 4040-row scan is O(N×traits) and
 * the result is a Map<id,number>. Cost amortized across all callers.
 */
type TraitKey = "shape" | "caste" | "sub_archetype" | "aura";
const TRAIT_KEYS: TraitKey[] = ["shape", "caste", "sub_archetype", "aura"];

let traitRarityCache: Map<number, number> | null = null;

function buildTraitRarity(): Map<number, number> {
  const cits = allCitizens();
  // Per-trait-value count
  const counts: Record<string, Map<string, number>> = {};
  for (const k of TRAIT_KEYS) counts[k] = new Map();
  for (const c of cits) {
    for (const k of TRAIT_KEYS) {
      const v = (c as unknown as Record<string, string | undefined>)[k];
      if (!v || v === "None") continue;
      const m = counts[k];
      m.set(v, (m.get(v) || 0) + 1);
    }
  }
  const N = cits.length || 1;
  // Score: per token, sum of (1 - freq/N) across trait keys, normalized to 0-1.
  // Honoraries + One-of-Ones get a hard 1.0 floor since they're individually unique.
  const out = new Map<number, number>();
  for (const c of cits) {
    if (c.tier === "One of One") {
      out.set(c.id, 1.0);
      continue;
    }
    if (c.tier === "Honorary") {
      out.set(c.id, 0.92);
      continue;
    }
    let s = 0;
    let kCount = 0;
    for (const k of TRAIT_KEYS) {
      const v = (c as unknown as Record<string, string | undefined>)[k];
      if (!v || v === "None") continue;
      const freq = counts[k].get(v) || 1;
      s += 1 - freq / N;
      kCount++;
    }
    out.set(c.id, kCount > 0 ? s / kCount : 0);
  }
  return out;
}

function getTraitRarity(): Map<number, number> {
  if (!traitRarityCache) traitRarityCache = buildTraitRarity();
  return traitRarityCache;
}

/**
 * Compute citizen value 0-1000.
 *
 * Weights (founder spec):
 *   - 40% last sale ETH (normalized to floor; 1× floor = 100% of this band)
 *   - 30% trait rarity
 *   - 20% accumulated hex (normalized to a 4000⬡ ceiling)
 *   - 10% days held by current carrier (normalized to 365d ceiling)
 *
 * Pure function — `stats` + `floorEth` are inputs.
 */
export type CitizenStats = Awaited<ReturnType<typeof getCitizenStats>>;

export function computeCitizenValue(
  tokenId: number,
  stats: CitizenStats,
  floorEth: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): {
  value: number;            // 0-1000
  breakdown: {
    salePts: number;        // 0-400
    rarityPts: number;      // 0-300
    hexPts: number;         // 0-200
    holdPts: number;        // 0-100
  };
} {
  // Sale component: 0 if no sale, 100% at floor, 200%+ scales linearly
  // and is capped at 2× floor → full 400 pts.
  const floorRef = floorEth > 0 ? floorEth : 0.001;
  const saleRatio = stats.lastSaleEth > 0
    ? Math.min(2, stats.lastSaleEth / floorRef) / 2
    : 0;
  const salePts = saleRatio * 400;

  // Rarity component: trait-derived 0-1 → 0-300.
  const rarity = getTraitRarity().get(tokenId) ?? 0;
  const rarityPts = rarity * 300;

  // Hex component: accumulated hex / 4000 ceiling → 0-200. Sharp floor at 0.
  const hexRatio = Math.min(1, stats.hex / 4000);
  const hexPts = hexRatio * 200;

  // Hold component: days since most recent transfer, capped at 365d → 0-100.
  const heldSec = stats.transferTs > 0 ? Math.max(0, nowSec - stats.transferTs) : 0;
  const heldDays = heldSec / 86400;
  const holdRatio = Math.min(1, heldDays / 365);
  const holdPts = holdRatio * 100;

  const value = Math.round(salePts + rarityPts + hexPts + holdPts);
  return {
    value,
    breakdown: {
      salePts: Math.round(salePts),
      rarityPts: Math.round(rarityPts),
      hexPts: Math.round(hexPts),
      holdPts: Math.round(holdPts),
    },
  };
}

/* -------------------------------------------------------------------------- *
 *  CIV RANK
 * -------------------------------------------------------------------------- */

/**
 * Compute this token's rank within its own civilization.
 * Returns null if the token isn't found.
 *
 * Implementation note: fetches stats for every citizen in the same civ
 * via a single pipelined MGET. For typical civs (~400 tokens) this is
 * ~1600 GETs in one Upstash round-trip — fast (<300ms with regional
 * Upstash).
 *
 * Cached at the route layer (revalidate: 60) — don't call uncached in
 * hot paths.
 */
export async function getCitizenCivRank(
  tokenId: number,
  floorEth: number,
): Promise<{ rank: number; outOf: number; civSlug: string } | null> {
  const civSlug = civilizationOf(tokenId);
  if (!civSlug) return null;
  const civPeers = allCitizens().filter((c) => c.civilization === civSlug);
  const ids = civPeers.map((c) => c.id);
  const statsBatch = await getCitizenStatsBatch(ids);
  const now = Math.floor(Date.now() / 1000);
  const scored = ids.map((id) => ({
    id,
    value: computeCitizenValue(id, statsBatch.get(id)!, floorEth, now).value,
  }));
  scored.sort((a, b) => b.value - a.value);
  const idx = scored.findIndex((s) => s.id === tokenId);
  if (idx < 0) return null;
  return { rank: idx + 1, outOf: scored.length, civSlug };
}

/** For dashboard "Top 10 by value" panel. */
export async function getTopCitizensByValue(limit: number, floorEth: number): Promise<Array<{
  id: number;
  value: number;
  civ: string;
  hex: number;
  lastSaleEth: number;
}>> {
  const all = allCitizens();
  const ids = all.map((c) => c.id);
  const statsBatch = await getCitizenStatsBatch(ids);
  const now = Math.floor(Date.now() / 1000);
  const scored = all.map((c) => ({
    id: c.id,
    civ: c.civilization,
    value: computeCitizenValue(c.id, statsBatch.get(c.id)!, floorEth, now).value,
    hex: statsBatch.get(c.id)?.hex || 0,
    lastSaleEth: statsBatch.get(c.id)?.lastSaleEth || 0,
  }));
  scored.sort((a, b) => b.value - a.value);
  return scored.slice(0, limit);
}

/** Used by the cron to reset the cached trait rarity if needed (rare). */
export function _clearTraitRarityCache(): void {
  traitRarityCache = null;
}

/* -------------------------------------------------------------------------- *
 *  CITIZEN AGE
 * -------------------------------------------------------------------------- *
 * Founder spec (2026-05-25): every citizen starts at age 404 (lore — the
 * signal was already old when it broke). Then ages 1 tick per real day
 * since the most recent transferTs. So a token that just changed hands
 * shows "404 ticks" and a long-held citizen shows "404 + N days under
 * current carrier."
 *
 * If we have no transferTs (cron hasn't seen a sale yet for this token),
 * we still return 404 — the floor. The age is part of identity, not
 * something earned.
 */

export const CITIZEN_BASE_AGE_TICKS = 404;

export function citizenAgeTicks(stats: { transferTs: number }, nowSec: number = Math.floor(Date.now() / 1000)): {
  ticks: number;
  baseTicks: number;
  carrierDays: number;
} {
  const carrierSec = stats.transferTs > 0 ? Math.max(0, nowSec - stats.transferTs) : 0;
  const carrierDays = Math.floor(carrierSec / 86400);
  return {
    ticks: CITIZEN_BASE_AGE_TICKS + carrierDays,
    baseTicks: CITIZEN_BASE_AGE_TICKS,
    carrierDays,
  };
}

/* -------------------------------------------------------------------------- *
 *  ACCEPTANCE TIER
 * -------------------------------------------------------------------------- *
 * Founder spec (2026-05-25): "tiers where the city accepts you." Map the
 * 0-1000 value into 7 lore-named bands so a holder can read a glance-state
 * without doing math. Bands are deliberately compressed at the bottom
 * (most tokens stay there) and stretched at the top (rare to reach).
 *
 * Names lean into the canon: signal vocabulary, no participation-trophy.
 */
export type AcceptanceTier =
  | "STATIC"        // 0-99    — the signal hasn't found you
  | "FAINT"         // 100-199 — barely audible
  | "HEARD"         // 200-349 — the city knows your name
  | "CARRIER"       // 350-499 — you carry weight
  | "VERIFIED"      // 500-699 — the architect logs you
  | "DOCTRINE"      // 700-849 — you ARE the civilization
  | "MONOLITH";     // 850-1000 — the city is built around you

export function acceptanceTier(value: number): { tier: AcceptanceTier; band: [number, number]; nextAt: number | null } {
  if (value >= 850) return { tier: "MONOLITH", band: [850, 1000], nextAt: null };
  if (value >= 700) return { tier: "DOCTRINE", band: [700, 849], nextAt: 850 };
  if (value >= 500) return { tier: "VERIFIED", band: [500, 699], nextAt: 700 };
  if (value >= 350) return { tier: "CARRIER", band: [350, 499], nextAt: 500 };
  if (value >= 200) return { tier: "HEARD", band: [200, 349], nextAt: 350 };
  if (value >= 100) return { tier: "FAINT", band: [100, 199], nextAt: 200 };
  return { tier: "STATIC", band: [0, 99], nextAt: 100 };
}

/**
 * THE FULL SIGNAL — cross-collection set detection.
 *
 * A wallet that holds at least one token from every one of the six
 * CONNECTED_COLLECTIONS carries the "Full Signal" — the assembled set of
 * the whole universe (Citizens · Dead Signals · Combat Relics · Ancient
 * Species · Memory Fragments · Collapse Records). Partial holders get a
 * weighted score.
 *
 * This module is READ-ONLY. It mints no hex, writes no ledger, and
 * touches no game state. It only reports what a wallet already holds, so
 * it is safe under the locked economy-isolation rule.
 *
 * Multi-chain note: OOGIES lives on ApeChain (`ape_chain`), the rest on
 * Ethereum. We drive the OpenSea v2 account endpoint off each
 * collection's own `chain` field — verified 2026-05-29 that `ape_chain`
 * is the correct OpenSea path segment and that the per-account
 * collection filter works there.
 *
 * Two lessons carried over from wallet-tokens.ts:
 *   1. Never lie with a false zero. A failed lookup is `unknown: true`,
 *      not `has: false` — a rate-limit must not strip someone's badge.
 *   2. Never cache a zero/unknown. OpenSea lags 5–10 min after a
 *      transfer; only fully-resolved positive sets get cached.
 */

import { CONNECTED_COLLECTIONS, type ArchiveRole } from "@/lib/collections";
import { getWalletBalanceVerified, normalizeAddress } from "@/lib/wallet-tokens";
import { openseaFetch } from "@/lib/opensea-fetch";

/** Pudgy-style tier weight per collection — used for finale/allocation
 *  ranking later. Ordered by SCARCITY (verified supplies 2026-05-29), with
 *  two role anchors: SMILES is the apex prestige tier (444 cap — by far the
 *  rarest, so it carries the heaviest weight) and FREELONS is the core
 *  character/keystone (held high by role even though its 4040 supply is not
 *  the scarcest). Completing the full set adds a flat bonus on top so the
 *  last piece is worth chasing.
 *  Supplies: SMILES 444 · Emile ~3333 · OOGIES ~3333 · FREELONS 4040 ·
 *  Crypt Trading Cards ~4129 · The Crypt OGs ~5244 (most common). */
const SET_WEIGHTS: Record<string, number> = {
  "smiles-genesis": 6, // apex prestige — rarest at 444
  freelons: 5, // core character / keystone identity
  emile0x1908: 3, // ~3333
  oogies: 3, // ~3333
  crypttradingcards: 2, // ~4129
  "the-crypt-official": 1, // ~5244, most common
};
const FULL_SET_WEIGHT_BONUS = 4;

/** How many tokens to ask OpenSea for per collection. We only need to
 *  know "holds ≥1", but pulling a small page lets us show a count. Counts
 *  above this are reported as this value (display caps, detection does
 *  not). */
const COUNT_PAGE = 50;

export type SetEntry = {
  slug: string;
  name: string;
  role: ArchiveRole;
  color: string;
  /** Tokens held in this collection (capped at COUNT_PAGE for display). */
  count: number;
  /** True when the wallet holds ≥1 of this collection. */
  has: boolean;
  /** True when the lookup failed — value is unknown, NOT a confirmed zero. */
  unknown: boolean;
};

export type WalletSet = {
  entries: SetEntry[];
  /** Collections confirmed held (has === true). */
  tiersHeld: number;
  /** True only when all six are confirmed held. */
  full: boolean;
  /** Weighted set score for ranking (see SET_WEIGHTS). */
  weightedScore: number;
  /** True when any collection lookup was unknown — the set is provisional. */
  partial: boolean;
};

// ── Per-wallet set cache (positive, fully-resolved sets only) ──────────
type CacheEntry = { value: WalletSet; expires: number };
const setCache = new Map<string, CacheEntry>();
const SET_TTL_MS = 5 * 60_000;

function cacheGet(addr: string): WalletSet | null {
  const e = setCache.get(addr);
  if (!e) return null;
  if (e.expires < Date.now()) {
    setCache.delete(addr);
    return null;
  }
  return e.value;
}

function cacheSet(addr: string, value: WalletSet) {
  setCache.set(addr, { value, expires: Date.now() + SET_TTL_MS });
  if (setCache.size > 5000) {
    const oldest = setCache.keys().next().value;
    if (oldest) setCache.delete(oldest);
  }
}

type OsNftsResponse = {
  nfts?: Array<{ contract?: string; identifier?: string }>;
};

/** Count tokens of one collection held by a wallet via OpenSea v2.
 *  Returns null when the lookup fails (unknown), a number otherwise. */
async function osCount(
  addr: string,
  chain: string,
  slug: string,
  contract: string,
): Promise<number | null> {
  const url =
    `https://api.opensea.io/api/v2/chain/${chain}/account/${addr}` +
    `/nfts?collection=${encodeURIComponent(slug)}&limit=${COUNT_PAGE}`;
  const res = await openseaFetch<OsNftsResponse>(url, { revalidate: 60 });
  if (!res.ok) return null;
  const ours = (res.data.nfts || []).filter(
    (n) => (n.contract || "").toLowerCase() === contract.toLowerCase(),
  );
  return ours.length;
}

/**
 * Cheap single-collection holding check — one OpenSea (or RPC for FREELONS)
 * call, NOT the full six-collection scan. Used by lore-unlock keys (Emile)
 * and any other per-collection gate that doesn't need the whole set.
 *
 * Returns true/false when resolved, or null when the lookup failed (unknown).
 * Callers MUST treat null as "not confirmed" and never grant on it — same
 * fail-safe discipline as getWalletSet (never lie with a false zero, but also
 * never over-grant on an outage).
 */
export async function walletHoldsCollection(
  address: string,
  slug: string,
): Promise<boolean | null> {
  const norm = normalizeAddress(address);
  if (!norm) return false;
  const c = CONNECTED_COLLECTIONS.find((x) => x.slug === slug);
  if (!c) return false;
  const count =
    c.slug === "freelons"
      ? await getWalletBalanceVerified(norm)
      : await osCount(norm, c.chain, c.slug, c.contract);
  if (count === null) return null;
  return count > 0;
}

/**
 * Resolve a wallet's Full Signal set across all six collections.
 *
 * FREELONS uses the RPC-backed `getWalletBalanceVerified` (most reliable,
 * mainnet) which already returns null on a truly-unknown result. The
 * other five resolve via OpenSea on their own chain.
 */
export async function getWalletSet(address: string): Promise<WalletSet> {
  const norm = normalizeAddress(address);
  if (!norm) {
    // Not a valid address — every entry is a confirmed zero.
    const entries = CONNECTED_COLLECTIONS.map<SetEntry>((c) => ({
      slug: c.slug,
      name: c.name,
      role: c.role,
      color: c.color,
      count: 0,
      has: false,
      unknown: false,
    }));
    return { entries, tiersHeld: 0, full: false, weightedScore: 0, partial: false };
  }

  const cached = cacheGet(norm);
  if (cached) return cached;

  const entries = await Promise.all(
    CONNECTED_COLLECTIONS.map<Promise<SetEntry>>(async (c) => {
      let count: number | null;
      if (c.slug === "freelons") {
        count = await getWalletBalanceVerified(norm);
      } else {
        count = await osCount(norm, c.chain, c.slug, c.contract);
      }
      const unknown = count === null;
      return {
        slug: c.slug,
        name: c.name,
        role: c.role,
        color: c.color,
        count: unknown ? 0 : (count as number),
        has: !unknown && (count as number) > 0,
        unknown,
      };
    }),
  );

  const tiersHeld = entries.filter((e) => e.has).length;
  const partial = entries.some((e) => e.unknown);
  const full = !partial && entries.every((e) => e.has);

  let weightedScore = 0;
  for (const e of entries) {
    if (e.has) weightedScore += SET_WEIGHTS[e.slug] ?? 1;
  }
  if (full) weightedScore += FULL_SET_WEIGHT_BONUS;

  const set: WalletSet = { entries, tiersHeld, full, weightedScore, partial };

  // Only cache a clean, fully-resolved read. A partial read (any unknown)
  // must be retried next time, not pinned for 5 minutes.
  if (!partial) cacheSet(norm, set);

  return set;
}

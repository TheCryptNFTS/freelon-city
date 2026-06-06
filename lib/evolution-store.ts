/**
 * Per-tokenId EVOLUTION record — the off-chain opt-in for art "evolution".
 *
 * FREELON CITY citizens ship with art anchored on immutable IPFS. This store is
 * the ADDITIVE, REVERTABLE layer on top: a holder may EVOLVE a citizen's
 * DISPLAYED art (the dynamic metadata `image`) as its agent levels up. The
 * original anchored metadata is ALWAYS the source of truth — this store NEVER
 * stores-over it; it only records an `image` OVERRIDE that the holder can turn
 * off at any time (revert).
 *
 * Keyed by tokenId (so it survives a sale — the new owner inherits the evolved
 * state, exactly like all progression). Mirrors lib/agent-tier-store.ts:
 * Upstash in prod, a globalThis-backed in-memory Map fallback in dev.
 *
 * SAFETY INVARIANT: a token with `evolved === false` (or no record at all) MUST
 * resolve to the ORIGINAL metadata byte-for-byte. revert() only flips the flag
 * off — it KEEPS evolvedImageUrl as history (re-evolving is cheap) but the
 * metadata route ignores the URL whenever evolved is false.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type Evolution = {
  tokenId: number;
  /** Is the art override ACTIVE right now? false → metadata = original art. */
  evolved: boolean;
  /** Highest evolve tier the holder has BURNED ⬡ for (0 = never evolved). */
  tier: number;
  /** Public URL of the rendered evolved art (Vercel Blob). Kept as history even
   *  after a revert so a re-evolve at the same tier is free of a re-render. */
  evolvedImageUrl: string | null;
  /** Epoch ms of the last setEvolved (the most recent evolve). */
  evolvedAt: number;
  updatedAt: number;
};

const KEY = (tokenId: number) => `freelon:evolution:v1:${tokenId}`;
const SET_KEY = "freelon:evolution:v1:ids"; // set of tokenIds with a record

// globalThis-backed so the dev in-memory fallback is shared across Next's
// per-route module bundles. Prod uses Upstash, so this Map is never the source
// of truth there.
const memory: Map<number, Evolution> =
  ((globalThis as { __freelonEvolutionMem?: Map<number, Evolution> }).__freelonEvolutionMem ??=
    new Map<number, Evolution>());

function empty(tokenId: number): Evolution {
  return { tokenId, evolved: false, tier: 0, evolvedImageUrl: null, evolvedAt: 0, updatedAt: 0 };
}

export async function getEvolution(tokenId: number): Promise<Evolution> {
  if (!hasUpstash) return memory.get(tokenId) ?? empty(tokenId);
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    return raw ? (JSON.parse(raw) as Evolution) : empty(tokenId);
  } catch {
    return empty(tokenId);
  }
}

async function put(rec: Evolution): Promise<void> {
  rec.updatedAt = Date.now();
  if (!hasUpstash) {
    memory.set(rec.tokenId, rec);
    return;
  }
  try {
    await upstash(["SET", KEY(rec.tokenId), JSON.stringify(rec)]);
    // Index the tokenId so an admin tool can enumerate evolved records without a
    // SCAN over all keys.
    await upstash(["SADD", SET_KEY, String(rec.tokenId)]);
  } catch {
    /* non-fatal — caller decides whether to refund */
  }
}

/**
 * Turn the art override ON for a citizen at the given tier. Idempotent on the
 * tier via Math.max so a re-submit never downgrades. The original art is NEVER
 * touched — this only records the override URL + flag. Returns the stored record.
 */
export async function setEvolved(tokenId: number, tier: number, imageUrl: string): Promise<Evolution> {
  const rec = await getEvolution(tokenId);
  const now = Date.now();
  rec.evolved = true;
  rec.tier = Math.max(rec.tier, Math.max(0, Math.floor(tier)));
  rec.evolvedImageUrl = imageUrl;
  rec.evolvedAt = now;
  await put(rec);
  return rec;
}

/**
 * REVERT — turn the art override OFF. The metadata route then returns the
 * ORIGINAL art again, byte-identical. We KEEP evolvedImageUrl + tier as history
 * (a re-evolve at the same tier can reuse the render) — revert is purely the
 * `evolved` flag flipping to false. The original is never destroyed because it
 * is never stored here in the first place.
 */
export async function revert(tokenId: number): Promise<Evolution> {
  const rec = await getEvolution(tokenId);
  rec.evolved = false;
  await put(rec);
  return rec;
}

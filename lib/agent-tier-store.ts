/**
 * Pending agent-tier ledger — the off-chain queue of ASCENSIONS a holder has
 * PAID for (⬡ burned) but which the project hasn't yet anchored on-chain via
 * FreelonAgentRegistry.recordEvolution. Keyed by tokenId so it survives sale,
 * like all progression. Mirrors the style of lib/agent-history.ts (Upstash with
 * a globalThis-backed dev in-memory fallback).
 *
 * Why a queue: the registry is NOT deployed yet, and recordEvolution is
 * onlyOwner (a project-signed write). So a holder's training BURN must not block
 * on deployment — we record the paid tier here as "pending" the moment the ⬡ is
 * burned, and the admin /api/admin/evolve batch later flushes pending tiers to
 * chain once the registry is live. `onChainTier` mirrors what we last anchored
 * (0 until the first on-chain write), so the batch only writes the delta.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type AgentTier = {
  tokenId: number;
  /** Highest tier the holder has BURNED ⬡ for (the paid/target tier). */
  tier: number;
  /** Highest tier we have anchored on-chain via recordEvolution (0 = none). */
  onChainTier: number;
  /** Total ⬡ ever burned ascending this citizen (audit trail). */
  hexBurned: number;
  updatedAt: number;
};

const KEY = (tokenId: number) => `freelon:agenttier:v1:${tokenId}`;
const SET_KEY = "freelon:agenttier:v1:ids"; // set of tokenIds with a record

// globalThis-backed so the dev in-memory fallback is shared across Next's
// per-route module bundles. Prod uses Upstash, so this Map is never the source
// of truth there.
const memory: Map<number, AgentTier> =
  ((globalThis as { __freelonAgentTierMem?: Map<number, AgentTier> }).__freelonAgentTierMem ??=
    new Map<number, AgentTier>());

function empty(tokenId: number): AgentTier {
  return { tokenId, tier: 0, onChainTier: 0, hexBurned: 0, updatedAt: 0 };
}

export async function getTier(tokenId: number): Promise<AgentTier> {
  if (!hasUpstash) return memory.get(tokenId) ?? empty(tokenId);
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    return raw ? (JSON.parse(raw) as AgentTier) : empty(tokenId);
  } catch {
    return empty(tokenId);
  }
}

export async function setTier(rec: AgentTier): Promise<void> {
  rec.updatedAt = Date.now();
  if (!hasUpstash) {
    memory.set(rec.tokenId, rec);
    return;
  }
  try {
    await upstash(["SET", KEY(rec.tokenId), JSON.stringify(rec)]);
    // Index the tokenId so the admin batch can enumerate pending records
    // without a SCAN over all keys.
    await upstash(["SADD", SET_KEY, String(rec.tokenId)]);
  } catch {
    /* non-fatal — the burn already succeeded; a failed write is reconcilable */
  }
}

/**
 * Bump a citizen's PAID tier and add to its lifetime burn total. Idempotent on
 * the target tier via Math.max so a re-submit never downgrades. Returns the
 * stored record. Does NOT move any ledger — the route burns the ⬡.
 */
export async function recordAscension(tokenId: number, targetTier: number, hexBurned: number): Promise<AgentTier> {
  const rec = await getTier(tokenId);
  rec.tier = Math.max(rec.tier, targetTier);
  rec.hexBurned += Math.max(0, hexBurned);
  await setTier(rec);
  return rec;
}

/** Token ids that have a pending ascension (paid tier ahead of on-chain tier). */
export async function listPendingTokenIds(): Promise<number[]> {
  if (!hasUpstash) {
    return Array.from(memory.values())
      .filter((r) => r.tier > r.onChainTier)
      .map((r) => r.tokenId)
      .sort((a, b) => a - b);
  }
  try {
    const members = (await upstash(["SMEMBERS", SET_KEY])) as string[] | null;
    if (!Array.isArray(members)) return [];
    const ids: number[] = [];
    for (const m of members) {
      const id = parseInt(m, 10);
      if (!Number.isFinite(id)) continue;
      const rec = await getTier(id);
      if (rec.tier > rec.onChainTier) ids.push(id);
    }
    return ids.sort((a, b) => a - b);
  } catch {
    return [];
  }
}

/** Stamp a citizen's on-chain tier after a successful recordEvolution write. */
export async function markOnChain(tokenId: number, onChainTier: number): Promise<void> {
  const rec = await getTier(tokenId);
  rec.onChainTier = Math.max(rec.onChainTier, onChainTier);
  await setTier(rec);
}

/**
 * Single-use SIWE auth nonce store. Mirrors lib/wallet-hex-store.ts transport
 * style: raw Upstash REST via the shared `upstash()` helper, gated on
 * `hasUpstash` with an in-memory Map fallback for dev.
 *
 * Each nonce is keyed per-address and expires after 5 minutes (Upstash
 * `SET key EX 300`). It is SINGLE-USE: `consumeNonce` reads-and-deletes so a
 * signature can only be redeemed once (replay protection). This carries ZERO
 * ledger authority — it only proves a fresh challenge was issued to an address.
 */

import crypto from "node:crypto";
import { upstash, hasUpstash } from "@/lib/upstash-client";

const NONCE_TTL_SEC = 300; // 5 minutes

const KEY = (addr: string) => `freelon:authNonce:v1:${addr.toLowerCase()}`;

// key -> { nonce, expiresAt(ms) }
const memory = new Map<string, { nonce: string; expiresAt: number }>();

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Issue (overwrite) a single-use nonce for `addr`, 5-minute TTL. */
export async function issueNonce(addr: string): Promise<string> {
  const a = addr.toLowerCase();
  const nonce = generateNonce();
  if (!hasUpstash) {
    memory.set(KEY(a), { nonce, expiresAt: Date.now() + NONCE_TTL_SEC * 1000 });
    return nonce;
  }
  await upstash(["SET", KEY(a), nonce, "EX", String(NONCE_TTL_SEC)]);
  return nonce;
}

/**
 * Consume the nonce for `addr`: returns the stored nonce string and DELETES it
 * (single-use). Returns null if none exists / expired. A second consume of the
 * same nonce therefore always fails — the replay guard.
 */
export async function consumeNonce(addr: string): Promise<string | null> {
  const a = addr.toLowerCase();
  if (!hasUpstash) {
    const rec = memory.get(KEY(a));
    memory.delete(KEY(a));
    if (!rec) return null;
    if (rec.expiresAt < Date.now()) return null;
    return rec.nonce;
  }
  try {
    const raw = (await upstash(["GET", KEY(a)])) as string | null;
    // Delete regardless so the nonce can never be replayed, even on a race.
    await upstash(["DEL", KEY(a)]);
    return raw ?? null;
  } catch {
    return null;
  }
}

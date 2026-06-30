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

// `scope` namespaces the nonce so independent challenge flows for the same
// address (SIWE game-login = "v1", wallet-proof session = "xprove") can't
// consume each other's nonce. Default "v1" keeps existing keys byte-identical.
const KEY = (addr: string, scope: string) => `freelon:authNonce:${scope}:${addr.toLowerCase()}`;

// key -> { nonce, expiresAt(ms) }
const memory = new Map<string, { nonce: string; expiresAt: number }>();

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Issue (overwrite) a single-use nonce for `addr`, 5-minute TTL. */
export async function issueNonce(addr: string, scope = "v1"): Promise<string> {
  const a = addr.toLowerCase();
  const nonce = generateNonce();
  if (!hasUpstash) {
    memory.set(KEY(a, scope), { nonce, expiresAt: Date.now() + NONCE_TTL_SEC * 1000 });
    return nonce;
  }
  await upstash(["SET", KEY(a, scope), nonce, "EX", String(NONCE_TTL_SEC)]);
  return nonce;
}

/**
 * Consume the nonce for `addr`: returns the stored nonce string and DELETES it
 * (single-use). Returns null if none exists / expired. A second consume of the
 * same nonce therefore always fails — the replay guard.
 */
export async function consumeNonce(addr: string, scope = "v1"): Promise<string | null> {
  const a = addr.toLowerCase();
  if (!hasUpstash) {
    const rec = memory.get(KEY(a, scope));
    memory.delete(KEY(a, scope));
    if (!rec) return null;
    if (rec.expiresAt < Date.now()) return null;
    return rec.nonce;
  }
  try {
    // Atomic read-and-delete (2026-06-16): GET-then-DEL let two concurrent
    // verifies with the same signature both read the nonce before either deleted
    // it, minting two sessions. GETDEL makes consume single-use in one op.
    const raw = (await upstash(["GETDEL", KEY(a, scope)])) as string | null;
    return raw ?? null;
  } catch {
    return null;
  }
}

/**
 * Read the nonce for `addr` WITHOUT deleting it (returns null if none/expired).
 *
 * Unlike `consumeNonce`, this is NOT single-use — it exists for the ETH-unlock
 * flow, where the SAME signed proof is legitimately re-submitted across the
 * up-to-10 on-chain confirmation polls (a single-use consume would 401 the
 * second poll and strand a paid awaken). The nonce's 5-minute TTL + the
 * citizen-id baked into the signed message + the on-chain ownership re-check
 * still bound replay to a 5-minute window against a citizen the wallet owns —
 * a value-less, time-boxed replay vs. the previous static-forever signature.
 */
export async function peekNonce(addr: string, scope = "v1"): Promise<string | null> {
  const a = addr.toLowerCase();
  if (!hasUpstash) {
    const rec = memory.get(KEY(a, scope));
    if (!rec) return null;
    if (rec.expiresAt < Date.now()) { memory.delete(KEY(a, scope)); return null; }
    return rec.nonce;
  }
  try {
    const raw = (await upstash(["GET", KEY(a, scope)])) as string | null;
    return raw ?? null;
  } catch {
    return null;
  }
}

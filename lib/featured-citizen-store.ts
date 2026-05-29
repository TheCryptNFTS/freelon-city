/**
 * Per-wallet "featured citizen" — the holder picks one of their citizens
 * to be the face of their wallet across the site.
 *
 * Founder spec 2026-05-25, originally Peterhawk71's request:
 *   "wish I could choose my Citizen on My Own"
 *
 * Used by:
 *   - /wallet/{address} hero (shows featured citizen large)
 *   - /api/og/wallet/{address} (the share card)
 *   - the IdentityGreeting pill (could show the featured citizen's tier)
 *
 * Storage:
 *   freelon:featured:{wallet} → tokenId (string)
 *
 * No dedupe, no TTL — just a single-value SET per wallet. The holder
 * can change it whenever. Auth is enforced by the API route via the
 * x-session HMAC cookie — the wallet must own the citizen they pick
 * before we persist it.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const KEY = (wallet: string) => `freelon:featured:${wallet.toLowerCase()}`;

// In-memory fallback for dev
const mem = new Map<string, number>();

/** Read the featured citizen for a wallet. Returns null if none set. */
export async function getFeaturedCitizen(wallet: string): Promise<number | null> {
  const w = wallet.toLowerCase();
  if (hasUpstash) {
    try {
      const r = (await upstash(["GET", KEY(w)])) as string | null;
      if (!r) return null;
      const n = Number(r);
      return Number.isFinite(n) && n >= 1 && n <= 4040 ? n : null;
    } catch {/* fall through */}
  }
  return mem.get(w) ?? null;
}

/** Set the featured citizen. Caller must verify ownership first. */
export async function setFeaturedCitizen(wallet: string, tokenId: number): Promise<void> {
  const w = wallet.toLowerCase();
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    throw new Error("invalid_token_id");
  }
  if (hasUpstash) {
    try {
      await upstash(["SET", KEY(w), String(tokenId)]);
      return;
    } catch {/* fall through */}
  }
  mem.set(w, tokenId);
}

/** Unset the featured citizen. */
export async function clearFeaturedCitizen(wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  if (hasUpstash) {
    try {
      await upstash(["DEL", KEY(w)]);
      return;
    } catch {/* fall through */}
  }
  mem.delete(w);
}

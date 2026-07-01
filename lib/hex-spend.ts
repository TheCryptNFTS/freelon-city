/**
 * Hex spend identity + one-time carrier→wallet fold.
 *
 * 2026-05-29 — the city ran TWO hex ledgers: wallet-hex (keyed by ETH
 * address, where hex is EARNED) and carrier-hex (keyed by X handle, where
 * the shop/unlock/realign SPENT). Users earned into one bucket and spent
 * from the other ("I have 270 but the shop says 50"). We unify on the
 * wallet ledger. These two helpers are shared by every carrier-spend route:
 *
 *   walletFromSession()    — does this session carry a real wallet?
 *   foldCarrierIntoWallet() — migrate any leftover carrier-hex into the
 *                             wallet ledger, exactly once, ever.
 *
 * SAFETY: the fold must be idempotent. A double-run would MINT hex (it
 * credits the wallet from the carrier balance). It is guarded twice:
 *   1. a Redis SET NX lock keyed by (handle, wallet) — atomic, survives
 *      concurrent requests, and
 *   2. a `migratedTo` flag persisted on the carrier record.
 */

import type { XSession } from "@/lib/x-session";
import { creditWalletHex } from "@/lib/wallet-hex-store";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { POINTS } from "@/lib/carrier";

const ADDR_RE = /^0x[a-f0-9]{40}$/;

// In-memory fallback lock set (dev, no Upstash). JS is single-threaded per
// process so the has()/add() pair below is effectively atomic.
const memoryFoldLocks = new Set<string>();

/**
 * Return the wallet address bound to this X session, lowercased, iff it is
 * a valid ETH address. `session.bind` holds whatever the user passed to
 * /api/x/start?bind= — a wallet address when they connected a wallet before
 * signing in (the holder path), or an X handle (the handle-only relayer
 * path). Only the address form is a spendable-wallet identity.
 */
export function walletFromSession(session: XSession | null | undefined): string | null {
  const b = (session?.bind || "").trim().toLowerCase();
  return ADDR_RE.test(b) ? b : null;
}

/**
 * One-time, idempotent migration of a handle's leftover carrier-hex into the
 * wallet ledger. Safe to call before every wallet-backed spend — it does
 * nothing after the first successful fold.
 *
 * Order matters: acquire the NX lock FIRST (anti-mint), then credit, then
 * stamp the carrier so even a future lock-expiry can't re-fold.
 */
export async function foldCarrierIntoWallet(
  handle: string,
  walletAddr: string,
): Promise<void> {
  const h = (handle || "").trim().toLowerCase().replace(/^@/, "");
  const w = (walletAddr || "").trim().toLowerCase();
  if (!h || !ADDR_RE.test(w)) return;

  const lockKey = `freelon:hexfold:v1:${h}:${w}`;

  // 1) Atomic claim. Only the first caller proceeds; concurrent/repeat
  //    calls bail here. ~1y TTL so the lock long outlives any in-flight
  //    request but doesn't accumulate forever.
  if (hasUpstash) {
    try {
      const res = await upstash(["SET", lockKey, "1", "NX", "EX", String(365 * 24 * 60 * 60)]);
      if (res !== "OK") return; // already folded / in flight
    } catch {
      // If the lock store is unreachable we must NOT credit — a failure
      // here with a later success would double-mint. Bail safely.
      return;
    }
  } else {
    if (memoryFoldLocks.has(lockKey)) return;
    memoryFoldLocks.add(lockKey);
  }

  // 2) Read carrier; nothing to fold if absent or already migrated.
  const carrier = await getCarrier(h);
  if (!carrier) return;
  if (carrier.migratedTo) return; // belt-and-suspenders with the NX lock

  // The STARTING grant (POINTS.STARTING) is an onboarding stipend for the
  // handle-only relay path — it was never EARNED through activity, so it must
  // NOT be laundered into the spendable wallet ledger. (The wallet-spend routes
  // lazily create a carrier at hexPoints == totalEarned == STARTING; folding
  // that whole balance minted free wallet-hex per X account.) Fold only
  // activity-earned hex that is still held: min(current balance, lifetime-earned
  // minus the grant). A brand-new lazy carrier therefore folds 0.
  const earnedBeyondGrant = Math.max(0, (carrier.totalEarned ?? 0) - POINTS.STARTING);
  const foldable = Math.max(0, Math.min(carrier.hexPoints, earnedBeyondGrant));
  if (foldable <= 0) {
    // Nothing earned to migrate; stamp so we don't re-check every spend. Leave
    // the (unearned) grant balance intact on the carrier — harmless for wallet
    // users, who spend from the wallet ledger from here on.
    await putCarrier({ ...carrier, migratedTo: w });
    return;
  }

  // 3) Credit the wallet with the earned portion, then decrement + stamp the
  //    carrier. Credit before stamp so a crash between them leaves the carrier
  //    balance intact (the NX lock prevents a re-run from double-crediting;
  //    worst case a manual reconcile, never a mint).
  await creditWalletHex(w, foldable, {
    kind: "manual",
    note: `Carrier hex migrated to wallet (+${foldable}⬡)`,
  });
  await putCarrier({ ...carrier, hexPoints: carrier.hexPoints - foldable, migratedTo: w });
}

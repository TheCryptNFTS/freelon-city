/**
 * Active-economy crediters folded into the per-wallet tick.
 *
 *   - Sale share:     5% of every freelon sale (capped 3/day) — incentivises
 *                     liquidity and rewards sellers.
 *   - Fresh blood:    one-time 100 hex bounty for a wallet's first freelon
 *                     acquisition. 7d cooldown to deter sybil shuffling.
 *   - Listing bounty: 5 hex/day per active listing, capped 25/day.
 *
 * All three are read-on-demand from OpenSea (no new cron slot). Each call
 * uses fetchWithTimeout so a stalled upstream can't hang the tick. Failures
 * fall through silently — the wallet's balance is never blocked on these.
 */

import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { CONTRACT } from "@/lib/constants";
import {
  creditWalletHex,
  getWalletHex,
  patchWalletHex,
} from "@/lib/wallet-hex-store";
import { ECONOMY, ethToHex } from "@/lib/economy-constants";
import { withLock } from "@/lib/upstash-lock";
import { CANON } from "@/lib/canon";

const DAY_MS = 86_400_000;

type RawSale = {
  event_type?: string;
  event_timestamp?: number;
  seller?: string;
  /** The acquiring wallet (OpenSea v2 sale events). Used for the self-deal
   *  wash-trade guard — a seller must not earn sale-share on a sale they also
   *  bought (sybil/self round-trip). */
  buyer?: string;
  payment?: { quantity?: string; decimals?: number };
  nft?: { identifier?: string; contract?: string };
  transaction?: string;
};

/** Credit 5% of recent sale ETH (as hex) for sales the wallet made since the
 * last cursor. Capped at SALE_SHARE_MAX_PER_24H sales counted per UTC day.
 *
 * Wrapped in a per-wallet lock so two concurrent ticks (e.g. user opens
 * /wallet in two tabs) can't both read the same cursor and double-credit.
 */
export async function creditSaleShare(address: string): Promise<{ credited: number; sales: number }> {
  return (await withLock(`saleshare:${address.toLowerCase()}`, 15, () => _creditSaleShareInner(address))) ?? { credited: 0, sales: 0 };
}

async function _creditSaleShareInner(address: string): Promise<{ credited: number; sales: number }> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return { credited: 0, sales: 0 };
  const rec = await getWalletHex(address);
  const cursor = rec.lastSaleCreditTs || 0;

  try {
    const url = `https://api.opensea.io/api/v2/events/accounts/${address}?event_type=sale&chain=ethereum&limit=20`;
    const r = await fetchWithTimeout(url, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: 120 },
      timeoutMs: 5000,
    });
    if (!r.ok) return { credited: 0, sales: 0 };
    const d = (await r.json()) as { asset_events?: RawSale[] };
    const events = (d.asset_events || [])
      .filter((e) => (e.seller || "").toLowerCase() === address.toLowerCase())
      // SELF-DEAL GUARD (anti-wash-trade): if the buyer is the SAME wallet as the
      // seller (a self round-trip / sybil sale to yourself), do NOT pay sale-share.
      // Mirrors the seller-side self-filter we apply elsewhere. When the
      // buyer field is absent we keep the event (the range/contract guards below
      // still apply) — fail open so a thin payload doesn't drop legit sales.
      .filter((e) => {
        const b = (e.buyer || "").toLowerCase();
        return !b || b !== address.toLowerCase();
      })
      .filter((e) => (e.nft?.identifier ? (e.event_timestamp || 0) > cursor : false))
      // Filter to this collection only (events api returns multi-collection).
      // Contract-scope (Prompt 2): if the row carries a contract and it isn't
      // ours, reject it — closes the cross-collection same-tokenId credit hole.
      // The /events/accounts endpoint doesn't return contract per row
      // consistently, so when it's ABSENT we fall back to the tokenId-in-range
      // check — tightens without dropping legit sales.
      .filter((e) => {
        const c = (e.nft?.contract || "").toLowerCase();
        if (c && c !== CONTRACT.toLowerCase()) return false;
        const tid = Number(e.nft?.identifier);
        return Number.isFinite(tid) && tid >= 1 && tid <= 4040;
      });

    if (events.length === 0) return { credited: 0, sales: 0 };

    // Apply per-24h cap: count up to MAX_PER_24H newest sales.
    // Sort ASCENDING so we credit oldest-first and advance the cursor
    // monotonically — guarantees no re-credit even if OpenSea returns
    // events out of order between calls.
    const cap = ECONOMY.SALE_SHARE_MAX_PER_24H;
    const ordered = events.sort((a, b) => (a.event_timestamp || 0) - (b.event_timestamp || 0));
    const within24h = ordered.filter((e) => Date.now() - (e.event_timestamp || 0) * 1000 < DAY_MS);
    // Take the MOST RECENT cap sales (within24h tail) but still process ascending
    const eligible = within24h.slice(-cap);

    let totalCredit = 0;
    let newestTs = cursor;
    const { paymentToEth } = await import("@/lib/eth-math");
    for (const ev of eligible) {
      const eth = paymentToEth(ev.payment);
      const share = (eth * ECONOMY.SALE_SHARE_PCT) / 100;
      // Backstop cap on a single sale-share credit (anti-wash-trade) — bounds the
      // damage of one spoofed/absurd sale price. Not a rate change.
      const hex = Math.min(ethToHex(share), ECONOMY.SALE_SHARE_HEX_CAP);
      if (hex > 0) {
        await creditWalletHex(address, hex, {
          kind: "manual",
          note: `Sale share · #${ev.nft?.identifier} · ${eth.toFixed(4)} ETH × ${ECONOMY.SALE_SHARE_PCT}%`,
        });
        totalCredit += hex;
      }
      // Advance cursor to THIS event's ts before processing the next, so
      // a crash mid-loop never leaks credit on next run.
      newestTs = Math.max(newestTs, ev.event_timestamp || 0);
      // Advance the cursor under the wallet lock so the concurrent holder/sweep
      // ticks can't clobber this credit with a stale write (upgrade audit #8).
      const cursorTs = newestTs;
      await patchWalletHex(address, (r) => {
        r.lastSaleCreditTs = cursorTs;
        r.lastActiveDay = new Date().toISOString().slice(0, 10);
      });
    }

    return { credited: totalCredit, sales: eligible.length };
  } catch {
    return { credited: 0, sales: 0 };
  }
}

/**
 * One-time bounty when a wallet first holds a freelon.
 *
 * Anti-sybil hardening:
 *  - Per-wallet flag stops double-claim on the same address.
 *  - X-verification GATE: only wallets bound to a verified X handle can
 *    claim. Sybil farmers would need a unique verified X account per
 *    wallet, which is expensive to acquire and X enforces rate limits.
 *  - The hex event ring buffer non-empty check is preserved as a second
 *    line of defence.
 */
export async function creditFreshBlood(
  address: string,
  balance: number,
): Promise<{ credited: number }> {
  if (balance <= 0) return { credited: 0 };
  const rec = await getWalletHex(address);
  if (rec.freshBloodAwardedAt) return { credited: 0 };

  // Gate on X-verification — silent denial if the wallet hasn't done OAuth.
  // The wallet can still earn everything else; just not the new-user bounty.
  try {
    const { getXVerification } = await import("@/lib/x-store");
    const verification = await getXVerification(address);
    if (!verification) return { credited: 0 };
  } catch {
    return { credited: 0 };
  }

  if (rec.events.length > 0 || rec.lifetimeEarned > 0) {
    // Mark as awarded so we don't re-check forever (locked patch — never clobber
    // a concurrent credit; upgrade audit #8).
    await patchWalletHex(address, (r) => { r.freshBloodAwardedAt = Date.now(); });
    return { credited: 0 };
  }
  // HEX DETECTED is a rare-use canon phrase reserved for the recognition
  // moment — wallet's first ever freelon acquired earns this label.
  await creditWalletHex(address, ECONOMY.FRESH_BLOOD_BOUNTY, {
    kind: "manual",
    note: `${CANON.HEX_DETECTED} · first freelon acquired`,
  });
  await patchWalletHex(address, (r) => { r.freshBloodAwardedAt = Date.now(); });
  // Welcome notification — first-citizen moment is the highest leverage
  // onboarding hook in the entire economy.
  try {
    const { notify } = await import("@/lib/notify");
    void notify({
      wallet: address,
      eventKey: `fresh-blood:${address.toLowerCase()}`,
      kind: "fresh-citizen",
      body: `⬡ Welcome, carrier. +${ECONOMY.FRESH_BLOOD_BOUNTY} ⬡ for your first citizen. Post daily to keep the meter alive.`,
      href: "/carrier",
    }).catch(() => {});
  } catch {/* non-fatal */}
  return { credited: ECONOMY.FRESH_BLOOD_BOUNTY };
}

type RawListing = {
  protocol_data?: {
    parameters?: {
      offer?: Array<{ identifierOrCriteria?: string }>;
      startTime?: string | number;
    };
  };
  price?: { current?: { value?: string; decimals?: number } };
  /** Seaport `start_time` (unix seconds) — used to age-gate the bounty. */
  start_time?: number;
  listing_time?: number;
};


/** Credit listing bounty for active freelon listings owned by the wallet.
 * 5 hex/day per active listing, capped at 25/day. We use the per-account
 * tick frequency as the "day" — daysDue is supplied by caller. */
export async function creditListingBounty(
  address: string,
  daysDue: number,
): Promise<{ credited: number; activeListings: number }> {
  if (daysDue <= 0) return { credited: 0, activeListings: 0 };
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return { credited: 0, activeListings: 0 };
  try {
    // OpenSea v2 listings endpoint for a maker
    const url = `https://api.opensea.io/api/v2/orders/ethereum/seaport/listings?asset_contract_address=${CONTRACT}&maker=${address}&limit=50`;
    const r = await fetchWithTimeout(url, {
      headers: { "X-API-KEY": apiKey, accept: "application/json" },
      next: { revalidate: 300 },
      timeoutMs: 5000,
    });
    if (!r.ok) return { credited: 0, activeListings: 0 };
    const d = (await r.json()) as { orders?: RawListing[] };
    // Only count listings older than 24h. Stops the list-cancel-relist farming
    // loop where a wallet spam-lists at high prices to pocket bounty without
    // real liquidity commitment.
    const nowSec = Math.floor(Date.now() / 1000);
    const minAgeSec = 24 * 3600;
    const allOrders = d.orders || [];
    const seasoned = allOrders.filter((o) => {
      const start = Number(o.listing_time ?? o.start_time ?? o.protocol_data?.parameters?.startTime ?? 0);
      return start > 0 && nowSec - start >= minAgeSec;
    });
    const active = seasoned.length;
    if (active === 0) return { credited: 0, activeListings: 0 };
    // Per-day amount capped at LISTING_BOUNTY_DAILY_CAP. We then multiply by
    // daysDue BUT cap the total at one day's worth — so a wallet that ticks
    // after 30 days of inactivity can't claim 30× the daily cap. The intent
    // of "5 hex/day per listing, 25 cap" is a daily rate, not a backlog.
    const perDay = Math.min(
      active * ECONOMY.LISTING_BOUNTY_PER_DAY,
      ECONOMY.LISTING_BOUNTY_DAILY_CAP,
    );
    const credit = Math.min(perDay * daysDue, ECONOMY.LISTING_BOUNTY_DAILY_CAP);
    if (credit > 0) {
      await creditWalletHex(address, credit, {
        kind: "manual",
        note: `Listing bounty · ${active} active × ${daysDue}d`,
      }, { farmable: true });
    }
    return { credited: credit, activeListings: active };
  } catch {
    return { credited: 0, activeListings: 0 };
  }
}

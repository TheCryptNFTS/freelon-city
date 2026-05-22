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
  setWalletHex,
} from "@/lib/wallet-hex-store";
import { ECONOMY, ethToHex } from "@/lib/economy-constants";

const DAY_MS = 86_400_000;

type RawSale = {
  event_type?: string;
  event_timestamp?: number;
  seller?: string;
  payment?: { quantity?: string; decimals?: number };
  nft?: { identifier?: string };
  transaction?: string;
};

/** Credit 5% of recent sale ETH (as hex) for sales the wallet made since the
 * last cursor. Capped at SALE_SHARE_MAX_PER_24H sales counted per UTC day. */
export async function creditSaleShare(address: string): Promise<{ credited: number; sales: number }> {
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
      .filter((e) => (e.nft?.identifier ? (e.event_timestamp || 0) > cursor : false))
      // Filter to this collection only (events api returns multi-collection)
      .filter((e) => {
        // The /events/accounts endpoint doesn't return contract per row consistently;
        // accept anything with a numeric identifier in range as a freelon. Cheap.
        const tid = Number(e.nft?.identifier);
        return Number.isFinite(tid) && tid >= 1 && tid <= 4040;
      });

    if (events.length === 0) return { credited: 0, sales: 0 };

    // Apply per-24h cap: count up to MAX_PER_24H newest sales
    const cap = ECONOMY.SALE_SHARE_MAX_PER_24H;
    const ordered = events.sort((a, b) => (b.event_timestamp || 0) - (a.event_timestamp || 0));
    const within24h = ordered.filter((e) => Date.now() - (e.event_timestamp || 0) * 1000 < DAY_MS);
    const eligible = within24h.slice(0, cap);

    let totalCredit = 0;
    let newestTs = cursor;
    for (const ev of eligible) {
      const qty = ev.payment?.quantity ? BigInt(ev.payment.quantity) : 0n;
      const dec = ev.payment?.decimals ?? 18;
      const eth = qty > 0n ? Number(qty) / 10 ** dec : 0;
      const share = (eth * ECONOMY.SALE_SHARE_PCT) / 100;
      const hex = ethToHex(share);
      if (hex > 0) {
        await creditWalletHex(address, hex, {
          kind: "manual",
          note: `Sale share · #${ev.nft?.identifier} · ${eth.toFixed(4)} ETH × ${ECONOMY.SALE_SHARE_PCT}%`,
        });
        totalCredit += hex;
      }
      newestTs = Math.max(newestTs, ev.event_timestamp || 0);
    }

    // Advance cursor
    const after = await getWalletHex(address);
    after.lastSaleCreditTs = newestTs;
    after.lastActiveDay = new Date().toISOString().slice(0, 10);
    await setWalletHex(after);

    return { credited: totalCredit, sales: eligible.length };
  } catch {
    return { credited: 0, sales: 0 };
  }
}

/** One-time bounty when a wallet first holds a freelon. */
export async function creditFreshBlood(
  address: string,
  balance: number,
): Promise<{ credited: number }> {
  if (balance <= 0) return { credited: 0 };
  const rec = await getWalletHex(address);
  if (rec.freshBloodAwardedAt) return { credited: 0 };
  // Cooldown: a wallet that previously held + sold cannot re-claim within 7d.
  // Approximation: if any prior hex events exist, treat as not fresh.
  if (rec.events.length > 0 || rec.lifetimeEarned > 0) {
    // Mark as awarded so we don't re-check forever
    rec.freshBloodAwardedAt = Date.now();
    await setWalletHex(rec);
    return { credited: 0 };
  }
  await creditWalletHex(address, ECONOMY.FRESH_BLOOD_BOUNTY, {
    kind: "manual",
    note: "Fresh blood · first freelon acquired",
  });
  const after = await getWalletHex(address);
  after.freshBloodAwardedAt = Date.now();
  await setWalletHex(after);
  return { credited: ECONOMY.FRESH_BLOOD_BOUNTY };
}

type RawListing = {
  protocol_data?: { parameters?: { offer?: Array<{ identifierOrCriteria?: string }> } };
  price?: { current?: { value?: string; decimals?: number } };
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
    const active = (d.orders || []).length;
    if (active === 0) return { credited: 0, activeListings: 0 };
    const perDay = Math.min(
      active * ECONOMY.LISTING_BOUNTY_PER_DAY,
      ECONOMY.LISTING_BOUNTY_DAILY_CAP,
    );
    const credit = perDay * daysDue;
    if (credit > 0) {
      await creditWalletHex(address, credit, {
        kind: "manual",
        note: `Listing bounty · ${active} active × ${daysDue}d`,
      });
    }
    return { credited: credit, activeListings: active };
  } catch {
    return { credited: 0, activeListings: 0 };
  }
}

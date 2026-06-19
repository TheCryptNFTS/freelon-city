/**
 * Defender auto-detection scan.
 *
 * Replaces the manual /api/defender claim form (v1). Reads active
 * collection offers from OpenSea, matches the offerer to qualifying
 * wallets, credits hex for new bids, marks fills + 7-day holds.
 *
 * Runs from the existing sweep-bounty cron — zero new cron slots,
 * piggybacks on the OpenSea connection already open.
 *
 * Detection rules:
 *   - Offer must be on the FREELON CITY contract (collection or
 *     single-token, both count).
 *   - Offer price (per item) must be >= floor * BID_MULTIPLIER (1.4).
 *   - Offer must be from a wallet — bot offers (ID-less) skipped.
 *   - First time we see a (wallet, offerHash) pair → recordBid +
 *     +500 hex credit.
 *   - When a known offer disappears AND a matching sale event fires
 *     in the same window → mark as filled, +1000 hex bonus.
 *   - When a known offer is still active 7 days later → mark as
 *     DEFENDER + +2000 hex bonus + permanent badge.
 *
 * Dedup: every credit fires through Upstash SETNX so retries don't
 * double-pay.
 */

import { CONTRACT } from "@/lib/constants";
import { creditWalletHex } from "@/lib/wallet-hex-store";
import { recordBid, bumpHexCredited } from "@/lib/defender-store";
import { weiToEth } from "@/lib/eth-math";
import { upstash, hasUpstash } from "@/lib/upstash-client";

const COLLECTION_SLUG = "freelons";
const BID_MULTIPLIER = 1.4;
const REWARD_PLACED = 500;
const REWARD_FILLED = 1000;
const REWARD_HOLD_7D = 2000;
const HOLD_DAYS = 7;

const KEY_OFFER_SEEN = (hash: string) => `freelon:defender:offer-seen:${hash}`;
const KEY_OFFER_TS = (hash: string) => `freelon:defender:offer-ts:${hash}`;
const KEY_HOLD_AWARDED = (hash: string) => `freelon:defender:hold-awarded:${hash}`;
const KEY_LAST_SCAN = "freelon:defender:last-scan";

type OsOffer = {
  order_hash?: string;
  offerer?: string;
  maker?: { address?: string };
  protocol_data?: {
    parameters?: {
      offer?: Array<{ startAmount?: string; itemType?: number }>;
      consideration?: Array<{ recipient?: string; identifierOrCriteria?: string; token?: string; itemType?: number }>;
    };
  };
  price?: {
    current?: { value?: string; decimals?: number; currency?: string };
  };
  // Older shape:
  current_price?: string;
};

type OsStats = { total?: { floor_price?: number } };

async function fetchFloor(): Promise<number> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return 0;
  try {
    const r = await fetch(
      `https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}/stats`,
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!r.ok) return 0;
    const d = (await r.json()) as OsStats;
    return Number(d?.total?.floor_price || 0);
  } catch {
    return 0;
  }
}

async function fetchCollectionOffers(): Promise<OsOffer[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  try {
    // OpenSea v2 collection offers endpoint
    const r = await fetch(
      `https://api.opensea.io/api/v2/offers/collection/${COLLECTION_SLUG}/all?limit=50`,
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, cache: "no-store" },
    );
    if (!r.ok) return [];
    const d = (await r.json()) as { offers?: OsOffer[] };
    return Array.isArray(d.offers) ? d.offers : [];
  } catch {
    return [];
  }
}

function offererOf(o: OsOffer): string {
  const a = o.offerer || o.maker?.address || "";
  return a.toLowerCase();
}

function priceEthOf(o: OsOffer): number {
  const wei = o.price?.current?.value || o.current_price;
  if (!wei) return 0;
  const decimals = o.price?.current?.decimals ?? 18;
  return weiToEth(wei, decimals);
}

/** The contract the offerer wants to RECEIVE (the NFT side of the Seaport
 *  consideration). Returns "" when the offer doesn't expose it — callers must
 *  fail OPEN on absence (mirror lib/economy-extras.ts: reject only when present
 *  AND wrong) so a legit FREELON offer with a thin payload isn't dropped. */
function considContractOf(o: OsOffer): string {
  const items = o.protocol_data?.parameters?.consideration || [];
  for (const it of items) {
    // Seaport NFT item types: 2 = ERC721, 4 = ERC721_WITH_CRITERIA,
    // 3 = ERC1155, 5 = ERC1155_WITH_CRITERIA. A collection offer carries the
    // FREELON contract on the criteria item; pick the first NFT-bearing token.
    const t = (it.token || "").toLowerCase();
    // Only the NFT consideration item (types 2/3/4/5) carries the collection
    // contract — skip ERC20 fee items (e.g. a WETH royalty) so they don't shadow it.
    if (t && [2, 3, 4, 5].includes(it.itemType ?? -1)) return t;
  }
  return "";
}

export type DefenderScanResult = {
  ok: boolean;
  reason: string;
  scanned?: number;
  qualifying?: number;
  newlyCredited?: number;
  holdsAwarded?: number;
};

/**
 * Scan once. Returns counts so the cron response can be debugged.
 * Designed to be idempotent on repeated calls within the same window —
 * the SETNX dedupe means re-seeing an offer doesn't re-credit.
 */
export async function runDefenderScan(): Promise<DefenderScanResult> {
  if (!process.env.OPENSEA_API_KEY) {
    return { ok: false, reason: "no_opensea_key" };
  }
  const [floor, offers] = await Promise.all([fetchFloor(), fetchCollectionOffers()]);
  if (floor <= 0) {
    return { ok: false, reason: "no_floor" };
  }
  if (offers.length === 0) {
    return { ok: true, reason: "no_offers", scanned: 0, qualifying: 0 };
  }
  const threshold = floor * BID_MULTIPLIER;
  let qualifying = 0;
  let newlyCredited = 0;
  let holdsAwarded = 0;
  const now = Date.now();

  for (const o of offers) {
    const hash = o.order_hash || "";
    if (!hash) continue;
    const wallet = offererOf(o);
    if (!/^0x[a-f0-9]{40}$/.test(wallet)) continue;
    const eth = priceEthOf(o);
    if (eth <= 0 || eth < threshold) continue;
    // CONTRACT SCOPE (security): only pay the bid-wall bounty for offers on the
    // FREELON CITY contract. The OpenSea collection-offers endpoint can surface
    // wrong-contract / cross-collection offers; without this an offer on another
    // collection paid out +500/+2000⬡. Mirror lib/economy-extras.ts — reject only
    // when the consideration token is PRESENT and not ours (fail open on absence).
    const considContract = considContractOf(o);
    if (considContract && considContract !== CONTRACT.toLowerCase()) continue;
    qualifying++;

    // First-time seen?
    if (hasUpstash) {
      try {
        const setRes = await upstash([
          "SET", KEY_OFFER_SEEN(hash), "1", "NX", "EX", "5184000", // 60d
        ]);
        const isNew = setRes === "OK";
        if (isNew) {
          // Record placement timestamp for the 7-day hold check
          await upstash(["SETEX", KEY_OFFER_TS(hash), "5184000", String(now)]);
          await recordBid({ wallet, bidEth: eth, floorEthAtBid: floor });
          try {
            await creditWalletHex(wallet, REWARD_PLACED, {
              kind: "manual",
              note: `Hold the line · bid placed · ${eth.toFixed(4)} Ξ · +${REWARD_PLACED}⬡`,
            });
            await bumpHexCredited(REWARD_PLACED);
            newlyCredited++;
          } catch {/* non-fatal */}
        } else {
          // Already seen — check if eligible for 7-day hold bonus
          const placedRaw = (await upstash(["GET", KEY_OFFER_TS(hash)])) as string | null;
          const placedAt = placedRaw ? Number(placedRaw) : 0;
          if (placedAt > 0 && now - placedAt >= HOLD_DAYS * 86_400_000) {
            const awarded = await upstash(["SET", KEY_HOLD_AWARDED(hash), "1", "NX", "EX", "5184000"]);
            if (awarded === "OK") {
              try {
                await creditWalletHex(wallet, REWARD_HOLD_7D, {
                  kind: "manual",
                  note: `Hold the line · ${HOLD_DAYS}-day HOLD · DEFENDER OF THE FLOOR · +${REWARD_HOLD_7D}⬡`,
                });
                await bumpHexCredited(REWARD_HOLD_7D);
                holdsAwarded++;
              } catch {/* non-fatal */}
            }
          }
        }
      } catch {/* per-offer error — keep scanning */}
    }
  }

  if (hasUpstash) {
    try { await upstash(["SET", KEY_LAST_SCAN, String(now), "EX", "604800"]); } catch {}
  }

  return {
    ok: true,
    reason: newlyCredited > 0 ? "credited" : (qualifying > 0 ? "all_already_credited" : "nothing_qualified"),
    scanned: offers.length,
    qualifying,
    newlyCredited,
    holdsAwarded,
  };
}

// FILL DETECTION
// When a sale fires in sweep-bounty, the buyer of that sale is the
// person who placed the winning bid (in most cases). The sweep cron
// already credits sweeps (+25⬡) and rescues (+250⬡). Defender FILLED
// bonus would credit an extra +1000⬡ if the buyer had a matching
// active defender bid. The matching logic is non-trivial because
// OpenSea sales don't always reference the originating offer hash.
//
// v2.1: simple heuristic — if the buyer wallet has any active offer
// in our SEEN set at the time of sale, treat it as fill, credit +1000.
// Skipped for v2.0 to keep this commit tight; the +500 placed and
// +2000 held bonuses are the two big-impact rewards.
export async function maybeAwardFillBonus(buyer: string): Promise<boolean> {
  // Stub for now — will scan offers-by-wallet on next iteration.
  void buyer;
  return false;
}

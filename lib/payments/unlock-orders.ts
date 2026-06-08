/**
 * Unlock payment orders — a one-time ETH payment that activates a citizen's
 * agent. Mirrors lib/payments/orders.ts (sender-matched, exact-amount, txHash
 * dedupe) but the price is a FIXED ETH amount from the rarity tier (no USD
 * conversion). Owner is known from ownership, so we match on from==owner +
 * exact wei + to==project wallet.
 */
import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { getCitizen } from "@/lib/citizens";
import { unlockTierFor, UNLOCK_TIERS } from "@/lib/missions/unlock";
import { PAYMENT_WALLET } from "@/lib/missions/pricing";

const CONFIGURED_RPC = process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL || null;
const PUBLIC_FALLBACKS = [
  "https://eth-pokt.nodies.app",
  "https://eth.rpc.blxrbdn.com",
  "https://ethereum-rpc.publicnode.com",
  "https://eth.drpc.org",
];
const client = createPublicClient({
  chain: mainnet,
  transport: fallback(
    [
      ...(CONFIGURED_RPC ? [http(CONFIGURED_RPC, { timeout: 6000 })] : []),
      ...PUBLIC_FALLBACKS.map((u) => http(u, { timeout: 5000 })),
    ],
    { rank: false, retryCount: 1 },
  ),
});

const QUOTE_TTL_SEC = 15 * 60;
const MIN_CONFIRMATIONS = 2n;
// Largest random suffix createUnlockQuote can append (≤4095 gwei, in wei). Used
// to reconstruct the expected payment window when the stored quote has expired.
const MAX_SUFFIX_WEI = 4095n * 1_000_000_000n;
const GWEI = 1_000_000_000n;
const MAX_TOKEN_ID = 4040;

export type UnlockKind = "activate" | "recharge";

/**
 * Attribute a bare unlock payment to its citizen from the ON-CHAIN VALUE ALONE.
 * createUnlockQuote encodes the tokenId as the gwei suffix on the tier base
 * (value = tierBaseWei + tokenId×1gwei), so any payment tx is permanently
 * self-describing with no server state. We scan every tier base (both kinds),
 * decode the candidate tokenId from the suffix, and confirm that token really
 * IS that tier — which also disambiguates the one base collision (Uncommon
 * activate == Rare recharge == 0.01 ETH), since a token has exactly one tier.
 *
 * Returns null for values that fit no tier window or whose decoded id doesn't
 * match its tier (e.g. legacy random-suffix payments minted before this change).
 * Use this for recovery tooling and "this payment was for #X" self-serve hints.
 */
export function attributeUnlockPayment(weiValue: bigint): { tokenId: number; tier: string; kind: UnlockKind } | null {
  for (const tierName of Object.keys(UNLOCK_TIERS) as (keyof typeof UNLOCK_TIERS)[]) {
    const resolved = unlockTierFor(tierName);
    const bases: [UnlockKind, number][] = [
      ["activate", resolved.priceEth],
      ["recharge", resolved.rechargeEth],
    ];
    for (const [kind, baseEth] of bases) {
      const base = BigInt(Math.round(baseEth * 1e18));
      const diff = weiValue - base;
      if (diff <= 0n || diff > BigInt(MAX_TOKEN_ID) * GWEI || diff % GWEI !== 0n) continue;
      const tokenId = Number(diff / GWEI);
      const c = getCitizen(tokenId);
      if (c && unlockTierFor(c.tier).tier === resolved.tier) {
        return { tokenId, tier: resolved.tier, kind };
      }
    }
  }
  return null;
}

export type UnlockOrder = {
  wallet: string;
  tokenId: number;
  tier: string;
  kind: UnlockKind;
  priceEth: number;
  wei: string;
  ethLabel: string;
  toWallet: string;
  createdAt: number;
  expiresAt: number;
};

const memOrders = new Map<string, UnlockOrder>();
const memTx = new Set<string>();
const ORDER_KEY = (wallet: string, cid: number) => `freelon:unlockorder:v1:${wallet.toLowerCase()}:${cid}`;
const TX_USED = (txHash: string) => `freelon:unlockorder:tx:${txHash.toLowerCase()}`;

/** Quote an activation OR recharge for a citizen (price by tier + kind). */
export async function createUnlockQuote(args: { wallet: string; tokenId: number; kind: UnlockKind }): Promise<UnlockOrder | { error: string }> {
  const citizen = getCitizen(args.tokenId);
  if (!citizen) return { error: "unknown_citizen" };
  const tier = unlockTierFor(citizen.tier);
  const priceEth = args.kind === "recharge" ? tier.rechargeEth : tier.priceEth;

  // SELF-DESCRIBING PAYMENT: encode the tokenId into the gwei suffix, so the
  // on-chain amount itself points back to the citizen. TokenIds (1..4040) fit
  // inside the ≤4095-gwei window, and tier bases are separated by millions of
  // gwei, so a suffix can never cross into another tier. This means a bare
  // payment tx is permanently attributable (value→tier→tokenId) with NO server
  // state — closing the "holder paid but we can't tell which citizen" orphan
  // when the quote TTL expires before the claim lands.
  const baseWei = BigInt(Math.round(priceEth * 1e18));
  const suffixWei = BigInt(args.tokenId) * 1_000_000_000n; // tokenId as gwei
  const wei = baseWei + suffixWei;

  const now = Date.now();
  const order: UnlockOrder = {
    wallet: args.wallet.toLowerCase(),
    tokenId: args.tokenId,
    tier: tier.tier,
    kind: args.kind,
    priceEth,
    wei: wei.toString(),
    ethLabel: (Number(wei) / 1e18).toFixed(6),
    toWallet: PAYMENT_WALLET,
    createdAt: now,
    expiresAt: now + QUOTE_TTL_SEC * 1000,
  };
  const key = ORDER_KEY(order.wallet, order.tokenId);
  if (hasUpstash) await upstash(["SET", key, JSON.stringify(order), "EX", String(QUOTE_TTL_SEC)]).catch(() => {});
  else memOrders.set(key, order);
  return order;
}

async function getOrder(wallet: string, cid: number): Promise<UnlockOrder | null> {
  const key = ORDER_KEY(wallet, cid);
  if (!hasUpstash) {
    const o = memOrders.get(key);
    return o && o.expiresAt > Date.now() ? o : null;
  }
  try {
    const raw = (await upstash(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as UnlockOrder) : null;
  } catch {
    return null;
  }
}

async function markTxUsed(txHash: string): Promise<boolean> {
  if (hasUpstash) {
    try {
      return (await upstash(["SET", TX_USED(txHash), "1", "NX", "EX", "604800"])) === "OK";
    } catch {
      return false; // fail closed
    }
  }
  if (memTx.has(txHash.toLowerCase())) return false;
  memTx.add(txHash.toLowerCase());
  return true;
}

export type UnlockVerifyResult = { ok: true; order: UnlockOrder } | { ok: false; error: string };

/**
 * Reconstruct the expected order from a citizen's tier when the stored quote has
 * expired. The on-chain tx carries everything we need to verify a payment
 * (from/to/value), so a payment must NEVER be lost just because the 15-min quote
 * TTL elapsed (slow confirmations, a closed tab, a retry). This was the root
 * cause of recurring "I paid to unlock but it won't activate" reports: the holder
 * paid a valid quote-matched amount, then the claim ran after the quote expired
 * → no_quote_or_expired dead-end, forever, despite a permanently valid tx.
 *
 * The amount check stays tight: the value must land in [baseWei, baseWei+maxSuffix]
 * for the tier+kind — the exact window createUnlockQuote could ever have minted —
 * so a random transfer to the project wallet can't be passed off as an unlock.
 * Combined with from==owner (ownership re-checked by the caller) and the txHash
 * dedupe, the synthetic order is as safe as the stored one.
 */
function syntheticOrder(wallet: string, tokenId: number, kind: UnlockKind): UnlockOrder | null {
  const citizen = getCitizen(tokenId);
  if (!citizen) return null;
  const tier = unlockTierFor(citizen.tier);
  const priceEth = kind === "recharge" ? tier.rechargeEth : tier.priceEth;
  const baseWei = BigInt(Math.round(priceEth * 1e18));
  return {
    wallet: wallet.toLowerCase(),
    tokenId,
    tier: tier.tier,
    kind,
    priceEth,
    wei: baseWei.toString(), // base; the window is applied in verify
    ethLabel: priceEth.toFixed(6),
    toWallet: PAYMENT_WALLET,
    createdAt: 0,
    expiresAt: 0,
  };
}

/**
 * Verify the holder's tx pays their unlock. Verification is driven by the
 * citizen's TIER PRICE, never by the ephemeral stored quote — the on-chain tx
 * carries everything we need (from/to/value), so a payment must never be lost
 * because the 15-min quote TTL elapsed (slow confirmations, a closed tab, a
 * retry, or a fresh quote minting a *different* random amount than the one the
 * holder already paid). Those were the root causes of recurring "I paid to
 * unlock but it won't activate" reports.
 *
 * The amount check stays tight: value must land in [baseWei, baseWei+maxSuffix]
 * for the tier+kind — the exact window createUnlockQuote could ever mint — so a
 * random transfer to the project wallet can't be passed off as an unlock.
 * Combined with from==owner (ownership re-checked by the caller) and the txHash
 * dedupe, this is as safe as an exact stored-quote match, and far more robust.
 */
export async function verifyUnlockPayment(args: { wallet: string; tokenId: number; txHash: string; kind?: UnlockKind }): Promise<UnlockVerifyResult> {
  const kind: UnlockKind = args.kind ?? "activate";
  const order = syntheticOrder(args.wallet, args.tokenId, kind);
  if (!order) return { ok: false, error: "unknown_citizen" };

  const txHash = args.txHash.trim();
  if (!/^0x[a-f0-9]{64}$/i.test(txHash)) return { ok: false, error: "bad_txhash" };

  let tx, receipt;
  try {
    tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return { ok: false, error: "tx_not_found_yet" };
  }
  if (!tx || !receipt) return { ok: false, error: "tx_not_found_yet" };
  if (receipt.status !== "success") return { ok: false, error: "tx_failed" };
  if (tx.from.toLowerCase() !== order.wallet) return { ok: false, error: "wrong_sender" };
  if ((tx.to ?? "").toLowerCase() !== order.toWallet) return { ok: false, error: "wrong_recipient" };
  // Accept the exact tier base price plus up to the max random suffix a quote
  // could have carried. Tight window — NOT a "≥ price" check.
  const base = BigInt(order.wei);
  if (tx.value < base || tx.value > base + MAX_SUFFIX_WEI) return { ok: false, error: "wrong_amount" };

  try {
    const head = await client.getBlockNumber();
    if (receipt.blockNumber && head - receipt.blockNumber < MIN_CONFIRMATIONS) {
      return { ok: false, error: "awaiting_confirmations" };
    }
  } catch {
    return { ok: false, error: "tx_not_found_yet" };
  }

  if (!(await markTxUsed(txHash))) return { ok: false, error: "tx_already_used" };
  return { ok: true, order };
}

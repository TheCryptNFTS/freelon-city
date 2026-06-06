/**
 * Awaken payment orders — a one-time ETH payment that AWAKENS a held FREELON
 * into an active AI agent at a chosen tier. "ETH wakes the agent, HEX trains it."
 *
 * This mirrors lib/payments/unlock-orders.ts EXACTLY (sender-matched,
 * exact-amount, txHash dedupe, fail-closed) — the only differences are:
 *   - the price is a FIXED ETH amount from the AWAKEN tier (no USD conversion);
 *   - the quote is keyed by tokenId + tier so spark vs signal never collide.
 *
 * SAFE attribution: the payer is already known from CITIZEN OWNERSHIP, so we
 * match the payment on SENDER + exact wei + recipient==project wallet. The
 * exact wei carries a tiny per-order suffix so two quotes never share an amount.
 */
import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { PAYMENT_WALLET } from "@/lib/missions/pricing";
import { awakenTier, ethStringToWei, type AwakenTierKey } from "@/lib/economy-constants";

const CONFIGURED_RPC = process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL || null;
const PUBLIC_FALLBACKS = [
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
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

export type AwakenOrder = {
  quoteId: string;
  wallet: string; // lowercased owner wallet (the payer)
  tokenId: number;
  tierKey: AwakenTierKey;
  tierNum: number; // 1 = spark, 2 = signal
  baseEth: string; // the canonical tier price (e.g. "0.015")
  wei: string; // exact amount to send (string — bigint not JSON-safe)
  ethLabel: string; // human "0.015003"
  toWallet: string;
  createdAt: number;
  expiresAt: number;
};

const memOrders = new Map<string, AwakenOrder>();
const memTx = new Set<string>();
// Keyed by wallet + tokenId + tier so a holder can hold separate spark/signal
// quotes, and a re-quote for the same tier refreshes in place.
const ORDER_KEY = (wallet: string, tokenId: number, tierKey: string) =>
  `freelon:awakenorder:v1:${wallet.toLowerCase()}:${tokenId}:${tierKey}`;
const TX_USED = (txHash: string) => `freelon:awakenorder:tx:${txHash.toLowerCase()}`;

/** Quote an awaken for a citizen at a tier (fixed ETH price + collision suffix). */
export async function createAwakenQuote(args: {
  wallet: string;
  tokenId: number;
  tierKey: string;
}): Promise<AwakenOrder | { error: string }> {
  const tier = awakenTier(args.tierKey);
  if (!tier) return { error: "unknown_tier" };

  // Base wei from the canonical ETH string (no float math), then add a tiny
  // unique suffix (0–4095 gwei, ~<0.0000041 ETH) so two concurrent orders never
  // share an exact amount — the core of safe sender+amount attribution.
  let baseWei: bigint;
  try {
    baseWei = ethStringToWei(tier.eth);
  } catch {
    return { error: "price_unavailable" };
  }
  const suffixWei = BigInt(Math.floor(Math.random() * 4096)) * 1_000_000_000n;
  const wei = baseWei + suffixWei;

  const now = Date.now();
  const order: AwakenOrder = {
    quoteId: `awk_${tier.key}_${args.tokenId}_${now.toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
    wallet: args.wallet.toLowerCase(),
    tokenId: args.tokenId,
    tierKey: tier.key,
    tierNum: tier.tier,
    baseEth: tier.eth,
    wei: wei.toString(),
    ethLabel: (Number(wei) / 1e18).toFixed(6),
    toWallet: PAYMENT_WALLET,
    createdAt: now,
    expiresAt: now + QUOTE_TTL_SEC * 1000,
  };

  const key = ORDER_KEY(order.wallet, order.tokenId, order.tierKey);
  if (hasUpstash) await upstash(["SET", key, JSON.stringify(order), "EX", String(QUOTE_TTL_SEC)]).catch(() => {});
  else memOrders.set(key, order);
  return order;
}

async function getOrder(wallet: string, tokenId: number, tierKey: string): Promise<AwakenOrder | null> {
  const key = ORDER_KEY(wallet, tokenId, tierKey);
  if (!hasUpstash) {
    const o = memOrders.get(key);
    return o && o.expiresAt > Date.now() ? o : null;
  }
  try {
    const raw = (await upstash(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as AwakenOrder) : null;
  } catch {
    return null;
  }
}

/** One tx settles one awaken — atomic SET NX so a txHash can't be replayed. */
async function markTxUsed(txHash: string): Promise<boolean> {
  if (hasUpstash) {
    try {
      return (await upstash(["SET", TX_USED(txHash), "1", "NX", "EX", "604800"])) === "OK";
    } catch {
      return false; // fail closed — better to block than double-awaken
    }
  }
  if (memTx.has(txHash.toLowerCase())) return false;
  memTx.add(txHash.toLowerCase());
  return true;
}

export type AwakenVerifyResult =
  | { ok: true; order: AwakenOrder; block: number }
  | { ok: false; error: string };

/**
 * Verify a holder's tx pays their pending awaken quote.
 * Matches on from==owner, to==project wallet, value==quote, status==success,
 * >= MIN_CONFIRMATIONS, then dedupes the txHash. Returns the settled order plus
 * the block the payment landed in (the anchor recorded off-chain).
 */
export async function verifyAwakenPayment(args: {
  wallet: string;
  tokenId: number;
  tierKey: string;
  txHash: string;
}): Promise<AwakenVerifyResult> {
  const order = await getOrder(args.wallet, args.tokenId, args.tierKey);
  if (!order) return { ok: false, error: "no_quote_or_expired" };

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
  if (tx.value.toString() !== order.wei) return { ok: false, error: "wrong_amount" };

  let block = 0;
  try {
    const head = await client.getBlockNumber();
    if (receipt.blockNumber == null || head - receipt.blockNumber < MIN_CONFIRMATIONS) {
      return { ok: false, error: "awaiting_confirmations" };
    }
    block = Number(receipt.blockNumber);
  } catch {
    return { ok: false, error: "tx_not_found_yet" };
  }

  // One tx = one awaken. Atomic, last so a confirmed+valid tx isn't burned on an
  // earlier failed check.
  if (!(await markTxUsed(txHash))) return { ok: false, error: "tx_already_used" };

  return { ok: true, order, block };
}

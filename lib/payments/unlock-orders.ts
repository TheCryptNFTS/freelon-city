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
import { unlockTierFor } from "@/lib/missions/unlock";
import { PAYMENT_WALLET } from "@/lib/missions/pricing";

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

export type UnlockKind = "activate" | "recharge";

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

  const baseWei = BigInt(Math.round(priceEth * 1e18));
  const suffixWei = BigInt(Math.floor(Math.random() * 4096)) * 1_000_000_000n; // ≤4095 gwei, collision-free
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

/** Verify the holder's tx pays their pending unlock quote. */
export async function verifyUnlockPayment(args: { wallet: string; tokenId: number; txHash: string }): Promise<UnlockVerifyResult> {
  const order = await getOrder(args.wallet, args.tokenId);
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

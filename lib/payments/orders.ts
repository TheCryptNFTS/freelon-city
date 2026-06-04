/**
 * Mission payment orders — direct ETH to the project wallet, verified on-chain.
 *
 * SAFE attribution (the red-team-approved version of "send to one wallet"):
 * the payer is already known from CITIZEN OWNERSHIP, so we match the payment on
 * SENDER + amount, not amount alone. That kills the collision/front-run problem.
 *
 * Flow:
 *   1. createQuote(): server picks an EXACT wei amount (USD÷liveETH + a tiny
 *      per-order suffix so two orders never collide) and stores a pending order
 *      keyed by the owner wallet, with a short TTL.
 *   2. holder sends that exact ETH FROM their owning wallet TO the project wallet.
 *   3. verifyPayment(txHash): fetch the tx + receipt; require
 *      from == order.wallet, to == PAYMENT_WALLET, value == order.wei,
 *      status == success, >= MIN_CONFIRMATIONS. Dedupe txHash so one tx settles
 *      one order. Only then is the mission allowed to run.
 */

import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { getUsdPerEth } from "@/lib/eth-price";
import { PAYMENT_WALLET, priceUsdFor } from "@/lib/missions/pricing";

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

const QUOTE_TTL_SEC = 10 * 60; // 10 minutes
const MIN_CONFIRMATIONS = 2n;

export type Order = {
  wallet: string; // lowercased owner wallet (the payer)
  citizenId: number;
  missionId: string;
  usd: number;
  wei: string; // exact amount to send (string — bigint not JSON-safe)
  ethLabel: string; // human "0.006013"
  toWallet: string;
  createdAt: number;
  expiresAt: number;
};

const memOrders = new Map<string, Order>();
const ORDER_KEY = (wallet: string, missionId: string, cid: number) =>
  `freelon:order:v1:${wallet.toLowerCase()}:${missionId}:${cid}`;
const TX_USED = (txHash: string) => `freelon:order:tx:${txHash.toLowerCase()}`;

/** Create (or refresh) a pending quote for an owner + mission + citizen. */
export async function createQuote(args: {
  wallet: string;
  citizenId: number;
  missionId: string;
}): Promise<Order | { error: string }> {
  const usd = priceUsdFor(args.missionId);
  if (usd <= 0) return { error: "not_a_paid_mission" };

  const usdPerEth = await getUsdPerEth();
  if (!usdPerEth || usdPerEth <= 0) return { error: "price_unavailable" };

  // Base ETH for the USD price, then add a tiny unique suffix (0–4095 gwei) so
  // two concurrent orders never share an exact amount. ~<0.0000041 ETH noise.
  const baseWei = BigInt(Math.round((usd / usdPerEth) * 1e18));
  const suffixWei = BigInt(Math.floor(Math.random() * 4096)) * 1_000_000_000n; // up to 4095 gwei
  const wei = baseWei + suffixWei;

  const now = Date.now();
  const order: Order = {
    wallet: args.wallet.toLowerCase(),
    citizenId: args.citizenId,
    missionId: args.missionId,
    usd,
    wei: wei.toString(),
    ethLabel: (Number(wei) / 1e18).toFixed(6),
    toWallet: PAYMENT_WALLET,
    createdAt: now,
    expiresAt: now + QUOTE_TTL_SEC * 1000,
  };

  const key = ORDER_KEY(order.wallet, order.missionId, order.citizenId);
  if (hasUpstash) {
    await upstash(["SET", key, JSON.stringify(order), "EX", String(QUOTE_TTL_SEC)]);
  } else {
    memOrders.set(key, order);
  }
  return order;
}

async function getOrder(wallet: string, missionId: string, cid: number): Promise<Order | null> {
  const key = ORDER_KEY(wallet, missionId, cid);
  if (!hasUpstash) {
    const o = memOrders.get(key);
    return o && o.expiresAt > Date.now() ? o : null;
  }
  try {
    const raw = (await upstash(["GET", key])) as string | null;
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

/** One tx settles one order — atomic SET NX so a txHash can't be replayed. */
async function markTxUsed(txHash: string): Promise<boolean> {
  if (hasUpstash) {
    try {
      return (await upstash(["SET", TX_USED(txHash), "1", "NX", "EX", "604800"])) === "OK";
    } catch {
      return false; // fail closed — better to block than double-credit
    }
  }
  // dev: in-process set
  if (memTx.has(txHash.toLowerCase())) return false;
  memTx.add(txHash.toLowerCase());
  return true;
}
const memTx = new Set<string>();

/**
 * Release a tx-used mark so the SAME payment can settle a re-run. Called when a
 * PAID mission verified payment but the resolver then failed to deliver output —
 * the holder must be able to retry with the ETH they already sent (crypto can't
 * be auto-refunded). Pairs with markTxUsed.
 */
export async function releaseTx(txHash: string): Promise<void> {
  if (hasUpstash) {
    await upstash(["DEL", TX_USED(txHash)]).catch(() => {});
    return;
  }
  memTx.delete(txHash.toLowerCase());
}

/** Delete a settled order (hygiene) after a paid mission successfully delivered. */
export async function consumeOrder(wallet: string, missionId: string, cid: number): Promise<void> {
  const key = ORDER_KEY(wallet, missionId, cid);
  if (hasUpstash) {
    await upstash(["DEL", key]).catch(() => {});
    return;
  }
  memOrders.delete(key);
}

export type VerifyResult =
  | { ok: true; order: Order }
  | { ok: false; error: string };

/**
 * Verify a holder's payment tx unlocks their pending mission order.
 * Matches on from==owner, to==project wallet, value==quote, confirmed.
 */
export async function verifyPayment(args: {
  wallet: string;
  citizenId: number;
  missionId: string;
  txHash: string;
}): Promise<VerifyResult> {
  const order = await getOrder(args.wallet, args.missionId, args.citizenId);
  if (!order) return { ok: false, error: "no_quote_or_expired" };

  const txHash = args.txHash.trim();
  if (!/^0x[a-f0-9]{64}$/i.test(txHash)) return { ok: false, error: "bad_txhash" };

  let tx, receipt;
  try {
    tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return { ok: false, error: "tx_not_found_yet" }; // not mined / RPC miss → retry
  }
  if (!tx || !receipt) return { ok: false, error: "tx_not_found_yet" };
  if (receipt.status !== "success") return { ok: false, error: "tx_failed" };

  // SENDER must be the owner who was quoted (the core of safe attribution).
  if (tx.from.toLowerCase() !== order.wallet) return { ok: false, error: "wrong_sender" };
  // Destination must be the project wallet.
  if ((tx.to ?? "").toLowerCase() !== order.toWallet) return { ok: false, error: "wrong_recipient" };
  // Exact amount (the unique-suffix quote).
  if (tx.value.toString() !== order.wei) return { ok: false, error: "wrong_amount" };

  // Confirmations.
  try {
    const head = await client.getBlockNumber();
    if (receipt.blockNumber && head - receipt.blockNumber < MIN_CONFIRMATIONS) {
      return { ok: false, error: "awaiting_confirmations" };
    }
  } catch {
    return { ok: false, error: "tx_not_found_yet" };
  }

  // One tx = one mission. Atomic, last so a confirmed+valid tx isn't burned on
  // an earlier failed check.
  if (!(await markTxUsed(txHash))) return { ok: false, error: "tx_already_used" };

  return { ok: true, order };
}

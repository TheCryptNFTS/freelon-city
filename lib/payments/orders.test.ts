import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Coverage for verifyPayment — the on-chain attribution that gates a paid
 * mission. A regression here (a flipped comparison, a dropped toLowerCase) would
 * silently authorize $0 runs, so every guard branch is pinned: wrong sender,
 * wrong recipient, wrong amount, unconfirmed, failed, not-found, bad hash, no
 * quote, replay, and the happy path.
 *
 * In the test env there's no Upstash, so orders.ts uses its in-memory maps. We
 * only mock viem's client (the chain read) and eth-price (the quote math), so no
 * network is touched. The mock state is shared via vi.hoisted so the vi.mock
 * factory can reach it.
 */

const mock = vi.hoisted(() => ({
  state: {
    tx: null as null | { from: string; to: string | null; value: bigint },
    receipt: null as null | { status: string; blockNumber: bigint },
    head: 0n as bigint,
    throwTx: false,
  },
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: () => ({
      getTransaction: async () => {
        if (mock.state.throwTx || !mock.state.tx) throw new Error("not mined");
        return mock.state.tx;
      },
      getTransactionReceipt: async () => {
        if (mock.state.throwTx || !mock.state.receipt) throw new Error("not mined");
        return mock.state.receipt;
      },
      getBlockNumber: async () => mock.state.head,
    }),
  };
});

// Deterministic, offline quote math: $2000/ETH.
vi.mock("@/lib/eth-price", () => ({ getUsdPerEth: async () => 2000 }));

import { createQuote, verifyPayment, type Order } from "@/lib/payments/orders";
import { PAYMENT_WALLET } from "@/lib/missions/pricing";

const OWNER = "0x1111111111111111111111111111111111111111";
const STRANGER = "0x2222222222222222222222222222222222222222";
let cidSeq = 1000;

// A fresh, well-formed 64-hex txHash per test so the module's in-memory replay
// set doesn't bleed across cases (markTxUsed is process-global).
let txSeq = 0;
function freshTx(): string {
  txSeq++;
  return "0x" + txSeq.toString(16).padStart(64, "0");
}

/** Quote a paid mission for a unique citizen, then point the mocked chain at a
 *  fully-valid, confirmed payment for it. Tests then mutate one field to fail. */
async function setupValid(): Promise<{ order: Order; txHash: string }> {
  const citizenId = ++cidSeq;
  const res = await createQuote({ wallet: OWNER, citizenId, missionId: "dossier" });
  if ("error" in res) throw new Error("quote failed: " + res.error);
  const order = res;
  mock.state.tx = { from: OWNER, to: order.toWallet, value: BigInt(order.wei) };
  mock.state.receipt = { status: "success", blockNumber: 100n };
  mock.state.head = 200n; // >> MIN_CONFIRMATIONS
  mock.state.throwTx = false;
  return { order, txHash: freshTx() };
}

beforeEach(() => {
  mock.state.tx = null;
  mock.state.receipt = null;
  mock.state.head = 0n;
  mock.state.throwTx = false;
});

describe("verifyPayment — on-chain attribution guards", () => {
  it("accepts a correct, confirmed payment (happy path)", async () => {
    const { order, txHash } = await setupValid();
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.wei).toBe(order.wei);
  });

  it("rejects a replayed tx (one tx settles one mission)", async () => {
    const { order, txHash } = await setupValid();
    const first = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(first.ok).toBe(true);
    // Same txHash again — even with a fresh valid quote — must be refused.
    const res2 = await createQuote({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier" });
    if ("error" in res2) throw new Error(res2.error);
    mock.state.tx = { from: OWNER, to: res2.toWallet, value: BigInt(res2.wei) };
    const second = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(second).toEqual({ ok: false, error: "tx_already_used" });
  });

  it("rejects a payment from the wrong sender", async () => {
    const { order, txHash } = await setupValid();
    mock.state.tx = { from: STRANGER, to: order.toWallet, value: BigInt(order.wei) };
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r).toEqual({ ok: false, error: "wrong_sender" });
  });

  it("rejects a payment to the wrong recipient", async () => {
    const { order, txHash } = await setupValid();
    mock.state.tx = { from: OWNER, to: STRANGER, value: BigInt(order.wei) };
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r).toEqual({ ok: false, error: "wrong_recipient" });
  });

  it("rejects a payment of the wrong amount (underpay by 1 wei)", async () => {
    const { order, txHash } = await setupValid();
    mock.state.tx = { from: OWNER, to: order.toWallet, value: BigInt(order.wei) - 1n };
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r).toEqual({ ok: false, error: "wrong_amount" });
  });

  it("holds an under-confirmed tx for retry (awaiting_confirmations)", async () => {
    const { order, txHash } = await setupValid();
    mock.state.head = 100n; // head - blockNumber(100) = 0 < MIN_CONFIRMATIONS
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r).toEqual({ ok: false, error: "awaiting_confirmations" });
  });

  it("rejects a reverted tx", async () => {
    const { order, txHash } = await setupValid();
    mock.state.receipt = { status: "reverted", blockNumber: 100n };
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r).toEqual({ ok: false, error: "tx_failed" });
  });

  it("treats an unmined / RPC-missing tx as retryable (tx_not_found_yet)", async () => {
    const { order, txHash } = await setupValid();
    mock.state.throwTx = true;
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash });
    expect(r).toEqual({ ok: false, error: "tx_not_found_yet" });
  });

  it("rejects a malformed txHash before any chain read", async () => {
    const { order } = await setupValid();
    const r = await verifyPayment({ wallet: OWNER, citizenId: order.citizenId, missionId: "dossier", txHash: "0x123" });
    expect(r).toEqual({ ok: false, error: "bad_txhash" });
  });

  it("rejects when there is no quote for this owner+mission+citizen", async () => {
    const r = await verifyPayment({ wallet: STRANGER, citizenId: 999999, missionId: "dossier", txHash: freshTx() });
    expect(r).toEqual({ ok: false, error: "no_quote_or_expired" });
  });

  it("verifies the project wallet is the required recipient", async () => {
    // Sanity: the quote's toWallet is the configured PAYMENT_WALLET, so the
    // recipient check is anchored to the real project wallet, not a body field.
    const { order } = await setupValid();
    expect(order.toWallet).toBe(PAYMENT_WALLET);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Coverage for verifyUnlockPayment — the on-chain attribution that gates the
 * ACTIVATION payment (the actual revenue event: every citizen unlock runs through
 * here). A regression — a flipped comparison, a dropped toLowerCase — would
 * authorize a free unlock + free bonus ⬡, so every guard branch is pinned. Same
 * harness as orders.test.ts: mock viem's client only; no eth-price (unlock prices
 * are a fixed tier amount), no Upstash (the module falls to in-memory maps).
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

import { createUnlockQuote, verifyUnlockPayment, type UnlockOrder } from "@/lib/payments/unlock-orders";
import { PAYMENT_WALLET } from "@/lib/missions/pricing";

const OWNER = "0x1111111111111111111111111111111111111111";
const STRANGER = "0x2222222222222222222222222222222222222222";

// Distinct citizen per test so the in-memory order map doesn't bleed; all are
// valid token ids (1..4040).
let tokenSeq = 1;
let txSeq = 0;
function freshTx(): string {
  txSeq++;
  return "0x" + txSeq.toString(16).padStart(64, "0");
}

async function setupValid(): Promise<{ order: UnlockOrder; txHash: string }> {
  const tokenId = tokenSeq++;
  const res = await createUnlockQuote({ wallet: OWNER, tokenId, kind: "activate" });
  if ("error" in res) throw new Error("quote failed: " + res.error);
  const order = res;
  mock.state.tx = { from: OWNER, to: order.toWallet, value: BigInt(order.wei) };
  mock.state.receipt = { status: "success", blockNumber: 100n };
  mock.state.head = 200n;
  mock.state.throwTx = false;
  return { order, txHash: freshTx() };
}

beforeEach(() => {
  mock.state.tx = null;
  mock.state.receipt = null;
  mock.state.head = 0n;
  mock.state.throwTx = false;
});

describe("verifyUnlockPayment — activation attribution guards", () => {
  it("accepts a correct, confirmed unlock payment (happy path)", async () => {
    const { order, txHash } = await setupValid();
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.order.wei).toBe(order.wei);
  });

  it("rejects a replayed tx (one tx unlocks once — no double bonus ⬡)", async () => {
    const { order, txHash } = await setupValid();
    const first = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(first.ok).toBe(true);
    // Re-quote the same citizen, same tx — must be refused before activation runs.
    const re = await createUnlockQuote({ wallet: OWNER, tokenId: order.tokenId, kind: "activate" });
    if ("error" in re) throw new Error(re.error);
    mock.state.tx = { from: OWNER, to: re.toWallet, value: BigInt(re.wei) };
    const second = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(second).toEqual({ ok: false, error: "tx_already_used" });
  });

  it("rejects payment from the wrong sender", async () => {
    const { order, txHash } = await setupValid();
    mock.state.tx = { from: STRANGER, to: order.toWallet, value: BigInt(order.wei) };
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r).toEqual({ ok: false, error: "wrong_sender" });
  });

  it("rejects payment to the wrong recipient", async () => {
    const { order, txHash } = await setupValid();
    mock.state.tx = { from: OWNER, to: STRANGER, value: BigInt(order.wei) };
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r).toEqual({ ok: false, error: "wrong_recipient" });
  });

  it("rejects the wrong amount (underpay by 1 wei)", async () => {
    const { order, txHash } = await setupValid();
    mock.state.tx = { from: OWNER, to: order.toWallet, value: BigInt(order.wei) - 1n };
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r).toEqual({ ok: false, error: "wrong_amount" });
  });

  it("holds an under-confirmed tx for retry", async () => {
    const { order, txHash } = await setupValid();
    mock.state.head = 100n; // head - blockNumber(100) = 0 < MIN_CONFIRMATIONS
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r).toEqual({ ok: false, error: "awaiting_confirmations" });
  });

  it("rejects a reverted tx", async () => {
    const { order, txHash } = await setupValid();
    mock.state.receipt = { status: "reverted", blockNumber: 100n };
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r).toEqual({ ok: false, error: "tx_failed" });
  });

  it("treats an unmined / RPC-missing tx as retryable", async () => {
    const { order, txHash } = await setupValid();
    mock.state.throwTx = true;
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash });
    expect(r).toEqual({ ok: false, error: "tx_not_found_yet" });
  });

  it("rejects a malformed txHash before any chain read", async () => {
    const { order } = await setupValid();
    const r = await verifyUnlockPayment({ wallet: OWNER, tokenId: order.tokenId, txHash: "0xnothex" });
    expect(r).toEqual({ ok: false, error: "bad_txhash" });
  });

  it("rejects when there is no quote for this owner+citizen", async () => {
    const r = await verifyUnlockPayment({ wallet: STRANGER, tokenId: 4039, txHash: freshTx() });
    expect(r).toEqual({ ok: false, error: "no_quote_or_expired" });
  });

  it("anchors the recipient to the configured project wallet", async () => {
    const { order } = await setupValid();
    expect(order.toWallet).toBe(PAYMENT_WALLET);
  });
});

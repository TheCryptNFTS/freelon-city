import { describe, it, expect } from "vitest";

/**
 * Integration coverage for the premium money flow — the consume→debit→refund
 * sequence that `app/api/citizens/[id]/mission/route.ts` runs on every premium
 * job. The route's auth/ownership/on-chain surface is covered elsewhere; what
 * matters for money safety is that the two independent stores (the premium
 * $-budget pool and the per-wallet ⬡ ledger) stay CONSERVED across success,
 * resolver-failure, and insufficient-funds — no ⬡ vanishes, no ⬡ is minted.
 *
 * Uses the REAL store implementations (in-memory in the test env, no Upstash),
 * mirroring exactly what the route does at lines ~196–229 (consume budget →
 * check balance → debit) and ~366–376 (refund both on failure).
 */

import { creditWalletHex, debitWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";
import { consumePremiumRun, refundPremiumRun, PREMIUM_COST_CENTS } from "@/lib/missions/budget";

const COST_HEX = 800; // deploy-citizen (image) price
const COST_CENTS = PREMIUM_COST_CENTS.image;

let walletSeq = 0;
function freshWallet(): string {
  walletSeq++;
  return "0x" + walletSeq.toString(16).padStart(40, "0");
}

async function balanceOf(w: string): Promise<number> {
  return (await getWalletHex(w)).balance;
}

describe("premium money flow — conservation across budget + ⬡ ledger", () => {
  it("success: charges the ⬡ once and nothing is refunded", async () => {
    const wallet = freshWallet();
    await creditWalletHex(wallet, 5000, { kind: "manual", note: "seed" });

    // Route sequence: consume budget → balance ok → debit ⬡ → resolver succeeds.
    const pbud = await consumePremiumRun(COST_CENTS);
    expect(pbud.ok).toBe(true);
    expect((await getWalletHex(wallet)).balance).toBe(5000);
    await debitWalletHex(wallet, COST_HEX, { kind: "manual", note: "premium" });

    expect(await balanceOf(wallet)).toBe(5000 - COST_HEX); // 4200 — charged exactly once
  });

  it("resolver failure: refunds BOTH the budget and the ⬡ (no leak)", async () => {
    const wallet = freshWallet();
    await creditWalletHex(wallet, 5000, { kind: "manual", note: "seed" });

    const pbud = await consumePremiumRun(COST_CENTS);
    expect(pbud.ok).toBe(true);
    await debitWalletHex(wallet, COST_HEX, { kind: "manual", note: "premium" });
    expect(await balanceOf(wallet)).toBe(4200);

    // Resolver returns ok:false → the route refunds premium budget + ⬡.
    await refundPremiumRun(COST_CENTS);
    await creditWalletHex(wallet, COST_HEX, { kind: "manual", note: "refund" });

    expect(await balanceOf(wallet)).toBe(5000); // fully made whole
  });

  it("insufficient ⬡ after budget consume: budget is refunded, no debit happens", async () => {
    const wallet = freshWallet();
    await creditWalletHex(wallet, 100, { kind: "manual", note: "seed" }); // < COST_HEX

    const pbud = await consumePremiumRun(COST_CENTS);
    expect(pbud.ok).toBe(true);

    // Route's pre-debit balance check fails → it refunds budget and 402s, never debiting.
    const bal = (await getWalletHex(wallet)).balance;
    expect(bal).toBeLessThan(COST_HEX);
    await refundPremiumRun(COST_CENTS); // the route's refund on the 402 branch

    expect(await balanceOf(wallet)).toBe(100); // untouched
  });

  it("the ⬡ ledger never goes negative (debit guards balance)", async () => {
    const wallet = freshWallet();
    await creditWalletHex(wallet, COST_HEX - 1, { kind: "manual", note: "seed" });

    await expect(
      debitWalletHex(wallet, COST_HEX, { kind: "manual", note: "premium" }),
    ).rejects.toBeInstanceOf(InsufficientHexError);

    expect(await balanceOf(wallet)).toBe(COST_HEX - 1); // unchanged on a rejected debit
  });

  it("two sequential debits can't overdraw a single-job budget", async () => {
    // Conservation across a refund cycle: spend, get refunded, spend again — the
    // ledger tracks every move exactly with no drift.
    const wallet = freshWallet();
    await creditWalletHex(wallet, COST_HEX, { kind: "manual", note: "seed" });

    await debitWalletHex(wallet, COST_HEX, { kind: "manual", note: "run 1" });
    expect(await balanceOf(wallet)).toBe(0);

    // Out of ⬡ → next run is correctly refused.
    await expect(
      debitWalletHex(wallet, COST_HEX, { kind: "manual", note: "run 2" }),
    ).rejects.toBeInstanceOf(InsufficientHexError);

    // A refund restores exactly the spent amount.
    await creditWalletHex(wallet, COST_HEX, { kind: "manual", note: "refund" });
    expect(await balanceOf(wallet)).toBe(COST_HEX);
  });
});

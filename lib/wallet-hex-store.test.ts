import { describe, it, expect } from "vitest";
import {
  creditWalletHex,
  debitWalletHex,
  getWalletHex,
  InsufficientHexError,
} from "@/lib/wallet-hex-store";

// These tests run against the in-memory Map fallback because no
// UPSTASH_REDIS_REST_URL / TOKEN are set in the test environment.
// Each test uses a unique wallet address to stay isolated from the others.

describe("wallet-hex-store (in-memory fallback)", () => {
  it("starts a never-seen wallet at zero balance and zero lifetime", async () => {
    const w = "0x" + "1".repeat(40);
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(0);
    expect(rec.lifetimeEarned).toBe(0);
    expect(rec.address).toBe(w);
  });

  it("creditWalletHex increases balance and lifetimeEarned, reflected by getWalletHex", async () => {
    const w = "0x" + "2".repeat(40);
    await creditWalletHex(w, 30, { kind: "manual", note: "test credit" });
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(30);
    expect(rec.lifetimeEarned).toBe(30);
  });

  it("accumulates across multiple credits", async () => {
    const w = "0x" + "3".repeat(40);
    await creditWalletHex(w, 10, { kind: "quest" });
    await creditWalletHex(w, 15, { kind: "sweep" });
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(25);
    expect(rec.lifetimeEarned).toBe(25);
  });

  it("lowercases the wallet key — mixed-case credit is readable lowercased", async () => {
    const upper = "0x" + "A".repeat(40);
    await creditWalletHex(upper, 12, { kind: "manual" });
    const rec = await getWalletHex(upper.toLowerCase());
    expect(rec.balance).toBe(12);
    expect(rec.address).toBe(upper.toLowerCase());
  });

  it("debitWalletHex reduces balance without touching lifetimeEarned", async () => {
    const w = "0x" + "4".repeat(40);
    await creditWalletHex(w, 100, { kind: "manual" });
    const rec = await debitWalletHex(w, 40, { kind: "manual", note: "spend" });
    expect(rec.balance).toBe(60);
    expect(rec.lifetimeEarned).toBe(100);
  });

  it("debiting more than the balance throws InsufficientHexError and leaves balance intact", async () => {
    const w = "0x" + "5".repeat(40);
    await creditWalletHex(w, 20, { kind: "manual" });
    await expect(
      debitWalletHex(w, 50, { kind: "manual" }),
    ).rejects.toBeInstanceOf(InsufficientHexError);
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(20);
  });

  it("InsufficientHexError carries the balance and requested amounts", async () => {
    const w = "0x" + "6".repeat(40);
    await creditWalletHex(w, 5, { kind: "manual" });
    try {
      await debitWalletHex(w, 9, { kind: "manual" });
      throw new Error("expected debit to throw");
    } catch (e) {
      expect(e).toBeInstanceOf(InsufficientHexError);
      const err = e as InsufficientHexError;
      expect(err.balance).toBe(5);
      expect(err.requested).toBe(9);
    }
  });
});

import { describe, it, expect } from "vitest";
import { walletFromSession, foldCarrierIntoWallet } from "@/lib/hex-spend";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { getWalletHex } from "@/lib/wallet-hex-store";
import type { CarrierState } from "@/lib/carrier";
import type { XSession } from "@/lib/x-session";

// All tests run against the in-memory fallback (no Upstash env in tests).

function session(bind: string): XSession {
  return { xId: "id", xHandle: "h", bind, exp: Date.now() + 60_000 };
}

function carrier(handle: string, hexPoints: number): CarrierState {
  const h = handle.toLowerCase().replace(/^@/, "");
  return {
    handle: h,
    civilization: "blue-synthesis",
    rank: 20,
    streak: 1,
    lastActiveDay: 0,
    totalRelays: 0,
    hexPoints,
    totalEarned: hexPoints,
    totalSpent: 0,
  };
}

const VALID_ADDR = "0x" + "a".repeat(40);

describe("walletFromSession", () => {
  it("returns the lowercased address for a valid 0x-40hex bind", () => {
    const mixed = "0x" + "AbCd".repeat(10); // 40 hex chars, mixed case
    expect(walletFromSession(session(mixed))).toBe(mixed.toLowerCase());
  });

  it("trims surrounding whitespace before validating", () => {
    expect(walletFromSession(session(`  ${VALID_ADDR}  `))).toBe(VALID_ADDR);
  });

  it("returns null for a handle bind (not an address)", () => {
    expect(walletFromSession(session("vitalik"))).toBeNull();
  });

  it("returns null for an empty bind", () => {
    expect(walletFromSession(session(""))).toBeNull();
  });

  it("returns null for a null / undefined session", () => {
    expect(walletFromSession(null)).toBeNull();
    expect(walletFromSession(undefined)).toBeNull();
  });

  it("returns null for an address of the wrong length", () => {
    expect(walletFromSession(session("0x" + "a".repeat(39)))).toBeNull();
    expect(walletFromSession(session("0x" + "a".repeat(41)))).toBeNull();
  });

  it("returns null for non-hex characters in the address body", () => {
    expect(walletFromSession(session("0x" + "g".repeat(40)))).toBeNull();
  });
});

describe("foldCarrierIntoWallet — anti-mint idempotency", () => {
  it("credits the wallet exactly once, zeroes the carrier, and stamps migratedTo", async () => {
    const handle = "folder_one";
    const wallet = "0x" + "b".repeat(40);
    await putCarrier(carrier(handle, 270));

    await foldCarrierIntoWallet(handle, wallet);

    const w1 = await getWalletHex(wallet);
    expect(w1.balance).toBe(270);
    expect(w1.lifetimeEarned).toBe(270);

    const c1 = await getCarrier(handle);
    expect(c1?.hexPoints).toBe(0);
    expect(c1?.migratedTo).toBe(wallet);
  });

  it("does NOT credit again on a second fold (the anti-mint guard)", async () => {
    const handle = "folder_two";
    const wallet = "0x" + "c".repeat(40);
    await putCarrier(carrier(handle, 150));

    await foldCarrierIntoWallet(handle, wallet);
    const after1 = await getWalletHex(wallet);
    expect(after1.balance).toBe(150);

    // Call again — must be a no-op (memory fold-lock + migratedTo flag).
    await foldCarrierIntoWallet(handle, wallet);
    const after2 = await getWalletHex(wallet);
    expect(after2.balance).toBe(150);
    expect(after2.lifetimeEarned).toBe(150);

    const c = await getCarrier(handle);
    expect(c?.hexPoints).toBe(0);
  });

  it("stamps migratedTo even when the carrier has zero hex, without crediting", async () => {
    const handle = "folder_empty";
    const wallet = "0x" + "d".repeat(40);
    await putCarrier(carrier(handle, 0));

    await foldCarrierIntoWallet(handle, wallet);

    const w = await getWalletHex(wallet);
    expect(w.balance).toBe(0);
    const c = await getCarrier(handle);
    expect(c?.migratedTo).toBe(wallet);
  });

  it("does nothing for an invalid wallet address", async () => {
    const handle = "folder_badwallet";
    await putCarrier(carrier(handle, 99));

    await foldCarrierIntoWallet(handle, "not-an-address");

    const c = await getCarrier(handle);
    expect(c?.hexPoints).toBe(99);
    expect(c?.migratedTo).toBeUndefined();
  });

  it("does nothing for an empty handle", async () => {
    const wallet = "0x" + "e".repeat(40);
    await foldCarrierIntoWallet("", wallet);
    const w = await getWalletHex(wallet);
    expect(w.balance).toBe(0);
  });
});

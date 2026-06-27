import { describe, it, expect } from "vitest";
import {
  applyBuild,
  emptyWorld,
  normalizeOwner,
  getWorld,
  registerVisit,
  buildPlot,
  buildPlotForWallet,
  PLOT_COUNT,
  BUILD_COST,
  STARTER_HEX,
} from "@/lib/world-store";
import { creditWalletHex, getWalletHex } from "@/lib/wallet-hex-store";

// No UPSTASH_* env in the test runner, so the store uses its in-memory Map.
// applyBuild is PURE (no I/O) — the heart of the server-authoritative seam.

describe("normalizeOwner", () => {
  it("lowercases and keeps the safe charset (0-9 a-z _)", () => {
    expect(normalizeOwner("0xAbC123")).toBe("0xabc123");
  });
  it("keeps a wallet address intact and caps at 42", () => {
    const addr = "0x" + "a".repeat(40);
    expect(normalizeOwner(addr)).toBe(addr);
    expect(normalizeOwner(addr + "ffff").length).toBe(42);
  });
  it("strips spaces and punctuation from a handle", () => {
    expect(normalizeOwner("Billy The Founder!")).toBe("billythefounder");
  });
  it("empty input yields empty string (route rejects it)", () => {
    expect(normalizeOwner("")).toBe("");
  });
});

describe("applyBuild — the pure authoritative validator", () => {
  it("accepts a valid plot, SINKS the HEX, and appends sorted", () => {
    const rec = emptyWorld("alice");
    const res = applyBuild(rec, 5);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.hex).toBe(STARTER_HEX - BUILD_COST);
      expect(res.state.owned).toEqual([5]);
      // original is untouched (pure)
      expect(rec.hex).toBe(STARTER_HEX);
      expect(rec.owned).toEqual([]);
    }
  });

  it("keeps owned sorted as plots accrue", () => {
    let rec = emptyWorld("alice");
    for (const idx of [9, 2, 40]) {
      const res = applyBuild(rec, idx);
      expect(res.ok).toBe(true);
      if (res.ok) rec = res.state;
    }
    expect(rec.owned).toEqual([2, 9, 40]);
    expect(rec.hex).toBe(STARTER_HEX - 3 * BUILD_COST);
  });

  it("rejects an out-of-range plot (the API-guard bug class)", () => {
    const rec = emptyWorld("alice");
    for (const bad of [-1, PLOT_COUNT, 99999, 1.5, NaN]) {
      const res = applyBuild(rec, bad);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("bad_plot");
      // never spent HEX on a rejection
      expect(res.state.hex).toBe(STARTER_HEX);
    }
  });

  it("rejects a double-buy of the same plot", () => {
    const first = applyBuild(emptyWorld("alice"), 7);
    expect(first.ok).toBe(true);
    if (first.ok) {
      const second = applyBuild(first.state, 7);
      expect(second.ok).toBe(false);
      if (!second.ok) expect(second.reason).toBe("already_owned");
      // HEX not double-sunk
      expect(second.state.hex).toBe(STARTER_HEX - BUILD_COST);
    }
  });

  it("rejects when HEX is below the build cost", () => {
    const broke = { ...emptyWorld("alice"), hex: BUILD_COST - 1 };
    const res = applyBuild(broke, 3);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("insufficient_hex");
  });

  it("spends down to exactly zero then refuses the next build", () => {
    let rec = { ...emptyWorld("alice"), hex: BUILD_COST }; // exactly one build
    const ok = applyBuild(rec, 0);
    expect(ok.ok).toBe(true);
    if (ok.ok) rec = ok.state;
    expect(rec.hex).toBe(0);
    const next = applyBuild(rec, 1);
    expect(next.ok).toBe(false);
    if (!next.ok) expect(next.reason).toBe("insufficient_hex");
  });
});

describe("async store loop (in-memory fallback)", () => {
  it("registerVisit increments visits and stamps lastSeen", async () => {
    const owner = normalizeOwner("visitor_one");
    const before = Date.now();
    const a = await registerVisit(owner);
    expect(a.visits).toBe(1);
    expect(a.lastSeen).toBeGreaterThanOrEqual(before);
    const b = await registerVisit(owner);
    expect(b.visits).toBe(2);
  });

  it("buildPlot persists the sink and survives a re-read", async () => {
    const owner = normalizeOwner("builder_one");
    const res = await buildPlot(owner, 12);
    expect(res.ok).toBe(true);
    const reread = await getWorld(owner);
    expect(reread.owned).toContain(12);
    expect(reread.hex).toBe(STARTER_HEX - BUILD_COST);
  });

  it("buildPlot rejects an out-of-range plot without spending", async () => {
    const owner = normalizeOwner("builder_two");
    const res = await buildPlot(owner, 99999);
    expect(res.ok).toBe(false);
    const reread = await getWorld(owner);
    expect(reread.hex).toBe(STARTER_HEX);
    expect(reread.owned).toEqual([]);
  });
});

describe("buildPlotForWallet — REAL HEX sink (in-memory wallet ledger)", () => {
  const WALLET = "0x" + "b".repeat(40);

  it("rejects an out-of-range plot before any debit", async () => {
    const res = await buildPlotForWallet(WALLET, 99999);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("bad_plot");
  });

  it("refuses to build when the wallet has no HEX (insufficient, nothing sunk)", async () => {
    const broke = "0x" + "c".repeat(40);
    const res = await buildPlotForWallet(broke, 3);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("insufficient_hex");
    expect((await getWalletHex(broke)).balance).toBe(0);
  });

  it("SINKS exactly BUILD_COST of real HEX and records the parcel", async () => {
    await creditWalletHex(WALLET, 250, { kind: "manual", note: "test fund" });
    const before = (await getWalletHex(WALLET)).balance;
    const res = await buildPlotForWallet(WALLET, 14);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.state.owned).toContain(14);
      expect(res.balance).toBe(before - BUILD_COST); // burned, not refunded
    }
    expect((await getWalletHex(WALLET)).balance).toBe(before - BUILD_COST);
  });

  it("rejects a double-buy without a second debit", async () => {
    const bal = (await getWalletHex(WALLET)).balance;
    const res = await buildPlotForWallet(WALLET, 14); // already owned above
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("already_owned");
    expect((await getWalletHex(WALLET)).balance).toBe(bal); // no extra burn
  });
});

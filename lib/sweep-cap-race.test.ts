import { describe, it, expect, vi } from "vitest";

// Proof for the sweep double-credit race fix (red-team finding B, 2026-06-09).
//
// The concurrency guarantee comes from `withWalletLock` (Upstash SET-NX), which
// is a NO-OP in the plain in-memory dev fallback — so an in-memory test cannot
// demonstrate the fix. Here we mock `@/lib/upstash-client` with an in-process,
// atomic Redis-like store (single-threaded JS makes the check-and-set in SET/NX
// atomic per invocation), which enables the REAL lock path. This lets us fire
// concurrent capped credits and prove the cap is never exceeded.
vi.mock("@/lib/upstash-client", () => {
  const store = new Map<string, { v: string; exp: number }>();
  const live = (key: string) => {
    const e = store.get(key);
    if (e && e.exp && e.exp < Date.now()) {
      store.delete(key);
      return undefined;
    }
    return e;
  };
  return {
    hasUpstash: true,
    upstash: async (cmd: string[]) => {
      const [op, key, val, ...rest] = cmd;
      if (op === "GET") {
        const e = live(key);
        return e ? e.v : null;
      }
      if (op === "SET") {
        const nx = rest.includes("NX");
        const exIdx = rest.indexOf("EX");
        const ttl = exIdx >= 0 ? Number(rest[exIdx + 1]) : 0;
        if (nx && live(key)) return null; // key already held → NX fails
        store.set(key, { v: val, exp: ttl ? Date.now() + ttl * 1000 : 0 });
        return "OK";
      }
      if (op === "DEL") {
        store.delete(key);
        return 1;
      }
      return null;
    },
  };
});

import {
  creditWalletHexCapped,
  getWalletHex,
} from "@/lib/wallet-hex-store";

describe("creditWalletHexCapped — sweep cap is race-safe under the wallet lock", () => {
  it("a single sweep credits exactly once", async () => {
    const w = "0x" + "a1".repeat(20);
    const r = await creditWalletHexCapped(w, 25, { kind: "sweep" }, 10);
    expect(r.credited).toBe(true);
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(25);
    expect(rec.sweepsToday).toBe(1);
  });

  it("a repeated claim after the cap is reached does not credit again", async () => {
    const w = "0x" + "b2".repeat(20);
    await creditWalletHexCapped(w, 25, { kind: "sweep" }, 1); // hits cap=1
    const again = await creditWalletHexCapped(w, 25, { kind: "sweep" }, 1);
    expect(again.credited).toBe(false);
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(25); // unchanged — no double-credit
    expect(rec.sweepsToday).toBe(1);
  });

  it("concurrent claims cannot exceed the daily cap (the race)", async () => {
    const w = "0x" + "c3".repeat(20);
    const cap = 2;
    const amount = 25;
    // Fire 4 concurrent capped credits at a fresh wallet. Before the fix, the
    // read-modify-write cap check lived OUTSIDE the lock, so all 4 could read
    // sweepsToday=0 and all credit. With the fix they serialize through the
    // lock and exactly `cap` succeed.
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        creditWalletHexCapped(w, amount, { kind: "sweep", note: "race" }, cap),
      ),
    );
    const credited = results.filter((r) => r.credited).length;
    expect(credited).toBe(cap); // exactly 2 of 4, not 4
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(cap * amount); // 50, no double-credit
    expect(rec.sweepsToday).toBe(cap); // counter exact, no clobber
    const sweepEvents = rec.events.filter((e) => e.kind === "sweep").length;
    expect(sweepEvents).toBe(cap); // event log correct
  });
});

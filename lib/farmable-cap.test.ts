import { describe, it, expect, vi } from "vitest";

// Proof for the two-bucket farmable daily ceiling (Build Sequence Prompt 3,
// 2026-06-09). The cap is enforced inside `creditWalletHex`'s wallet lock when
// called with { farmable: true }. Value-backed events (no flag) are never capped.
// As with the sweep-race test, we mock Upstash with an atomic in-process store so
// the REAL withWalletLock path runs (in-memory dev fallback has no lock).
vi.mock("@/lib/upstash-client", () => {
  const store = new Map<string, { v: string; exp: number }>();
  const live = (k: string) => {
    const e = store.get(k);
    if (e && e.exp && e.exp < Date.now()) { store.delete(k); return undefined; }
    return e;
  };
  return {
    hasUpstash: true,
    upstash: async (cmd: string[]) => {
      const [op, key, val, ...rest] = cmd;
      if (op === "GET") { const e = live(key); return e ? e.v : null; }
      if (op === "SET") {
        const nx = rest.includes("NX");
        const exIdx = rest.indexOf("EX");
        const ttl = exIdx >= 0 ? Number(rest[exIdx + 1]) : 0;
        if (nx && live(key)) return null;
        store.set(key, { v: val, exp: ttl ? Date.now() + ttl * 1000 : 0 });
        return "OK";
      }
      if (op === "DEL") { store.delete(key); return 1; }
      return null;
    },
  };
});

import { creditWalletHex, getWalletHex } from "@/lib/wallet-hex-store";
import { ECONOMY } from "@/lib/economy-constants";

const CAP = ECONOMY.FARMABLE_DAILY_CAP; // 250

describe("farmable daily ceiling (two-bucket)", () => {
  it("1. farmable credits cap at FARMABLE_DAILY_CAP per day", async () => {
    const w = "0x" + "f1".repeat(20);
    // 12 × 25 = 300 attempted, but cap is 250
    for (let i = 0; i < 12; i++) {
      await creditWalletHex(w, 25, { kind: "sweep", note: "farm" }, { farmable: true });
    }
    const rec = await getWalletHex(w);
    expect(rec.farmedToday).toBe(CAP);
    expect(rec.balance).toBe(CAP); // never exceeds 250
  });

  it("2. a value-backed event (no flag) credits in full even after the farmable cap is reached", async () => {
    const w = "0x" + "f2".repeat(20);
    // Saturate the farmable cap first.
    await creditWalletHex(w, CAP, { kind: "quest" }, { farmable: true });
    expect((await getWalletHex(w)).balance).toBe(CAP);
    // Now a 500⬡ snipe-style credit with NO farmable flag — must go through.
    await creditWalletHex(w, 500, { kind: "manual", note: "snipe bounty" });
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(CAP + 500); // 750 — snipe uncapped
    expect(rec.farmedToday).toBe(CAP);   // farmable counter untouched by the snipe
  });

  it("3. farmable credits after the cap is reached add nothing (no-credit)", async () => {
    const w = "0x" + "f3".repeat(20);
    await creditWalletHex(w, CAP, { kind: "sweep" }, { farmable: true });
    const before = (await getWalletHex(w)).balance;
    await creditWalletHex(w, 25, { kind: "sweep" }, { farmable: true });
    const after = (await getWalletHex(w)).balance;
    expect(after).toBe(before); // no further credit
    expect(after).toBe(CAP);
  });

  it("4. a partial credit at the boundary clamps to remaining headroom (never overshoots)", async () => {
    const w = "0x" + "f4".repeat(20);
    await creditWalletHex(w, CAP - 10, { kind: "quest" }, { farmable: true }); // 240
    await creditWalletHex(w, 25, { kind: "sweep" }, { farmable: true });        // only 10 fits
    const rec = await getWalletHex(w);
    expect(rec.balance).toBe(CAP); // 250 exactly, not 265
    expect(rec.farmedToday).toBe(CAP);
  });

  it("5. the daily cap resets on the next UTC day", async () => {
    const w = "0x" + "f5".repeat(20);
    await creditWalletHex(w, CAP, { kind: "sweep" }, { farmable: true });
    // Simulate a previous-day stamp, then a fresh farmable credit.
    const r = await getWalletHex(w);
    r.farmedDay = "2000-01-01"; // force rollover
    const { setWalletHex } = await import("@/lib/wallet-hex-store");
    await setWalletHex(r);
    await creditWalletHex(w, 25, { kind: "sweep" }, { farmable: true });
    const rec = await getWalletHex(w);
    expect(rec.farmedToday).toBe(25); // counter reset, new day's credit lands
    expect(rec.balance).toBe(CAP + 25);
  });

  it("6. the event log records the actually-credited amount (capped credits logged at clamped value)", async () => {
    const w = "0x" + "f6".repeat(20);
    await creditWalletHex(w, CAP - 10, { kind: "quest" }, { farmable: true });
    await creditWalletHex(w, 25, { kind: "sweep", note: "boundary" }, { farmable: true });
    const rec = await getWalletHex(w);
    const last = rec.events[0];
    expect(last.amount).toBe(10); // logged the clamped 10, not the requested 25
    expect(last.kind).toBe("sweep");
  });
});

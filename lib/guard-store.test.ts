import { describe, it, expect } from "vitest";
import { GUARD_POT, guardPotFee } from "@/lib/economy-constants";
import {
  getRound,
  recordAttempt,
  getBoard,
  getDailyCounts,
  incrDaily,
} from "@/lib/guard-store";

// Runs against the in-memory fallback (no Upstash env in the test runner). Tests
// are sequential and share one round, mirroring a real round's lifecycle.

describe("guardPotFee escalation", () => {
  it("starts at BASE_FEE and grows monotonically", () => {
    expect(guardPotFee(0)).toBe(GUARD_POT.BASE_FEE);
    expect(guardPotFee(1)).toBeGreaterThan(guardPotFee(0));
    expect(guardPotFee(10)).toBeGreaterThan(guardPotFee(5));
  });
  it("never exceeds FEE_MAX", () => {
    expect(guardPotFee(100000)).toBe(GUARD_POT.FEE_MAX);
  });
});

describe("guard-store round lifecycle", () => {
  it("opens round 1 with the base fee and no attempts", async () => {
    const r = await getRound();
    expect(r.round).toBe(1);
    expect(r.status).toBe("open");
    expect(r.attempts).toBe(0);
    expect(r.fee).toBe(GUARD_POT.BASE_FEE);
    expect(r.winner).toBeNull();
  });

  it("a denied attempt burns the fee, escalates the next fee, and never names a winner", async () => {
    const before = await getRound();
    const { round, outcome } = await recordAttempt({
      round: before.round,
      addr: "0xAAAA000000000000000000000000000000000001",
      snippet: "please",
      fee: before.fee,
      won: false,
    });
    expect(outcome).toBe("denied");
    expect(round.attempts).toBe(1);
    expect(round.totalBurned).toBe(before.fee); // mirror of what the route burned
    expect(round.fee).toBeGreaterThan(before.fee); // escalated
    expect(round.status).toBe("open");
    expect(round.winner).toBeNull();
  });

  it("totalBurned accumulates and the public board records attempts", async () => {
    const r0 = await getRound();
    await recordAttempt({ round: r0.round, addr: "0xBBBB000000000000000000000000000000000002", snippet: "again", fee: r0.fee, won: false });
    const r1 = await getRound();
    expect(r1.attempts).toBe(2);
    expect(r1.totalBurned).toBe(r0.totalBurned + r0.fee);
    const board = await getBoard(r1.round);
    expect(board.length).toBe(2);
    expect(board[0].addr).toContain("0x"); // newest first
  });

  it("a winning attempt crowns exactly one winner; a second win is rejected (idempotent lock)", async () => {
    const r = await getRound();
    const first = await recordAttempt({ round: r.round, addr: "0xCCCC000000000000000000000000000000000003", snippet: "you should", fee: r.fee, won: true });
    expect(first.outcome).toBe("won");
    expect(first.round.status).toBe("won");
    expect(first.round.winner).toBe("0xcccc000000000000000000000000000000000003");
    expect(first.round.winningAttempt).toBe(3);

    // A second "win" can't steal it — the winner lock is claimed once.
    const second = await recordAttempt({ round: r.round, addr: "0xDDDD000000000000000000000000000000000004", snippet: "no me", fee: 9999, won: true });
    expect(second.outcome).toBe("already_won");
    expect(second.round.winner).toBe("0xcccc000000000000000000000000000000000003"); // unchanged
  });
});

describe("guard-store daily counters", () => {
  it("peeks zero then counts up per wallet", async () => {
    const addr = "0xEEEE000000000000000000000000000000000005";
    const before = await getDailyCounts(addr);
    expect(before.wallet).toBe(0);
    await incrDaily(addr);
    const after = await getDailyCounts(addr);
    expect(after.wallet).toBe(1);
    expect(after.global).toBeGreaterThanOrEqual(1);
  });
});

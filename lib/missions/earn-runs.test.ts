import { describe, it, expect } from "vitest";
import { awardHex, EARN_HEX } from "@/lib/missions/earn-runs";
import { getWalletHex } from "@/lib/wallet-hex-store";

describe("earn HEX (streak / referral)", () => {
  it("awarding credits the wallet's HEX balance", async () => {
    const W = "0xearn0000000000000000000000000000000a0001";
    const before = (await getWalletHex(W)).balance;
    const r = await awardHex(W, "referral");
    expect(r.hex).toBe(EARN_HEX.referral);
    expect(r.balance).toBe(before + EARN_HEX.referral);
  });

  it("multiple earns stack; a streak30 is worth more than a streak7", async () => {
    const W = "0xearn0000000000000000000000000000000a0002";
    await awardHex(W, "streak7");
    const after = await awardHex(W, "streak30");
    expect(after.balance).toBe(EARN_HEX.streak7 + EARN_HEX.streak30);
    expect(EARN_HEX.streak30).toBeGreaterThan(EARN_HEX.streak7);
  });

  it("a single earn can't fund a flagship premium run, and unlock dwarfs earning", async () => {
    // The guard: free/earned HEX is SLOW relative to the flagship premium abilities
    // (the real compute), so the ETH unlock bonus stays the main fuel. The cheap
    // viral ability (feud) being streak-affordable is fine.
    const { PREMIUM_HEX, UNLOCK_BONUS_HEX_PER_RUN } = await import("@/lib/economy-constants");
    const flagship = Math.min(PREMIUM_HEX.strategy, PREMIUM_HEX.dossier);
    expect(EARN_HEX.streak7).toBeLessThan(flagship); // a week of logins < one flagship run
    // One common unlock (40 runs × bonus) must vastly exceed the biggest single earn.
    expect(40 * UNLOCK_BONUS_HEX_PER_RUN).toBeGreaterThan(EARN_HEX.streak30 * 3);
  });
});

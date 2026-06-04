import { describe, it, expect } from "vitest";
import { unlockTierFor, requiresUnlock, isImageMission, UNLOCK_TIERS } from "@/lib/missions/unlock";
import { activate, recharge, spendCredit, refundCredit, unlockStatus, isUnlocked } from "@/lib/missions/unlock-store";

describe("unlock pricing — rarity ladder", () => {
  it("prices rise by rarity, insane at the top", () => {
    expect(UNLOCK_TIERS.Common.priceEth).toBe(0.005);
    expect(UNLOCK_TIERS["One of One"].priceEth).toBe(1.0);
    expect(UNLOCK_TIERS.Legendary.priceEth).toBeGreaterThan(UNLOCK_TIERS.Rare.priceEth);
  });
  it("runs are 404-themed and scale with rarity", () => {
    expect(unlockTierFor("Epic").runs).toBe(404);
    expect(unlockTierFor("One of One").runs).toBe(4040);
    expect(unlockTierFor("Common").runs).toBe(40);
  });
  it("recharge is cheaper than activation (40% by default)", () => {
    const t = unlockTierFor("Common");
    expect(t.rechargeEth).toBeLessThan(t.priceEth);
    expect(t.rechargeEth).toBeCloseTo(0.002, 5); // 0.005 * 0.4
  });

  it("bulk recharge packs give more runs at a discount", async () => {
    const { rechargePackFor } = await import("@/lib/missions/unlock");
    const single = rechargePackFor("Common", "x1");
    const five = rechargePackFor("Common", "x5");
    expect(five.runs).toBe(single.runs * 5);           // 5× the runs
    expect(five.priceEth).toBeCloseTo(single.priceEth * 4, 5); // but only 4× the price (20% off)
    expect(five.priceEth).toBeLessThan(single.priceEth * 5);   // strictly a discount
  });
  it("unknown tier defaults to Common", () => {
    expect(unlockTierFor("Mythic???").tier).toBe("Common");
  });
  it("only premium/image abilities require unlock", () => {
    expect(requiresUnlock("strategy")).toBe(true);
    expect(requiresUnlock("risk")).toBe(true);
    expect(requiresUnlock("dossier")).toBe(true);
    expect(requiresUnlock("deploy-citizen")).toBe(true);
    expect(requiresUnlock("content")).toBe(false); // free funnel
    expect(isImageMission("deploy-citizen")).toBe(true);
    expect(isImageMission("strategy")).toBe(false);
  });
});

describe("premium runs — CANNOT outspend the unlock (the core guarantee)", () => {
  it("a citizen can spend exactly its granted runs, then no more", async () => {
    const TOKEN = 8500; // tier defaults to Common (40 runs)
    expect(await isUnlocked(TOKEN)).toBe(false);
    await activate({ tokenId: TOKEN, txHash: "0xabc", priceEthPaid: 0.005 });

    const cap = (await unlockStatus(TOKEN)).credits;
    expect(cap).toBe(40);

    for (let i = 0; i < cap; i++) {
      const v = await spendCredit(TOKEN);
      expect(v.ok).toBe(true);
    }
    const over = await spendCredit(TOKEN);
    expect(over.ok).toBe(false);
    expect(over.ok ? null : over.reason).toBe("no_credits");
  });

  it("a failed run refunds the run", async () => {
    const TOKEN = 8501;
    await activate({ tokenId: TOKEN, txHash: "0xdef", priceEthPaid: 0.005 });
    const before = (await unlockStatus(TOKEN)).credits;
    await spendCredit(TOKEN);
    await refundCredit(TOKEN);
    expect((await unlockStatus(TOKEN)).credits).toBe(before);
  });

  it("activation is PERMANENT; recharge refills runs without re-activating", async () => {
    const TOKEN = 8502;
    await activate({ tokenId: TOKEN, txHash: "0x1", priceEthPaid: 0.005 });
    expect(await isUnlocked(TOKEN)).toBe(true);
    await spendCredit(TOKEN);
    await spendCredit(TOKEN);
    const mid = (await unlockStatus(TOKEN)).credits; // 38
    // Recharge tops up runs; still activated.
    const r = await recharge({ tokenId: TOKEN, txHash: "0x2", priceEthPaid: 0.002 });
    expect(r).not.toBeNull();
    expect(await isUnlocked(TOKEN)).toBe(true);
    expect((await unlockStatus(TOKEN)).credits).toBe(mid + 40);
  });

  it("recharge on a never-activated citizen is refused", async () => {
    const r = await recharge({ tokenId: 8504, txHash: "0x9", priceEthPaid: 0.002 });
    expect(r).toBeNull();
  });

  it("spending on a never-activated citizen fails (locked)", async () => {
    const v = await spendCredit(8503);
    expect(v.ok).toBe(false);
    expect(v.ok ? null : v.reason).toBe("locked");
  });
});

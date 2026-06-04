import { describe, it, expect } from "vitest";
import { priceUsdFor, PAYMENT_WALLET, MISSION_DISCLAIMER } from "@/lib/missions/pricing";

describe("reshaped pricing (moat-only paid)", () => {
  it("paid = moat missions only", () => {
    expect(priceUsdFor("deploy-citizen")).toBe(5);
    expect(priceUsdFor("feud")).toBe(6);
    expect(priceUsdFor("strategy")).toBe(12); // Fix My Launch
    expect(priceUsdFor("risk")).toBe(12);
    expect(priceUsdFor("dossier")).toBe(19);
  });
  it("commodity text is FREE (no moat → not paid)", () => {
    expect(priceUsdFor("content")).toBe(0);
    expect(priceUsdFor("sales")).toBe(0);
    expect(priceUsdFor("design")).toBe(0);
    expect(priceUsdFor("research")).toBe(0);
  });
  it("payment wallet + disclaimer present", () => {
    expect(PAYMENT_WALLET).toBe("0x3303c4350259c2b8f3c560b2ec70ad3ed87a5e72");
    expect(MISSION_DISCLAIMER).toMatch(/non-refundable/i);
    expect(MISSION_DISCLAIMER).toMatch(/not financial/i);
  });
});

import { describe, it, expect } from "vitest";
import { ECONOMY, ethToHex } from "@/lib/economy-constants";

describe("economy-constants", () => {
  it("exposes the key earning/spend constants as positive numbers", () => {
    const keys = ["DAILY_CLAIM", "NAMING_COST", "REALIGN_COST", "MISSION_REWARD"] as const;
    for (const k of keys) {
      expect(typeof ECONOMY[k]).toBe("number");
      expect(ECONOMY[k]).toBeGreaterThan(0);
    }
  });

  it("has a positive HEX_PER_ETH peg", () => {
    expect(ECONOMY.HEX_PER_ETH).toBeGreaterThan(0);
  });

  it("ethToHex converts using the peg and rounds", () => {
    expect(ethToHex(1)).toBe(ECONOMY.HEX_PER_ETH);
    expect(ethToHex(0.5)).toBe(Math.round(0.5 * ECONOMY.HEX_PER_ETH));
  });

  it("ethToHex returns 0 for non-positive or non-finite input", () => {
    expect(ethToHex(0)).toBe(0);
    expect(ethToHex(-1)).toBe(0);
    expect(ethToHex(Number.NaN)).toBe(0);
    expect(ethToHex(Infinity)).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { hasCopyBleed } from "@/lib/missions/copy-clean";

describe("copy-clean — lore/hype bleed detector", () => {
  it("flags FREELON lore + hype + financial words", () => {
    expect(hasCopyBleed("Sync with the pulse and unleash the signal")).toBe(true);
    expect(hasCopyBleed("Witness the sacred frontier")).toBe(true);
    expect(hasCopyBleed("Stake for value and ROI")).toBe(true);
    expect(hasCopyBleed("the power of Synthesis")).toBe(true);
  });
  it("passes clean human copy", () => {
    expect(hasCopyBleed("Holders, your FREELONS are ready. Start their journey today.")).toBe(false);
    expect(hasCopyBleed("Activate your agent for premium runs. One-time payment.")).toBe(false);
  });
  it("is word-boundary safe (no false hit on substrings)", () => {
    // "designal" shouldn't match "signal"; "alphabet" shouldn't match "alpha"
    expect(hasCopyBleed("a designal alphabet")).toBe(false);
  });
});

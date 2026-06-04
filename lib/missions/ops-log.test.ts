import { describe, it, expect } from "vitest";
import { recordRunCost, recordImage, recordError, opsSnapshot } from "@/lib/missions/ops-log";

describe("ops-log — cost + error observability", () => {
  it("accumulates run cost and surfaces it in the snapshot", async () => {
    const before = await opsSnapshot();
    await recordRunCost({ tier: "premium", promptTokens: 1000, completionTokens: 500 });
    const after = await opsSnapshot();
    expect(after.runs).toBe(before.runs + 1);
    // premium: 1000*5µ + 500*30µ = 20000µ$ = $0.02 — cost must have risen.
    expect(after.estCostUsd).toBeGreaterThan(before.estCostUsd);
  });

  it("tracks images separately and adds their cost", async () => {
    const before = await opsSnapshot();
    await recordImage();
    const after = await opsSnapshot();
    expect(after.images).toBe(before.images + 1);
    expect(after.estCostUsd).toBeGreaterThan(before.estCostUsd);
  });

  it("records errors newest-first with masked wallet", async () => {
    await recordError("resolve:strategy", new Error("boom"), { tokenId: 7, wallet: "0xabcdef0000000000000000000000000000001234" });
    const snap = await opsSnapshot();
    const e = snap.recentErrors[0];
    expect(e.where).toBe("resolve:strategy");
    expect(e.error).toContain("boom");
    expect(e.tokenId).toBe(7);
    expect(e.wallet).toBe("0xabcd…1234"); // masked, not full address
  });
});

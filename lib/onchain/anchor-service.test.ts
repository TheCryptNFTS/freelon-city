import { describe, it, expect } from "vitest";
import { seedProgress, applyMission } from "@/lib/progression-store";
import { computeAnchor, saveSnapshot, verifyCitizen } from "@/lib/onchain/anchor-service";
import { verifyProof } from "@/lib/onchain/merkle";
import { leafFor } from "@/lib/onchain/history-anchor";
import { getProgress } from "@/lib/progression-store";

describe("anchor service (in-memory)", () => {
  it("computes a root, and an anchored citizen verifies; live edits show as not-current", async () => {
    // Seed a couple of citizens with history (unique ids for this test).
    await seedProgress({ tokenId: 8001, skill: "strategy", points: 20, focus: "launches" });
    await seedProgress({ tokenId: 8002, skill: "risk", points: 12, focus: "risk" });

    // 1. Compute + "anchor" (save snapshot as epoch 0).
    const { root, count, leaves } = await computeAnchor();
    expect(count).toBeGreaterThanOrEqual(2);
    expect(root).toMatch(/^0x[0-9a-f]{64}$/i);
    await saveSnapshot({ epoch: 0, root, count, timestamp: Date.now(), leaves });

    // 2. The anchored citizen verifies against the on-chain-style root.
    const v = await verifyCitizen(8001);
    expect(v.anchored).toBe(true);
    if (v.anchored) {
      const leaf = leafFor(await getProgress(8001));
      expect(verifyProof(leaf, v.proof, v.root)).toBe(true);
      expect(v.current).toBe(true); // unchanged since anchor
    }

    // 3. The agent does NEW work → its live history diverges from the anchor.
    await applyMission({ tokenId: 8001, missionTitle: "Fix My Launch", outputTitle: "Done",
      skill: "strategy", rewardXp: 10, costBurned: 0, civSlug: "blue-synthesis" });
    const v2 = await verifyCitizen(8001);
    expect(v2.anchored).toBe(true);
    if (v2.anchored) expect(v2.current).toBe(false); // needs a re-anchor to re-include the new work
  });

  it("a citizen not in the snapshot reads as not-anchored", async () => {
    await seedProgress({ tokenId: 8003, skill: "content", points: 10, focus: "x" });
    const { root, count, leaves } = await computeAnchor();
    await saveSnapshot({ epoch: 0, root, count, timestamp: Date.now(), leaves });
    const v = await verifyCitizen(999999); // never had history
    expect(v.anchored).toBe(false);
  });
});

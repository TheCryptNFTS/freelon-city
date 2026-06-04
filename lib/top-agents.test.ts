import { describe, it, expect } from "vitest";
import { applyMission } from "@/lib/progression-store";
import { topTrainedAgents } from "@/lib/top-agents";

describe("top trained agents showcase", () => {
  it("includes specialized citizens and excludes cosmetic-only (drifter) ones", async () => {
    const PRO = 9001; // professional work → specializes (analyst)
    const COSMETIC = 9002; // cosmetic-only → leveled by XP but stays drifter

    // Both cross level 1 (≥100 XP). PRO grants skill; COSMETIC does not.
    for (let i = 0; i < 3; i++) {
      await applyMission({ tokenId: PRO, missionTitle: "Consult", outputTitle: "Answer",
        skill: "research", rewardXp: 60, costBurned: 0, civSlug: "blue-synthesis" });
      await applyMission({ tokenId: COSMETIC, missionTitle: "Deploy Citizen", outputTitle: "neon-city",
        skill: "design", rewardXp: 60, costBurned: 0, civSlug: "blue-synthesis", countsTowardClass: false });
    }

    const agents = await topTrainedAgents(50);
    const pro = agents.find((a) => a.tokenId === PRO);
    expect(pro).toBeTruthy();
    expect(pro!.cls).toBe("analyst");
    expect(pro!.level).toBeGreaterThan(1);
    // Cosmetic-only citizen never specialized → never headlines the showcase.
    expect(agents.find((a) => a.tokenId === COSMETIC)).toBeUndefined();
  });
});

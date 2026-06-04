import { describe, it, expect } from "vitest";
import { seedProgress, getProgress, applyMission } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";

describe("seedProgress — founder display models", () => {
  it("sets a real class, rank and tuned-for in one write, and flags it demo", async () => {
    await seedProgress({ tokenId: 4242, skill: "risk", points: 30, focus: "mint-risks" });
    const p = await getProgress(4242);
    const spec = deriveSpec(p);
    expect(spec.cls).toBe("red-team");
    expect(spec.rank.label).toBe("Specialist"); // 30 pts → Specialist tier (flavor only at 150+)
    expect(spec.tuning.tunedFor).toBe("mint-risks");
    expect(spec.resume.trackRecord).toBe("30 red-team reports");
    expect(p.demo).toBe(true); // honesty flag — surfaced as "DEMO" in the UI
  });

  it("re-running never downgrades (Math.max)", async () => {
    await seedProgress({ tokenId: 4243, skill: "content", points: 40, focus: "threads" });
    await seedProgress({ tokenId: 4243, skill: "content", points: 5, focus: "threads" });
    const p = await getProgress(4243);
    expect(p.skills.content).toBe(40); // not knocked down to 5
  });

  it("the first REAL mission clears the demo flag (history is now genuine)", async () => {
    await seedProgress({ tokenId: 4244, skill: "strategy", points: 20, focus: "launches" });
    expect((await getProgress(4244)).demo).toBe(true);
    await applyMission({ tokenId: 4244, missionTitle: "Fix My Launch", outputTitle: "Done",
      skill: "strategy", rewardXp: 10, costBurned: 0, civSlug: "blue-synthesis" });
    expect((await getProgress(4244)).demo).toBeUndefined();
  });
});

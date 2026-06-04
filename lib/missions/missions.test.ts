import { describe, it, expect } from "vitest";
import { getMission, listMissions, isUnlocked } from "@/lib/missions";
import { applyMission, empty, type CitizenProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { ECONOMY } from "@/lib/economy-constants";

function progAt(level: number): CitizenProgress {
  const p = empty(7777);
  p.level = level;
  return p;
}

describe("mission registry", () => {
  it("registers the six money abilities + the image mission (allowlist)", () => {
    expect(listMissions().length).toBeGreaterThanOrEqual(7);
    expect(getMission("strategy")).toBeTruthy(); // the flagship (Fix My Launch)
    expect(getMission("content")).toBeTruthy();
    expect(getMission("deploy-citizen")).toBeTruthy();
    expect(getMission("not-a-mission")).toBeNull();
  });

  it("abilities are free/internal for now (cost 0)", () => {
    expect(getMission("strategy")!.cost).toBe(0);
    expect(getMission("content")!.cost).toBe(0);
  });
});

describe("progression gating", () => {
  it("abilities unlock at level 1 in the free build", () => {
    expect(isUnlocked(getMission("strategy")!, progAt(1))).toBe(true);
    expect(isUnlocked(getMission("content")!, progAt(1))).toBe(true);
  });
});

describe("ability resolver guards", () => {
  // Abilities call the LLM (network). The task/brief guards run BEFORE any
  // network call. Live reasoning is proven by scripts/test-agent.mjs.
  it("strategy rejects an empty brief before calling the model", async () => {
    const m = getMission("strategy")!;
    const citizen = { id: 1337, civilization: "blue-synthesis", transmission_name: "TEST", sub_archetype: "x", hex_state: "x", signal_type: "x", caste: "x", glow_level: "x", shape: "x", tier: "Common" } as never;
    // valid task key, no brief → guarded before the model
    const noBrief = await m.resolve({ citizen, progress: progAt(1), input: "fix-launch:", walletAddress: "0x", paid: false });
    expect(noBrief.ok).toBe(false);
    // unknown task → guarded
    const badTask = await m.resolve({ citizen, progress: progAt(1), input: "nope: do a thing", walletAddress: "0x", paid: false });
    expect(badTask.ok).toBe(false);
  });
});

describe("applyMission — sink side", () => {
  it("records a BURN (negative signalChange) and grants XP + skill", async () => {
    const tokenId = 7801;
    const res = await applyMission({
      tokenId,
      missionTitle: "Consult the Citizen",
      outputTitle: "Consult · TEST",
      skill: "research",
      rewardXp: ECONOMY.MISSION_XP_T3,
      costBurned: ECONOMY.MISSION_COST_T3,
      civSlug: "blue-synthesis", // 1.1x
    });
    expect(res.xpGained).toBe(Math.round(ECONOMY.MISSION_XP_T3 * 1.1));
    // most recent memory entry is the burn (or a levelup above it)
    const mem = res.progress.memoryLog.find((e) => e.type === "mission")!;
    expect(mem.signalChange).toBe(-ECONOMY.MISSION_COST_T3); // BURN
    expect(res.progress.skills.research).toBe(1);
  });

  it("memory feedback: a repeated focus accrues into the citizen's tunedFor", async () => {
    const tokenId = 7802;
    let res;
    for (let i = 0; i < 3; i++) {
      res = await applyMission({
        tokenId,
        missionTitle: "Consult the Citizen",
        outputTitle: "Answer",
        skill: "research",
        rewardXp: 10,
        costBurned: 5,
        civSlug: "blue-synthesis",
        focusHint: "azuki",
      });
    }
    // the [focus:azuki] tag is written into memory...
    const tagged = res!.progress.memoryLog.filter((e) => e.description.includes("[focus:azuki]"));
    expect(tagged.length).toBe(3);
    // ...and deriveSpec surfaces it as the citizen's tuning (history shapes identity)
    const spec = deriveSpec(res!.progress);
    expect(spec.tuning.tunedFor).toBe("azuki");
  });
});

describe("résumé rule — only professional work shapes 'tuned for'", () => {
  it("repeated PROFESSIONAL focus accrues into tunedFor", async () => {
    const tokenId = 7811;
    let res;
    for (let i = 0; i < 3; i++) {
      res = await applyMission({ tokenId, missionTitle: "Fix My Launch", outputTitle: "Done",
        skill: "strategy", rewardXp: 10, costBurned: 0, civSlug: "blue-synthesis", focusHint: "azuki" });
    }
    expect(deriveSpec(res!.progress).tuning.tunedFor).toBe("azuki");
  });
  it("COSMETIC missions pass no focusHint → never pollute tunedFor", async () => {
    const tokenId = 7812;
    let res;
    // simulate the route's gate: cosmetic → focusHint omitted
    for (let i = 0; i < 5; i++) {
      res = await applyMission({ tokenId, missionTitle: "Deploy Citizen", outputTitle: "neon-city",
        skill: "design", rewardXp: 10, costBurned: 0, civSlug: "blue-synthesis" /* no focusHint */ });
    }
    expect(deriveSpec(res!.progress).tuning.tunedFor).toBeNull(); // NOT "tuned for neon-city"
  });

  it("COSMETIC missions grant XP but NOT class/skill (countsTowardClass:false)", async () => {
    const tokenId = 7813;
    let res;
    // The route passes countsTowardClass:false for cosmetic/social missions.
    for (let i = 0; i < 5; i++) {
      res = await applyMission({ tokenId, missionTitle: "Deploy Citizen", outputTitle: "neon-city",
        skill: "design", rewardXp: 10, costBurned: 0, civSlug: "blue-synthesis", countsTowardClass: false });
    }
    expect(res!.progress.xp).toBeGreaterThan(0); // XP still flows (engagement)
    expect(res!.progress.skills.design).toBe(0); // but the design skill never moved
    const spec = deriveSpec(res!.progress);
    expect(spec.cls).toBe("drifter"); // 5 art-toy runs → still UNTRAINED, not a "Designer"
    expect(spec.resume.trackRecord).toBeNull();
  });
});

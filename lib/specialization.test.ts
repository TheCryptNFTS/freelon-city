import { describe, it, expect } from "vitest";
import { deriveSpec, deriveTuning, isPrestige, CLASS_BY_SKILL } from "@/lib/specialization";
import { empty, type CitizenProgress, type MemoryEntry } from "@/lib/progression-store";

function withSkills(s: Partial<CitizenProgress["skills"]>, level = 1): CitizenProgress {
  const p = empty(5000);
  p.level = level;
  p.skills = { ...p.skills, ...s };
  return p;
}

describe("class derivation", () => {
  it("untrained citizen is a trainee/drifter", () => {
    const spec = deriveSpec(empty(1));
    expect(spec.cls).toBe("drifter");
    expect(spec.dominantSkill).toBeNull();
    expect(spec.title(1)).toBe("Level 1 · Untrained");
  });

  it("dominant skill picks the class", () => {
    expect(deriveSpec(withSkills({ content: 5 })).cls).toBe("content-agent");
    expect(deriveSpec(withSkills({ strategy: 5 })).cls).toBe("strategist");
    expect(deriveSpec(withSkills({ risk: 5 })).cls).toBe("red-team");
    // sanity: the map is the source of truth
    expect(CLASS_BY_SKILL.sales).toBe("closer");
  });

  it("ranks by dominant-skill depth and flavors the top label", () => {
    expect(deriveSpec(withSkills({ content: 5 })).rank.label).toBe("Initiate");
    expect(deriveSpec(withSkills({ content: 15 })).rank.label).toBe("Adept");
    expect(deriveSpec(withSkills({ content: 40 })).rank.label).toBe("Specialist");
    expect(deriveSpec(withSkills({ content: 80 })).rank.label).toBe("Master");
    // 150+ content → class-flavored top label
    expect(deriveSpec(withSkills({ content: 160 })).rank.label).toBe("Virtuoso");
    // research/analyst keeps the generic top label "Oracle"
    expect(deriveSpec(withSkills({ research: 160 })).rank.label).toBe("Oracle");
  });

  it("adds PRESTIGE tiers above the per-class top rank", () => {
    // 150 still resolves to the (flavored or generic) Oracle tier — unchanged.
    expect(deriveSpec(withSkills({ content: 150 })).rank.label).toBe("Virtuoso");
    expect(deriveSpec(withSkills({ research: 150 })).rank.label).toBe("Oracle");
    // 300 → Legend, 600 → Mythic — universal, never class-flavored.
    expect(deriveSpec(withSkills({ content: 300 })).rank.label).toBe("Legend");
    expect(deriveSpec(withSkills({ research: 300 })).rank.label).toBe("Legend");
    expect(deriveSpec(withSkills({ content: 600 })).rank.label).toBe("Mythic");
    expect(deriveSpec(withSkills({ research: 700 })).rank.label).toBe("Mythic");
  });

  it("isPrestige is true only for Legend & Mythic", () => {
    expect(isPrestige(deriveSpec(withSkills({ content: 80 })).rank)).toBe(false); // Master
    expect(isPrestige(deriveSpec(withSkills({ content: 160 })).rank)).toBe(false); // Virtuoso (Oracle tier)
    expect(isPrestige(deriveSpec(withSkills({ research: 150 })).rank)).toBe(false); // Oracle
    expect(isPrestige(deriveSpec(withSkills({ content: 300 })).rank)).toBe(true); // Legend
    expect(isPrestige(deriveSpec(withSkills({ research: 600 })).rank)).toBe(true); // Mythic
  });

  it("title reads like a spec sheet", () => {
    const spec = deriveSpec(withSkills({ content: 80 }, 80));
    expect(spec.title(80)).toBe("Level 80 Content Agent · Master");
  });

  it("purity reflects how monoclass the build is", () => {
    expect(deriveSpec(withSkills({ content: 10 })).purity).toBe(1); // pure
    const split = deriveSpec(withSkills({ content: 5, research: 5 }));
    expect(split.purity).toBeCloseTo(0.5, 5);
  });
});

describe("tuning from memory", () => {
  it("surfaces a repeated focus as tunedFor", () => {
    const log: MemoryEntry[] = [
      { type: "mission", description: "Portrait render [focus:azuki]", xpChange: 60, signalChange: 0, timestamp: 3 },
      { type: "mission", description: "Portrait render [focus:azuki]", xpChange: 60, signalChange: 0, timestamp: 2 },
      { type: "mission", description: "Portrait render [focus:azuki]", xpChange: 60, signalChange: 0, timestamp: 1 },
    ];
    const t = deriveTuning(log, 0);
    expect(t.tunedFor).toBe("azuki");
    expect(t.activityCount).toBe(3);
  });

  it("returns null tunedFor below the repetition threshold", () => {
    const log: MemoryEntry[] = [
      { type: "mission", description: "Portrait render [focus:azuki]", xpChange: 60, signalChange: 0, timestamp: 1 },
    ];
    expect(deriveTuning(log, 0).tunedFor).toBeNull();
  });

  it("ignores levelup entries in activity count", () => {
    const log: MemoryEntry[] = [
      { type: "levelup", description: "Reached Level 2", xpChange: 0, signalChange: 0, timestamp: 2 },
      { type: "job", description: "Compose a Hex Tone", xpChange: 50, signalChange: 0, timestamp: 1 },
    ];
    expect(deriveTuning(log, 1).activityCount).toBe(1);
  });
});

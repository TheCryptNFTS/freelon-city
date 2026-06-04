import { describe, it, expect } from "vitest";
import { parseAbilityInput, abilityTask, makeAbilityResolver, GUARDRAILS } from "@/lib/missions/abilities/ability";
import { MAKER } from "@/lib/missions/abilities/maker";
import { empty } from "@/lib/progression-store";

const citizen = {
  id: 1, civilization: "blue-synthesis", tier: "One of One", transmission_name: "ORIGIN SIGNAL",
  honoree: "", caste: "x", shape: "x", hex_state: "x", signal_type: "x", face_status: "x",
  glow_level: "x", sub_archetype: "x", aura: "None", doctrine: "x", honoree_handle: "",
} as never;

describe("ability input parsing", () => {
  it("splits taskKey from brief on colon", () => {
    expect(parseAbilityInput("caption: gm to all freelons")).toEqual({ taskKey: "caption", brief: "gm to all freelons" });
  });
  it("splits on first space when no colon", () => {
    expect(parseAbilityInput("brainstorm names for my mint")).toEqual({ taskKey: "brainstorm", brief: "names for my mint" });
  });
});

describe("CONTENT ability shape (the template)", () => {
  it("has tasks and a CREATE guardrail", () => {
    expect(MAKER.tasks.map((t) => t.key)).toEqual(["post", "thread", "caption", "copy", "plan"]);
    expect(MAKER.guardrail).toBe(GUARDRAILS.CREATE);
  });
  it("abilityTask resolves a known task and rejects unknown", () => {
    expect(abilityTask(MAKER, "caption")?.label).toBe("Write a caption");
    expect(abilityTask(MAKER, "nope")).toBeNull();
  });
});

describe("makeAbilityResolver guards (before any model call)", () => {
  const resolve = makeAbilityResolver(MAKER);
  it("rejects an unknown task", async () => {
    const r = await resolve({ citizen, progress: empty(1), input: "hack: do a thing", walletAddress: "0x", paid: false });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("Choose a task");
  });
  it("rejects a task with no brief", async () => {
    const r = await resolve({ citizen, progress: empty(1), input: "caption:", walletAddress: "0x", paid: false });
    expect(r.ok).toBe(false);
  });
});

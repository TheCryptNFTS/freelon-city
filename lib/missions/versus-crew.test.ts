import { describe, it, expect } from "vitest";
import { getMission, listMissions } from "@/lib/missions";
import { versusResolver } from "@/lib/missions/resolvers/versus";
import { crewResolver } from "@/lib/missions/resolvers/crew";
import { empty } from "@/lib/progression-store";
import type { MissionContext } from "@/lib/missions/types";

const citizen = {
  id: 1337, civilization: "red-corruption", transmission_name: "TEST", honoree: "",
  sub_archetype: "x", hex_state: "x", signal_type: "x", caste: "x", glow_level: "x", shape: "x", tier: "Common",
} as never;

function ctx(input: string): MissionContext {
  return { citizen, progress: empty(1337), input, walletAddress: "0x", paid: false };
}

describe("social missions — versus + crew are UNregistered (2026-06-05)", () => {
  it("are NOT in the catalog (no UI + no pay gate → would run free; removed)", () => {
    // The viral multi-citizen missions were pulled from the catalog so a direct
    // API POST can't run them on the free path. The mission route rejects any id
    // not in the registry with `unknown_mission`. The resolvers stay on disk for
    // when the feature ships with a real UI + price (see catalog.ts note).
    expect(getMission("versus")).toBeNull();
    expect(getMission("crew")).toBeNull();
    expect(getMission("feud")).toBeNull();
    const ids = listMissions().map((m) => m.id);
    expect(ids).not.toContain("versus");
    expect(ids).not.toContain("crew");
    expect(ids).not.toContain("feud");
  });
});

describe("versus/crew input guards (run BEFORE any network call)", () => {
  it("versus: no token number → guarded", async () => {
    const r = await versusResolver(ctx("just an idea with no token"));
    expect(r.ok).toBe(false);
  });
  it("versus: token but no idea → guarded", async () => {
    const r = await versusResolver(ctx("404"));
    expect(r.ok).toBe(false);
  });
  it("versus: can't challenge itself → guarded", async () => {
    const r = await versusResolver(ctx("1337 my own idea"));
    expect(r.ok).toBe(false);
  });
  it("versus: out-of-range token → guarded", async () => {
    const r = await versusResolver(ctx("9999 some idea"));
    expect(r.ok).toBe(false);
  });
  it("crew: token but no brief → guarded", async () => {
    const r = await crewResolver(ctx("404"));
    expect(r.ok).toBe(false);
  });
  it("crew: can't crew with itself → guarded", async () => {
    const r = await crewResolver(ctx("1337 a brief"));
    expect(r.ok).toBe(false);
  });
});

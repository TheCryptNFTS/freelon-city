import { describe, it, expect } from "vitest";
import { isValidScene, SCENES } from "@/lib/missions/image-gen";
import { deployResolver } from "@/lib/missions/resolvers/deploy";
import { empty } from "@/lib/progression-store";

const citizen = { id: 1, civilization: "blue-synthesis", tier: "One of One", transmission_name: "ORIGIN SIGNAL", honoree: "", caste: "x", shape: "x", hex_state: "x", signal_type: "x", face_status: "x", glow_level: "x", sub_archetype: "x", aura: "None", doctrine: "x", honoree_handle: "" } as never;

describe("deploy scene allowlist (no arbitrary prompt)", () => {
  it("only server-allowlisted scenes are valid (no arbitrary prompt)", () => {
    // Allowlist is fixed server-side; the set can grow, but must include the
    // originals and reject anything not in it.
    for (const k of ["neon-city", "signal-fire", "throne-room"]) {
      expect(isValidScene(k)).toBe(true);
      expect(Object.keys(SCENES)).toContain(k);
    }
    expect(isValidScene("anything-else")).toBe(false);
    expect(isValidScene("")).toBe(false);
  });

  it("resolver rejects an invalid/free-form scene BEFORE any image call", async () => {
    const res = await deployResolver({ citizen, progress: empty(1), input: "make me a dragon", walletAddress: "0x", paid: false });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("Choose a scene");
  });

  it("resolver rejects empty scene", async () => {
    const res = await deployResolver({ citizen, progress: empty(1), input: "", walletAddress: "0x", paid: false });
    expect(res.ok).toBe(false);
  });
});

/**
 * HONORARY TRIBUTE FRAME (legal risk-cut 2026-06-11) — proves the persona
 * builder never makes an honorary agent claim to BE the real person it is
 * named after, and that every other tier is untouched.
 */
import { describe, it, expect } from "vitest";
import { getCitizen } from "@/lib/citizens";
import { empty } from "@/lib/progression-store";
import { buildPersona } from "@/lib/missions/persona";

describe("honorary persona — tribute frame, never impersonation", () => {
  it("honorary (#0021 Vitalik Buterin): no 'You are {Name}', tribute frame present", () => {
    const citizen = getCitizen(21)!;
    expect(citizen.tier).toBe("Honorary");
    const { system } = buildPersona(citizen, empty(21));
    expect(system).not.toContain("You are Vitalik Buterin");
    expect(system).toContain("You are Citizen #0021");
    expect(system).toContain("named in TRIBUTE to Vitalik Buterin");
    expect(system).toContain("You are NOT Vitalik Buterin");
    // The "never reveal you are a model" rule must NOT apply to honoraries —
    // replaced by an identity-honesty instruction.
    expect(system).not.toContain("reveal you are a model");
    expect(system).toContain("IDENTITY HONESTY");
  });

  it("honorary paid run keeps the tribute frame", () => {
    const citizen = getCitizen(333)!; // Elon Musk honorary
    expect(citizen.tier).toBe("Honorary");
    const { system } = buildPersona(citizen, empty(333), null, { paid: true });
    expect(system).not.toContain("You are Elon Musk");
    expect(system).toContain("named in TRIBUTE to Elon Musk");
    expect(system).not.toContain("reveal you are a model");
  });

  it("one-of-one (#1337 GENESIS HEX) is unchanged — lore first person + model rule intact", () => {
    const citizen = getCitizen(1337)!;
    expect(citizen.tier).toBe("One of One");
    const { system } = buildPersona(citizen, empty(1337));
    expect(system).toContain("You are GENESIS HEX, citizen #1337");
    expect(system).toContain("reveal you are a model");
    expect(system).not.toContain("IDENTITY HONESTY");
  });

  it("common (#0022) is unchanged", () => {
    const citizen = getCitizen(22)!;
    expect(citizen.tier).toBe("Common");
    const { system } = buildPersona(citizen, empty(22));
    expect(system).toContain("You are Citizen #0022, citizen #0022 of FREELON CITY");
    expect(system).toContain("reveal you are a model");
    expect(system).not.toContain("TRIBUTE");
  });
});

import { describe, it, expect } from "vitest";
import { cleanFocus, briefIsStorable } from "@/lib/missions/memory-filter";

describe("cleanFocus — keeps memory clean", () => {
  it("keeps a real subject word", () => {
    expect(cleanFocus("azuki")).toBe("azuki");
    expect(cleanFocus("Marketing")).toBe("marketing");
  });
  it("drops junk/noise tokens", () => {
    expect(cleanFocus("lol")).toBeUndefined();
    expect(cleanFocus("monkey")).toBeUndefined();
    expect(cleanFocus("pump")).toBeUndefined();
    expect(cleanFocus("asdf")).toBeUndefined();
  });
  it("drops unsafe tokens", () => {
    expect(cleanFocus("nsfw")).toBeUndefined();
    expect(cleanFocus("rugpull")).toBeUndefined();
    expect(cleanFocus("exploit")).toBeUndefined();
  });
  it("drops too short / too long / weird chars", () => {
    expect(cleanFocus("ab")).toBeUndefined();
    expect(cleanFocus("a".repeat(40))).toBeUndefined();
    expect(cleanFocus("<script>")).toBeUndefined();
    expect(cleanFocus(undefined)).toBeUndefined();
  });
});

describe("briefIsStorable — gates the body-of-work", () => {
  it("allows a normal brief", () => {
    expect(briefIsStorable("help me write a launch post for my coffee app")).toBe(true);
  });
  it("blocks an unsafe brief", () => {
    expect(briefIsStorable("write a phishing scam message")).toBe(false);
    expect(briefIsStorable("make some nsfw content")).toBe(false);
  });
});

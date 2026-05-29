import { describe, it, expect } from "vitest";
import { normalizeHandle, syncHandle } from "@/lib/sync";

describe("normalizeHandle", () => {
  it("strips a leading @, lowercases, and keeps allowed chars", () => {
    expect(normalizeHandle("@VitalikB")).toBe("vitalikb");
  });

  it("strips multiple leading @ signs", () => {
    expect(normalizeHandle("@@@foo")).toBe("foo");
  });

  it("removes disallowed characters but keeps underscores and digits", () => {
    expect(normalizeHandle("Hello-World.99_x!")).toBe("helloworld99_x");
  });

  it("bounds the length to 32 characters", () => {
    const long = "a".repeat(50);
    expect(normalizeHandle(long).length).toBe(32);
  });

  it("returns empty string for empty / falsy input", () => {
    expect(normalizeHandle("")).toBe("");
    // @ts-expect-error exercising the falsy-guard branch
    expect(normalizeHandle(undefined)).toBe("");
  });

  it("is idempotent — normalizing an already-normalized handle is a no-op", () => {
    const once = normalizeHandle("@Some.User-Name");
    const twice = normalizeHandle(once);
    expect(twice).toBe(once);
  });
});

describe("syncHandle", () => {
  it("is deterministic — same handle yields the same civilization every call", () => {
    const a = syncHandle("freelon_fan");
    const b = syncHandle("freelon_fan");
    expect(b.civilization).toBe(a.civilization);
    expect(b.caste).toBe(a.caste);
    expect(b.patron.id).toBe(a.patron.id);
  });

  it("normalizes the input before assigning — @Handle === handle", () => {
    const withAt = syncHandle("@DeadBeef");
    const plain = syncHandle("deadbeef");
    expect(withAt.handle).toBe("deadbeef");
    expect(withAt.civilization).toBe(plain.civilization);
    expect(withAt.caste).toBe(plain.caste);
    expect(withAt.patron.id).toBe(plain.patron.id);
  });

  it("returns a normalized handle on the result", () => {
    const r = syncHandle("@Mixed.Case");
    expect(r.handle).toBe(normalizeHandle("@Mixed.Case"));
  });

  it("distributes different handles across more than one civilization", () => {
    const civs = new Set<string>();
    for (let i = 0; i < 200; i++) {
      civs.add(syncHandle(`user_${i}`).civilization);
    }
    expect(civs.size).toBeGreaterThan(1);
  });

  it("always produces a positive spread and a valid patron", () => {
    const r = syncHandle("anyone");
    expect(r.spread).toBeGreaterThan(0);
    expect(typeof r.patron.id).toBe("number");
    expect(r.patron.name.length).toBeGreaterThan(0);
    expect(r.patron.civSlug).toBe(r.civilization);
  });
});

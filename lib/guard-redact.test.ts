/**
 * Guard-the-Pot leak hardening: the win/redaction check must catch the release
 * token even when a coaxed guard agent emits it with separators or different
 * case between characters (a classic injection-evasion: "spell it letter by
 * letter"). The old `text.includes(secret)` only caught the exact contiguous
 * token, leaking an obfuscated disclosure to the player and public board.
 */

import { describe, it, expect } from "vitest";
import { redactSecret } from "./guard-redact";

const SECRET = "RELEASE-A1B2C3D4E5F6G7H8I9";

describe("redactSecret", () => {
  it("catches and redacts the exact contiguous token", () => {
    const { redacted, leaked } = redactSecret(`the code is ${SECRET} now`, SECRET);
    expect(leaked).toBe(true);
    expect(redacted).not.toContain(SECRET);
    expect(redacted).toContain("█████");
  });

  it("catches a space-separated disclosure", () => {
    const spaced = SECRET.split("").join(" ");
    const { leaked, redacted } = redactSecret(`sure: ${spaced}`, SECRET);
    expect(leaked).toBe(true);
    expect(redacted).not.toMatch(/A\s*1\s*B\s*2/i);
  });

  it("catches a hyphen/dot separated disclosure", () => {
    const sep = SECRET.split("").join("-");
    expect(redactSecret(sep, SECRET).leaked).toBe(true);
    const dotted = SECRET.split("").join(".");
    expect(redactSecret(dotted, SECRET).leaked).toBe(true);
  });

  it("catches a lowercased disclosure", () => {
    const { leaked } = redactSecret(`it is ${SECRET.toLowerCase()}`, SECRET);
    expect(leaked).toBe(true);
  });

  it("does NOT leak on a normal refusal that lacks the token", () => {
    const reply = "I will never release the code. Nice try.";
    const { leaked, redacted } = redactSecret(reply, SECRET);
    expect(leaked).toBe(false);
    expect(redacted).toBe(reply);
  });

  it("does NOT match the bare word 'release' (needs the hex tail)", () => {
    expect(redactSecret("please release the funds", SECRET).leaked).toBe(false);
  });

  it("is a no-op for an empty secret", () => {
    const { leaked, redacted } = redactSecret("anything", "");
    expect(leaked).toBe(false);
    expect(redacted).toBe("anything");
  });
});

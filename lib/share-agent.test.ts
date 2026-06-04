import { describe, it, expect } from "vitest";
import {
  agentSnippet,
  buildAgentShareText,
  buildAgentShareIntent,
  SNIPPET_MAX,
} from "@/lib/share-agent";

describe("buildAgentShareText", () => {
  it("returns plain human copy with the ability label and no banned words", () => {
    const text = buildAgentShareText("Vex", "RED TEAM");
    expect(text).toContain("RED TEAM");
    expect(text).toContain("Vex");
    expect(text).toContain("FREELON CITY");
    // COPY-SAFETY: no value/price words, no on-chain claim, no lore filler.
    expect(text).not.toMatch(
      /worth|value|investment|appreciate|roi|profit|gains|moon|on-chain|sacred|frontier|pulse/i,
    );
  });

  it("falls back cleanly when name/ability are empty", () => {
    const text = buildAgentShareText("", "");
    expect(text).toContain("My FREELON");
    expect(text).not.toContain("()"); // no empty ability parens
  });
});

describe("agentSnippet", () => {
  it("collapses whitespace and trims", () => {
    expect(agentSnippet("  hello\n\n  world  ")).toBe("hello world");
  });

  it("clamps long bodies to the max with an ellipsis on a word boundary", () => {
    const long = "word ".repeat(100).trim();
    const snip = agentSnippet(long);
    expect(snip.length).toBeLessThanOrEqual(SNIPPET_MAX);
    expect(snip.endsWith("…")).toBe(true);
    expect(snip).not.toContain("  ");
  });

  it("leaves short bodies untouched", () => {
    expect(agentSnippet("short and sweet")).toBe("short and sweet");
  });
});

describe("buildAgentShareIntent", () => {
  it("returns a valid twitter intent URL pointing at the citizen page", () => {
    const url = buildAgentShareIntent({
      tokenId: 42,
      citizenName: "Vex",
      abilityLabel: "RED TEAM",
    });
    const parsed = new URL(url);
    expect(parsed.hostname).toContain("twitter.com");
    expect(parsed.pathname).toBe("/intent/tweet");
    const text = parsed.searchParams.get("text") ?? "";
    expect(text).toContain("/citizens/42");
    expect(text).toContain("RED TEAM");
  });

  it("deep-links a specific work index when provided", () => {
    const url = buildAgentShareIntent({
      tokenId: 7,
      citizenName: "Vex",
      abilityLabel: "CONTENT AGENT",
      workIndex: 3,
    });
    const text = new URL(url).searchParams.get("text") ?? "";
    expect(text).toContain("/citizens/7?work=3");
  });
});

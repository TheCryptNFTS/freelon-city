/**
 * PERSONA-FREE COPY PASS — the structural fix for "lore bleed" in premium
 * Strategy output.
 *
 * The Strategy agent reasons IN CHARACTER (it's a FREELON CITY citizen), which
 * makes its analysis sharp but leaks lore/hype words ("signal", "pulse",
 * "sacred", "frontier") into ready-to-post COPY deliverables. A holder paying
 * for "5 ready-to-post tweets" must get publishable copy, not citizen-speak.
 *
 * Fix: keep the in-persona plan, then run any COPY sections (hooks, posts,
 * tweets, Discord/announcement copy) through a SECOND, persona-free LLM pass
 * whose only job is to rewrite the copy like a plain human founder. It rewrites
 * ONLY copy deliverables — the strategic analysis is left untouched.
 *
 * Cheap model (it's a mechanical rewrite, not reasoning) so it adds ~$0.0003.
 */
import { citizenReason } from "@/lib/missions/llm";
import { modelFor } from "@/lib/missions/models";

/** Words that mark lore/hype/financial bleed in deliverable copy. If a Strategy
 *  output's copy contains any of these, it needs the cleanup pass. */
export const COPY_BLEED_WORDS = [
  "signal", "pulse", "frequency", "sacred", "frontier", "unleash", "revolution",
  "legendary", "witness", "conquer", "next wave", "rare", "alpha", "moon",
  "stake", "growth", "value", "roi", "investment", "profit", "synthesis",
  "synced", "sync", "transmit", "the city",
];

/** Does this text contain lore/hype bleed worth cleaning? (word-boundary match) */
export function hasCopyBleed(text: string): boolean {
  const t = text.toLowerCase();
  return COPY_BLEED_WORDS.some((w) => new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`).test(t));
}

const CLEANUP_SYSTEM =
  "You are a plain, sharp human copy editor — NOT a character, NOT a lore bot. You are given a strategy " +
  "document that may contain ready-to-post copy (hooks, tweets, Discord posts, taglines, announcement lines). " +
  "Your job: return the SAME document, but rewrite every piece of PUBLIC-FACING COPY so it sounds like a real " +
  "human founder wrote it — direct, specific, publishable. Leave the strategic analysis, bullets, and reasoning " +
  "as-is; only fix the actual copy/posts.\n\n" +
  "HARD RULES for the copy:\n" +
  "- Sound like a founder talking to real people, not a crypto bot.\n" +
  "- BANNED words/vibes (remove entirely, never substitute a synonym of the same flavour): signal, pulse, " +
  "frequency, sacred, frontier, unleash, revolution, legendary, witness, conquer, next wave, rare, alpha, moon, " +
  "stake, growth, value, ROI, investment, profit, 'the city', 'synthesis', 'sync'.\n" +
  "- No mystical wording, no Web3 hype, no fake urgency ('time is now', 'don't miss out').\n" +
  "- No financial/return/value promises of any kind.\n" +
  "- Each post/hook must say a concrete, specific thing a normal person understands and could act on.\n" +
  "- Keep the useful detail and the strategic intent; just make the copy clean and human.\n" +
  "Output the full document with the copy rewritten in place. Do not add a preamble or sign-off.";

/**
 * Clean an in-persona Strategy output's copy. Returns the cleaned document, or
 * the original if the cleanup call fails (never block a paid run on the editor)
 * or if there's nothing to clean.
 */
export async function cleanStrategyCopy(raw: string): Promise<string> {
  if (!hasCopyBleed(raw)) return raw; // already clean — skip the call
  const result = await citizenReason({
    system: CLEANUP_SYSTEM,
    user: raw,
    maxTokens: 1500,
    model: modelFor("basicConsult"), // cheap — mechanical rewrite
  });
  if (!result.ok || !result.text || result.text.length < raw.length * 0.4) {
    // Cleanup failed or returned something suspiciously short → keep the original.
    return raw;
  }
  return result.text;
}

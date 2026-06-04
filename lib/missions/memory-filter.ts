/**
 * Memory hygiene — keeps the citizen's durable memory CLEAN.
 *
 * The citizen's "tuned for X" and persona digest are built from what it has
 * done. Without a filter, a user feeding junk ("lol fart monkey pump") would
 * permanently pollute the agent — and that pollution rides with the NFT on
 * sale. This filter decides what's allowed to become DURABLE memory/focus.
 *
 * Rule of thumb: store a focus only if it's a real, safe-looking subject word.
 * When in doubt, drop it (no focus is better than a bad one).
 */

// Obvious junk / noise tokens that should never become a citizen's "focus".
const JUNK = new Set([
  "lol", "lmao", "lmfao", "rofl", "haha", "hahaha", "test", "testing", "asdf",
  "qwerty", "blah", "stuff", "thing", "things", "idk", "nvm", "yeah", "nope",
  "pump", "moon", "wagmi", "ngmi", "gm", "gn", "fud", "ape", "aping", "degen",
  "shill", "shilling", "rekt", "cope", "based", "cringe", "sus", "yolo",
  "monkey", "fart", "poop", "meme", "memes",
]);

// Words that signal an unsafe / off-limits subject — never store these as focus.
const UNSAFE = [
  "nsfw", "porn", "sex", "nude", "naked", "kill", "suicide", "bomb", "weapon",
  "drug", "cocaine", "heroin", "meth", "hate", "nazi", "slur", "rape", "abuse",
  "scam", "rugpull", "rug", "exploit", "hack", "phish", "launder",
];

/**
 * Decide whether a candidate focus token may become DURABLE memory.
 * Returns the cleaned token to store, or null to store NO focus.
 */
export function cleanFocus(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim().toLowerCase();

  // Length sanity: 4–24 chars, letters/numbers/space/dash only.
  if (t.length < 4 || t.length > 24) return undefined;
  if (!/^[a-z0-9][a-z0-9 _-]*$/.test(t)) return undefined;

  // Drop pure noise.
  if (JUNK.has(t)) return undefined;

  // Drop anything that contains an unsafe substring.
  if (UNSAFE.some((bad) => t.includes(bad))) return undefined;

  // Looks like a real subject — keep it.
  return t;
}

/**
 * Should this mission RUN at all be recorded in the citizen's body of work?
 * (Outputs of unsafe briefs shouldn't be stored/showcased.) Checks the user's
 * brief for unsafe content. The agent's guardrails handle the response itself;
 * this is the storage gate.
 */
export function briefIsStorable(brief: string): boolean {
  const b = brief.toLowerCase();
  return !UNSAFE.some((bad) => b.includes(bad));
}

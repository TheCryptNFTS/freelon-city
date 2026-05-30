/**
 * Centralized tweet templates and share URL builders.
 *
 * THREE X-platform rules every template respects (in order of
 * importance — break the first two and your post disappears from
 * non-followers' timelines):
 *   1. Don't lead with a URL (X suppresses link-led posts).
 *   2. Don't lead with an @mention (X treats those as replies and
 *      hides them from non-followers — original Discord report).
 *   3. EVERY @4040hex mention is preceded by ⬡ — the brand glyph
 *      always wraps the handle so the eye locks on it. Same rule
 *      applies inline, not just at the start. @Nonz called this
 *      out on Discord — search for "its not doing a hexagon".
 *
 * Pattern: `⬡ ${HANDLE} · …` at the start, or for mid-line mentions
 * `… ⬡ ${HANDLE} …`. NEVER write `${HANDLE}` without a `⬡` directly
 * before it.
 *
 * Hashtag closer is always #FREELONCITY #404HEXNOTFOUND so the brand
 * clusters into a searchable thread.
 *
 * Every share doubles as recruitment — there is always a way for a
 * reader to participate (sync, claim, watch, snipe, etc).
 */

export const SITE = "https://www.freeloncity.com";
export const HANDLE = "@4040hex";
const HASHTAGS = "#FREELONCITY #404HEXNOTFOUND";

/** Build a twitter intent URL. */
export function tweetIntent(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

// ─────────────────────────────────────────────────────────────────────
// Per-surface tweet builders
// ─────────────────────────────────────────────────────────────────────

/**
 * Carrier public profile share — used on /carrier/[handle].
 * The mythic frame: you ARE one of the civs, not just a holder.
 * Tag-first so the post isn't link-suppressed by X.
 */
export function tweetCarrier(input: {
  handle: string;
  civName: string;
  patronId: number;
  doctrine: string;
}): string {
  const id4 = input.patronId.toString().padStart(4, "0");
  return [
    `⬡ ${HANDLE} · I'M A CARRIER OF ${input.civName.toUpperCase()}.`,
    ``,
    `${input.doctrine.toUpperCase()}.`,
    `Patron citizen · #${id4}`,
    ``,
    `The signal moves through us.`,
    `${HASHTAGS}`,
    `${SITE}/sync`,
  ].join("\n");
}

/**
 * Citizen detail share — used on /citizens/[id].
 */
export function tweetCitizen(input: {
  tokenId: number;
  name: string;
  civName: string;
  tier: string;
  shape: string;
}): string {
  const id4 = input.tokenId.toString().padStart(4, "0");
  const title = input.name || `Citizen #${id4}`;
  return [
    `⬡ ${HANDLE} · ${title} · #${id4}`,
    ``,
    `${input.civName.toUpperCase()} · ${input.tier.toUpperCase()} · ${input.shape.toUpperCase()}`,
    ``,
    `4040 citizens. One of them is yours.`,
    `${HASHTAGS}`,
    `${SITE}/citizens/${input.tokenId}`,
  ].join("\n");
}

/**
 * Listing card share — direct market signal with last sale + ask.
 */
export function tweetListing(input: {
  tokenId: number;
  name: string;
  civName: string;
  shape: string;
  lastSaleEth: number | null;
  askEth: number;
}): string {
  const id4 = input.tokenId.toString().padStart(4, "0");
  const last = input.lastSaleEth != null ? `${trimEth(input.lastSaleEth)} ETH` : "—";
  return [
    `⬡ ${HANDLE} · LISTING #${id4}`,
    input.name && input.name !== `Citizen #${id4}` ? `"${input.name}"` : null,
    ``,
    `Last sale  ${last}`,
    `Ask        ${trimEth(input.askEth)} ETH`,
    ``,
    `${input.civName.toUpperCase()} · ${input.shape.toUpperCase()}`,
    `${HASHTAGS}`,
    `${SITE}/citizens/${input.tokenId}`,
  ].filter(Boolean).join("\n");
}

/**
 * Passport share — identity reveal. Class name is the hook.
 */
export function tweetPassport(input: {
  klass: string;
  address: string;
  balance: number;
}): string {
  return [
    `⬡ ${HANDLE} · THE CITY RECOGNIZES ME AS A ${input.klass.toUpperCase()}.`,
    ``,
    `${input.balance} citizen${input.balance === 1 ? "" : "s"} of FREELON CITY held.`,
    ``,
    `What does the city call you?`,
    `${HASHTAGS}`,
    `${SITE}/passport/${input.address}`,
  ].join("\n");
}

/**
 * Wallet rank share — leaderboard position as flex.
 */
export function tweetRank(input: { address: string; rank?: number | null; total?: number | null }): string {
  const rankLine = input.rank && input.total
    ? `RANK #${input.rank} of ${input.total} carriers.`
    : `A CARRIER of FREELON CITY.`;
  return [
    `⬡ ${HANDLE} · ${rankLine}`,
    ``,
    `The city pays carriers in hex daily.`,
    `Where's your rank?`,
    `${HASHTAGS}`,
    `${SITE}/wallet/${input.address}`,
  ].join("\n");
}

/**
 * Tribute share — used for honorary citizens.
 */
export function tweetTribute(input: { handle: string; tokenId: number }): string {
  const cleanHandle = input.handle.replace(/^@/, "");
  const id4 = input.tokenId.toString().padStart(4, "0");
  return [
    `⬡ ${HANDLE} · @${cleanHandle} is citizen #${id4} of FREELON CITY.`,
    ``,
    `35 honorees. The signal remembers.`,
    `${HASHTAGS}`,
    `${SITE}/tribute/${cleanHandle}`,
  ].join("\n");
}

/**
 * Civ pride share — civ-allegiance flex.
 */
export function tweetCivPride(input: { civName: string; doctrine: string; population: number }): string {
  return [
    `⬡ ${HANDLE} · I BACK ${input.civName.toUpperCase()}.`,
    ``,
    `${input.doctrine.toUpperCase()}.`,
    `${input.population} of 4040 carry this signal.`,
    ``,
    `Which civ are you?`,
    `${HASHTAGS}`,
    `${SITE}/civilizations`,
  ].join("\n");
}

/**
 * Dashboard / numbers share — generic stat share.
 */
export function tweetDashboard(text: string): string {
  return [
    `⬡ ${HANDLE} · ${text}`,
    ``,
    `Live numbers from the city.`,
    `${HASHTAGS}`,
    `${SITE}/dashboard`,
  ].join("\n");
}

/**
 * Transmission share — used on /transmissions/[id].
 */
export function tweetTransmission(input: {
  id: string;
  caption: string;
  civName: string;
  authorHandle: string;
}): string {
  return [
    `⬡ ${HANDLE} · TRANSMISSION from ${input.civName.toUpperCase()}`,
    ``,
    `"${input.caption.slice(0, 180)}"`,
    ``,
    `— @${input.authorHandle.replace(/^@/, "")}`,
    ``,
    `Signal back ⬢ or boost ↑`,
    `${HASHTAGS}`,
    `${SITE}/transmissions/${input.id}`,
  ].join("\n");
}

/**
 * Proof of Signal share — the daily puzzle result. The spoiler-free emoji
 * grid is the hook (recognisable Wordle-style), the score is the flex, and
 * /play/proof is the recruitment funnel: any reader can play the same day.
 */
export function tweetProof(input: {
  day: number;
  attempts: number; // guesses used
  max: number;
  solved: boolean;
  grid: string; // pre-built emoji rows, newline-separated
}): string {
  const score = input.solved ? `${input.attempts}/${input.max}` : `X/${input.max}`;
  const head = input.solved
    ? `⬡ ${HANDLE} · SIGNAL LOCKED · Proof of Signal #${input.day} · ${score}`
    : `⬡ ${HANDLE} · LOST IN THE NOISE · Proof of Signal #${input.day} · ${score}`;
  return [
    head,
    ``,
    input.grid,
    ``,
    `Can you receive today's transmission?`,
    `${HASHTAGS}`,
    `${SITE}/play/proof`,
  ].join("\n");
}

/**
 * Proof of Signal — PRACTICE drill share. The daily share (above) stays the
 * canonical, comparable card; practice runs an off-day frequency at a chosen
 * difficulty, so its card never claims a day number — it flexes the tier + the
 * spoiler-free grid and funnels back to the daily. Same brand-glyph family.
 */
export function tweetProofPractice(input: {
  tier: string; // tier label, e.g. "DEEP"
  len: number; // signals in the frequency
  attempts: number;
  max: number;
  solved: boolean;
  grid: string;
}): string {
  const score = input.solved ? `${input.attempts}/${input.max}` : `X/${input.max}`;
  const head = input.solved
    ? `⬡ ${HANDLE} · ${input.tier} FREQUENCY CRACKED · Proof of Signal drill · ${score}`
    : `⬡ ${HANDLE} · LOST IN THE NOISE · ${input.tier} drill · ${score}`;
  return [
    head,
    ``,
    input.grid,
    ``,
    `${input.len}-signal ${input.tier} drill. Can you tune to today's daily transmission?`,
    `${HASHTAGS}`,
    `${SITE}/play/proof`,
  ].join("\n");
}

/**
 * The Cipher daily share — the multi-stage cryptogram result. Like Proof, the
 * spoiler-free brand-glyph grid is the hook (⬡ = decoded clean, ◇ = decoded
 * with a bought hint, ✕ = lost), the X/N is the flex, and /play/cipher is the
 * recruitment funnel: any reader faces the same shifted transmission today.
 */
export function tweetCipher(input: {
  day: number;
  solved: number; // stages decoded
  stages: number; // total stages
  won: boolean; // all stages decoded
  grid: string; // pre-built brand-glyph row
}): string {
  const score = `${input.solved}/${input.stages}`;
  const head = input.won
    ? `⬡ ${HANDLE} · TRANSMISSION DECODED · The Cipher #${input.day} · ${score}`
    : `⬡ ${HANDLE} · SIGNAL LOST IN THE SHIFT · The Cipher #${input.day} · ${score}`;
  return [
    head,
    ``,
    input.grid,
    ``,
    `Can you decode today's intercepted transmission?`,
    `${HASHTAGS}`,
    `${SITE}/play/cipher`,
  ].join("\n");
}

/**
 * The Reckoning share — the weekly civ-vs-civ tribute war. Two modes:
 *   - rally: "I just mustered for <civ>" after a tribute (recruitment for the
 *     side you back — the burn flexes commitment, the muster flexes holdings).
 *   - standings: the current leader + week, a spectator hook.
 * /play/reckoning is the funnel — any reader can pick a side and burn.
 */
export function tweetReckoning(input: {
  week: number;
  mode: "rally" | "standings";
  civName: string; // the civ you backed (rally) or the leader (standings)
  burned?: number; // hex burned this tribute (rally)
  rank?: number | null; // civ's current standing 1..10 (rally)
}): string {
  if (input.mode === "rally") {
    const burnLine =
      input.burned != null ? `${input.burned.toLocaleString()} ⬡ burned for the cause.` : `I picked my side.`;
    const rankLine = input.rank ? `${input.civName.toUpperCase()} sits #${input.rank} this week.` : null;
    return [
      `⬡ ${HANDLE} · I MUSTERED FOR ${input.civName.toUpperCase()}.`,
      ``,
      burnLine,
      rankLine,
      ``,
      `The Reckoning · Week ${input.week}. Which civ do you bleed for?`,
      `${HASHTAGS}`,
      `${SITE}/play/reckoning`,
    ].filter(Boolean).join("\n");
  }
  return [
    `⬡ ${HANDLE} · THE RECKONING · WEEK ${input.week}`,
    ``,
    `${input.civName.toUpperCase()} is winning the war.`,
    ``,
    `Ten civilizations. One crown a week. Burn for your side.`,
    `${HASHTAGS}`,
    `${SITE}/play/reckoning`,
  ].join("\n");
}

/**
 * Sweep Run share — the reflex arcade score. No wallet, pure top-of-funnel:
 * the score is the flex, /play/sweep is the recruitment funnel (anyone can
 * beat it). New-best gets a louder line.
 */
export function tweetSweep(input: {
  score: number;
  streak: number; // best streak this run
  best: number; // all-time best on this device
  newBest: boolean;
}): string {
  const head = input.newBest
    ? `⬡ ${HANDLE} · NEW BEST · I SWEPT ${input.score.toLocaleString()} SIGNAL`
    : `⬡ ${HANDLE} · I SWEPT ${input.score.toLocaleString()} SIGNAL`;
  return [
    head,
    ``,
    `Best streak ×${input.streak} · clearing the corrupted off the FREELON CITY floor.`,
    ``,
    `Think you can sweep faster?`,
    `${HASHTAGS}`,
    `${SITE}/play/sweep`,
  ].join("\n");
}

/**
 * Generic share — used by the ShareOG component.
 */
export function tweetGeneric(text: string, pageUrl: string): string {
  return [
    `⬡ ${HANDLE} · ${text}`,
    ``,
    `${HASHTAGS}`,
    `${pageUrl}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// REPLY PROMPTS — for the new daily-replies feature
// Carriers can post these (not as a link, as a quoted-reply or as
// their own thought) to drive engagement around the brand without
// dropping a link.
// ─────────────────────────────────────────────────────────────────────

export type ReplyPrompt = {
  id: string;
  category: "reply" | "quote" | "own-post";
  hook: string;
  body: string;
};

export const REPLY_PROMPTS: ReplyPrompt[] = [
  {
    id: "civ-pride",
    category: "own-post",
    hook: "REPRESENT YOUR CIV",
    body: `⬡ ${HANDLE} · which civilization are you carrying for?\n\nMine is ____.\n\n${HASHTAGS}`,
  },
  {
    id: "signal-found",
    category: "own-post",
    hook: "I FOUND THE SIGNAL",
    body: `⬡ ${HANDLE} · the signal found me.\n\nI'm citizen #____ of FREELON CITY.\n\nThe city remembers everything.\n\n${HASHTAGS}`,
  },
  {
    id: "daily-claim",
    category: "own-post",
    hook: "DAILY HEX CLAIMED",
    body: `⬡ ${HANDLE} · claimed today's signal.\n\nDay ____ of my streak. The meter keeps ticking.\n\n${HASHTAGS}`,
  },
  {
    id: "snipe-flex",
    category: "own-post",
    hook: "I SNIPED A RED SIGNAL",
    body: `⬡ ${HANDLE} · sniped a RED SIGNAL.\n\n____ ⬡ bounty locked in. The city pays carriers who move first.\n\n${HASHTAGS}`,
  },
  {
    id: "carrier-call",
    category: "reply",
    hook: "WELCOME NEW CARRIERS",
    body: `⬡ Welcome to the signal — ⬡ ${HANDLE} carriers.\n\nFind your civ. Post daily. The city remembers.\n\n${HASHTAGS}`,
  },
  {
    id: "tag-friend",
    category: "reply",
    hook: "TAG A FRIEND INTO THE CITY",
    body: `⬡ sync your handle with ⬡ ${HANDLE} — the city assigns you a civilization based on your name.\n\nmine is ____. what's yours?`,
  },
  {
    id: "stat-flex",
    category: "own-post",
    hook: "BRAG YOUR STATS",
    body: `⬡ Status update — ⬡ ${HANDLE}:\n\n• Rank ____\n• ____ ⬡ stacked\n• ____ citizens held\n• Civ: ____\n\nThe city sees everything.\n\n${HASHTAGS}`,
  },
  {
    id: "art-drop",
    category: "own-post",
    hook: "POST YOUR CITIZEN",
    body: `⬡ ${HANDLE} · this is mine.\n\n[attach your citizen image]\n\nCivilization: ____\nDoctrine: ____\n\n${HASHTAGS}`,
  },
  {
    id: "lore-quote",
    category: "own-post",
    hook: "QUOTE A DOCTRINE",
    body: `⬡ ${HANDLE} ·\n\n"____" — ${HASHTAGS.split(" ")[0]}\n\nThe ____ doctrine.`,
  },
  {
    id: "transmission-relay",
    category: "quote",
    hook: "RELAY A TRANSMISSION",
    body: `⬡ ${HANDLE} carriers transmit their own signal now.\n\nThis is one. Signal back. The top transmission of the week earns 5,000 ⬡.\n\n${HASHTAGS}`,
  },
];

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function trimEth(n: number): string {
  const s = n.toFixed(4);
  return parseFloat(s).toString();
}

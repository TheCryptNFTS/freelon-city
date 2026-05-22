/**
 * Centralized tweet templates and share URL builders.
 *
 * Every shareable surface on the site goes through here so the brand voice
 * stays consistent and every share doubles as recruitment — a "get yours"
 * CTA in every template.
 *
 * Tone: short, mythic, ALL-CAPS for impact lines, never marketing-speak.
 * Every tweet ends with a way for a reader to claim their own thing.
 */

export const SITE = "https://freeloncity.com";
const HASHTAGS = "#FREELONCITY #404HEXNOTFOUND";

/** Build a twitter intent URL. */
export function tweetIntent(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

/** Common "get yours" call-to-action — short, hooky. */
const GET_YOURS = `Find your civ → ${SITE}/sync`;

// ─────────────────────────────────────────────────────────────────────
// Per-surface tweet builders
// ─────────────────────────────────────────────────────────────────────

/**
 * Carrier public profile share — used on /carrier/[handle].
 * The mythic frame: you ARE one of the civs, not just a holder.
 */
export function tweetCarrier(input: {
  handle: string;
  civName: string;
  patronId: number;
  doctrine: string;
}): string {
  const id4 = input.patronId.toString().padStart(4, "0");
  return [
    `⬡ I'm a CARRIER of ${input.civName.toUpperCase()}.`,
    ``,
    `${input.doctrine.toUpperCase()}.`,
    `Patron citizen · #${id4}`,
    ``,
    `The signal moves through us.`,
    ``,
    `${GET_YOURS}`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Citizen detail share — used on /citizens/[id].
 * Frame: "I'm holding this specific freelon, here's what it is, get one."
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
    `⬡ ${title} · #${id4}`,
    ``,
    `${input.civName.toUpperCase()} · ${input.tier.toUpperCase()} · ${input.shape.toUpperCase()}`,
    ``,
    `4040 citizens on Ethereum. One of them is yours.`,
    ``,
    `${SITE}/citizens/${input.tokenId}`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Listing card share — used on /citizens/[id]/card (AskAndShare).
 * Frame: market signal. Direct ask + last sale.
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
    `⬡ LISTING · FREELON CITY #${id4}`,
    input.name && input.name !== `Citizen #${id4}` ? `"${input.name}"` : null,
    ``,
    `Last sale  ${last}`,
    `Ask        ${trimEth(input.askEth)} ETH`,
    ``,
    `${input.civName.toUpperCase()} · ${input.shape.toUpperCase()}`,
    ``,
    `${SITE}/citizens/${input.tokenId}`,
    ``,
    `${HASHTAGS}`,
  ].filter(Boolean).join("\n");
}

/**
 * Passport share — used on /passport/[address].
 * Frame: identity reveal. Class name is the hook.
 */
export function tweetPassport(input: {
  klass: string;
  address: string;
  balance: number;
}): string {
  return [
    `⬡ THE CITY RECOGNIZES ME AS A ${input.klass.toUpperCase()}.`,
    ``,
    `${input.balance} citizen${input.balance === 1 ? "" : "s"} of FREELON CITY held.`,
    ``,
    `Generate your passport → ${SITE}/passport/${input.address}`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Wallet rank share — used on /wallet/[address].
 * Frame: leaderboard position as flex.
 */
export function tweetRank(input: { address: string; rank?: number | null; total?: number | null }): string {
  const rankLine = input.rank && input.total
    ? `Rank #${input.rank} of ${input.total} carriers.`
    : `A carrier of FREELON CITY.`;
  return [
    `⬡ ${rankLine}`,
    ``,
    `The city pays carriers in hex daily.`,
    `Find your wallet → ${SITE}/wallet/${input.address}`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Tribute share — used on /citizens/[id] for honorary citizens
 * AND on /tribute/[handle].
 */
export function tweetTribute(input: { handle: string; tokenId: number }): string {
  const cleanHandle = input.handle.replace(/^@/, "");
  const id4 = input.tokenId.toString().padStart(4, "0");
  return [
    `⬡ @${cleanHandle} is FREELON CITY citizen #${id4}.`,
    ``,
    `35 honoraries. The signal remembers.`,
    ``,
    `Find yours → ${SITE}/sync?h=@${cleanHandle}`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Civ pride share — used on /civilizations/[slug].
 */
export function tweetCivPride(input: { civName: string; doctrine: string; population: number }): string {
  return [
    `⬡ I BACK ${input.civName.toUpperCase()}.`,
    ``,
    `${input.doctrine.toUpperCase()}.`,
    `${input.population} of 4040 citizens carry this signal.`,
    ``,
    `Pick your civ → ${SITE}/civilizations`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Dashboard / numbers share — generic stat share.
 */
export function tweetDashboard(text: string): string {
  return [
    `⬡ ${text}`,
    ``,
    `${SITE}/dashboard`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

/**
 * Generic share — used by the ShareOG component.
 */
export function tweetGeneric(text: string, pageUrl: string): string {
  return [
    `${text}`,
    ``,
    `${pageUrl}`,
    ``,
    `${HASHTAGS}`,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function trimEth(n: number): string {
  const s = n.toFixed(4);
  return parseFloat(s).toString();
}

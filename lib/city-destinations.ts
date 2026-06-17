/**
 * City destinations — the ALLOWLIST behind the agent's "city assistant" link
 * cards. The agent/chat can only ever surface a card from this fixed list; it can
 * never emit an arbitrary URL (prompt-injection / phishing guard, matching the
 * rest of the codebase's allowlist-not-free-text philosophy).
 *
 * resolveCityDestinations() does cheap, client-side keyword intent matching on
 * the user's message — no LLM call, no cost, no hallucination risk. When a
 * message looks navigational/help/lore-shaped, the matching card(s) render under
 * the agent's reply as a "nice box to click".
 */

export type CityDest = {
  key: string;
  href: string;
  title: string;
  blurb: string;
  /** Lowercase trigger phrases — prefer specific, intent-shaped phrases over
   *  common words so a normal chat brief doesn't pop a card by accident. */
  keywords: string[];
};

export type CityLink = { key: string; href: string; title: string; blurb: string };

export const CITY_DESTINATIONS: CityDest[] = [
  {
    key: "canon",
    href: "/canon",
    title: "The Canon",
    blurb: "The Signal Civilization lore — the doctrines, the 404, the city's story.",
    keywords: ["lore", "canon", "the story", "mythology", "backstory", "the 404", "what happened to the signal", "signal civilization", "who are the freelons", "doctrine", "oracle doctrine", "the fracture", "world building", "the city's history"],
  },
  {
    key: "earn",
    href: "/earn",
    title: "Earn HEX",
    blurb: "How citizens earn ⬡ — jobs, rewards, and the city economy.",
    keywords: ["earn hex", "how do i earn", "make hex", "get hex", "earn ⬡", "rewards", "the economy", "how do i make", "where do i earn"],
  },
  {
    key: "start",
    href: "/help",
    title: "Start Here",
    blurb: "What FREELON CITY is and how to begin — the help guide.",
    keywords: ["how does this work", "what is this", "getting started", "new here", "i'm new", "im new", "beginner", "how do i start", "explain freelon", "what do i do", "how do i unlock", "how to unlock", "activate", "awaken", "how do i train", "level up", "how training works"],
  },
  {
    key: "citizens",
    href: "/citizens",
    title: "Browse Citizens",
    blurb: "Choose a FREELON to create with — the full collection.",
    keywords: ["browse", "choose a citizen", "pick a character", "see characters", "find a citizen", "other citizens", "all citizens", "the collection", "show me citizens", "browse characters"],
  },
  {
    key: "transmissions",
    href: "/transmissions",
    title: "City Archive",
    blurb: "The live wall of what citizens have created.",
    keywords: ["the archive", "transmissions", "what have people made", "the city wall", "what others made", "the feed", "see creations", "what people created"],
  },
  {
    key: "proof",
    href: "/proof",
    title: "Proof",
    blurb: "Why only your FREELON can render your character.",
    keywords: ["the proof", "why freelon", "what makes this different", "vs chatgpt", "vs gpt", "why is this special", "why not just chatgpt"],
  },
  {
    key: "report",
    href: "/report",
    title: "The Signal Report",
    blurb: "This week in the city — the winning civilization and its most notable citizens.",
    keywords: ["the report", "signal report", "weekly report", "city report", "who won", "winning civilization", "who's winning", "this week in the city", "the week in the city"],
  },
  {
    key: "dashboard",
    href: "/dashboard",
    title: "City Pulse",
    blurb: "Live city stats — floor, supply, activity.",
    keywords: ["the dashboard", "city stats", "floor price", "city pulse", "the floor", "supply stats", "collection stats"],
  },
  {
    key: "wallet",
    href: "/wallet",
    title: "Your Characters",
    blurb: "Every FREELON you own, in one place.",
    keywords: ["my characters", "my freelons", "my collection", "what do i own", "my wallet", "my citizens", "characters i own", "the ones i own"],
  },
  {
    key: "connect",
    href: "/sync",
    title: "Connect",
    blurb: "Connect your wallet to unlock your characters.",
    keywords: ["connect", "how do i connect", "sync my wallet", "log in", "sign in", "link my wallet", "connect wallet"],
  },
];

/**
 * Score each destination by how many of its trigger phrases appear in the
 * message, weighting longer (more specific) phrases higher so "the dashboard"
 * beats a stray common word. Returns the top `max` matches (score > 0).
 */
export function resolveCityDestinations(text: string, max = 2): CityLink[] {
  const t = ` ${text.toLowerCase()} `;
  const scored = CITY_DESTINATIONS.map((d) => {
    let score = 0;
    for (const kw of d.keywords) {
      if (t.includes(kw)) score += Math.max(1, Math.round(kw.length / 6));
    }
    return { d, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
  return scored.map(({ d }) => ({ key: d.key, href: d.href, title: d.title, blurb: d.blurb }));
}

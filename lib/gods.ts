/**
 * The 10 Gods of the Crypt Trading Cards collection.
 *
 * Source of truth:
 *   - On-chain: contract 0x48fd513c9f8ca591ffada7223a261ffc6e797394
 *   - Local: /Users/billy/crypt-game/opensea_crypttradingcards_full.json
 *     confirmed each god is a 1/1 with trait `Faction: Gods`
 *
 * The civilization mapping IS NOT on-chain. It was decided here,
 * 2026-05-25, by matching each god's mythic domain to the civilization
 * doctrine in lib/constants.ts. Brief rule: the world should feel
 * architected, not random; reveal sparingly.
 *
 * Mapping rationale (one line each):
 *   Anubis     · death + judgement + threshold     → BLACK FRACTURE (identity through absence)
 *   Aphrodite  · beauty + desire + courtly         → PINK LUXURY (the courtly)
 *   Anunnaki   · ancient sky-rulers                → GOLD SOVEREIGNTY (the hex is a crown)
 *   Hades      · underworld                        → VOID 404 (lost protocols, the mythic)
 *   Loki       · trickster + corrupter             → RED CORRUPTION (burn the noise)
 *   Odin       · wisdom + runes + all-seeing       → PURPLE ORACLE (read between)
 *   Poseidon   · seas + fertility                  → GREEN GROWTH (the body remembers)
 *   Thor       · hammer + force + defender         → BLUE SYNTHESIS (foundation, network defender)
 *   Vishnu     · preserver + the carrier           → WHITE TRANSMISSION (we carry, we deliver)
 *   Zeus       · sky-law + sovereign rule          → SILVER MACHINE (cold optimization, the rule-maker)
 *
 * These pairings carry across /civilizations, /civilizations/[slug],
 * /combat-archives, and /archive — the 10×10 structural connection
 * the brief asked for.
 */

import type { CivilizationSlug } from "@/lib/constants";

export const CRYPT_CONTRACT = "0x48fd513c9f8ca591ffada7223a261ffc6e797394";

export type God = {
  name: string;
  tokenId: number;
  /** Civilization the god is tied to. One per god, one god per civ. */
  civ: CivilizationSlug;
  /** Mythic domain — terse, surfaces in tooltips + the Combat Archives reveal. */
  domain: string;
  /** Lore line — terse, sci-fi mythology tone. */
  line: string;
  /** Status pill for the Combat Archives reveal grid. */
  status: "RECOVERED" | "SEALED" | "FRAGMENT" | "DECAYING";
  /**
   * Real on-chain relic art (the 1/1 card) from the Crypt Trading Cards
   * collection, served off OpenSea's seadn.io CDN. Source of truth:
   * lib/crypt-engine/data/generatedTcgCards.json, keyed by tokenId.
   * Lets /combat-archives show the actual commander art instead of a
   * text-only name grid.
   */
  image: string;
};

/**
 * Order is intentional: lowest token id first. The reveal order on
 * /combat-archives follows this.
 */
export const GODS: God[] = [
  {
    name: "Anubis",
    tokenId: 1519,
    civ: "black-fracture",
    domain: "death · judgement · threshold",
    line: "He weighs what was never named. The Fracture answers to his scales.",
    status: "RECOVERED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/7b5c6c2b8cdeda3ae4238574005ea0/867b5c6c2b8cdeda3ae4238574005ea0.jpeg",
  },
  {
    name: "Hades",
    tokenId: 1535,
    civ: "void-404",
    domain: "underworld · lost protocols",
    line: "The signal that does not return. The 404 is his kingdom.",
    status: "SEALED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/c8a4f00e1890c8d4978c91c9295193/aac8a4f00e1890c8d4978c91c9295193.jpeg",
  },
  {
    name: "Vishnu",
    tokenId: 3500,
    civ: "white-transmission",
    domain: "preservation · the carrier",
    line: "He carries the signal across every collapse. Transmission is his vow.",
    status: "RECOVERED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/0cb885c8689786ddbde0b51d4d9d51/df0cb885c8689786ddbde0b51d4d9d51.jpeg",
  },
  {
    name: "Loki",
    tokenId: 4326,
    civ: "red-corruption",
    domain: "trickster · corrupter · shape-shift",
    line: "He rewrites what the city remembers. Corruption is not chaos — it is choice.",
    status: "FRAGMENT",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/27d7b39a2f9eb369cbaf8a7c471049/f027d7b39a2f9eb369cbaf8a7c471049.jpeg",
  },
  {
    name: "Aphrodite",
    tokenId: 4650,
    civ: "pink-luxury",
    domain: "beauty · desire · courtly love",
    line: "The throne is watched. She decides who is seen and who is not.",
    status: "RECOVERED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/695a651c066895a321fd87a6274757/99695a651c066895a321fd87a6274757.jpeg",
  },
  {
    name: "Zeus",
    tokenId: 5181,
    civ: "silver-machine",
    domain: "sky-law · sovereign rule",
    line: "He does not negotiate. The Machine compiles his decrees in silence.",
    status: "SEALED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/3fdf9d68866c80225972dadcafa34f/a73fdf9d68866c80225972dadcafa34f.jpeg",
  },
  {
    name: "Poseidon",
    tokenId: 5391,
    civ: "green-growth",
    domain: "seas · fertility · the rising tide",
    line: "From his depths the body learned to listen. Growth is his patience.",
    status: "DECAYING",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/408979ea37a542efb3ec7617c23731/ad408979ea37a542efb3ec7617c23731.jpeg",
  },
  {
    name: "Odin",
    tokenId: 6664,
    civ: "purple-oracle",
    domain: "wisdom · runes · all-seeing",
    line: "He gave an eye for the signal. The Oracle inherited what he saw.",
    status: "FRAGMENT",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/4d0865ccaed080e56c0b80fea9afde/424d0865ccaed080e56c0b80fea9afde.jpeg",
  },
  {
    name: "Thor",
    tokenId: 6665,
    civ: "blue-synthesis",
    domain: "hammer · force · the defender",
    line: "The network does not break while he stands. Synthesis is his hammer.",
    status: "RECOVERED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/e7eed0b4b65121096b02bcde9ebd48/dde7eed0b4b65121096b02bcde9ebd48.jpeg",
  },
  {
    name: "Anunnaki",
    tokenId: 6666,
    civ: "gold-sovereignty",
    domain: "ancient sky-rulers · the crown",
    line: "They were here before the hex was named. The crown is their oldest record.",
    status: "SEALED",
    image: "https://i2c.seadn.io/ethereum/0x48fd513c9f8ca591ffada7223a261ffc6e797394/4963aedb57d73739dba23bad491adb/b54963aedb57d73739dba23bad491adb.jpeg",
  },
];

/** Lookup: civ → god (single source). */
export function godForCiv(slug: CivilizationSlug | string): God | null {
  return GODS.find((g) => g.civ === slug) ?? null;
}

/** Lookup: god name → god. Case-insensitive. */
export function godByName(name: string): God | null {
  const n = name.toLowerCase();
  return GODS.find((g) => g.name.toLowerCase() === n) ?? null;
}

/** OpenSea token URL for the gods reveal grid. */
export function godOpenSeaUrl(god: God): string {
  return `https://opensea.io/assets/ethereum/${CRYPT_CONTRACT}/${god.tokenId}`;
}

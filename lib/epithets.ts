// Deterministic epithet generator for the 4001 procedural citizens.
// Built from a caste x civilization template grid so every procedural citizen
// gets a mythic one-line name without writing 4001 unique strings.
//
// Usage: epithetFor(citizen) returns a string (or null if the citizen
// already has an honoree or transmission_name and should not be epitheted).

import type { Citizen } from "./citizens";

// Civ-flavored noun pools — short, mythic, evocative.
// Keys must match CIVILIZATIONS slugs in lib/constants.ts.
const CIV_NOUN: Record<string, string> = {
  "blue-synthesis":     "Mesh",
  "red-corruption":     "Ember",
  "green-growth":       "Bloom",
  "purple-oracle":      "Sigil",
  "white-transmission": "Liturgy",
  "pink-luxury":        "Salon",
  "black-fracture":     "Shadow Grid",
  "gold-sovereignty":   "Crown",
  "void-404":           "Hollow",
  "silver-machine":     "Lattice",
};

// Civ-flavored adjectives — paired with caste templates below.
const CIV_ADJ: Record<string, string> = {
  "blue-synthesis":     "Synthesized",
  "red-corruption":     "Ember",
  "green-growth":       "Verdant",
  "purple-oracle":      "Veiled",
  "white-transmission": "Carried",
  "pink-luxury":        "Gilded",
  "black-fracture":     "Unseen",
  "gold-sovereignty":   "Crowned",
  "void-404":           "Vanished",
  "silver-machine":     "Determined",
};

// Caste templates: each returns the epithet body given the civ's adj + noun.
// Keys must match CASTES in lib/constants.ts.
const CASTE_TEMPLATE: Record<string, (adj: string, noun: string) => string> = {
  "SIGNAL BORN":     (adj, noun) => `Listener of the ${adj} ${noun}`,
  "DUST RUNNER":     (adj, noun) => `Courier of the ${adj} ${noun}`,
  "CHOIR OF STATIC": (adj, noun) => `Voice in the ${adj} ${noun}`,
  "ARCHITECT":       (adj, noun) => `Builder of the ${adj} ${noun}`,
  "VOID KNIGHT":     (adj, noun) => `Sentinel of the ${adj} ${noun}`,
  "SYNTH ASCENDED":  (adj, noun) => `Hybrid of the ${adj} ${noun}`,
  "THE THRONE":      (adj, noun) => `Marker of the ${adj} ${noun}`,
};

// A second template variant per caste, selected deterministically by id parity
// so neighbours don't read identically.
const CASTE_TEMPLATE_ALT: Record<string, (adj: string, noun: string) => string> = {
  "SIGNAL BORN":     (adj, noun) => `${adj} Receiver of the ${noun}`,
  "DUST RUNNER":     (adj, noun) => `${adj} Walker of the ${noun}`,
  "CHOIR OF STATIC": (adj, noun) => `${adj} Echo of the ${noun}`,
  "ARCHITECT":       (adj, noun) => `${adj} Engineer of the ${noun}`,
  "VOID KNIGHT":     (adj, noun) => `${adj} Guard of the ${noun}`,
  "SYNTH ASCENDED":  (adj, noun) => `${adj} Vessel of the ${noun}`,
  "THE THRONE":      (adj, noun) => `${adj} Seat of the ${noun}`,
};

/**
 * Generate an epithet for a procedural citizen.
 * Returns null for citizens that already carry an honoree or transmission_name.
 */
export function epithetFor(citizen: Citizen): string | null {
  if (!citizen) return null;
  // Skip named tiers entirely — they own their own name.
  if (citizen.tier === "One of One") return null;
  if (citizen.tier === "Honorary") return null;
  if (citizen.transmission_name) return null;
  if (citizen.honoree) return null;

  const adj = CIV_ADJ[citizen.civilization] ?? "Sealed";
  const noun = CIV_NOUN[citizen.civilization] ?? "City";

  const primary = CASTE_TEMPLATE[citizen.caste];
  const alt = CASTE_TEMPLATE_ALT[citizen.caste];
  if (!primary || !alt) return null;

  // Deterministic: even id → primary, odd id → alt.
  const fn = citizen.id % 2 === 0 ? primary : alt;
  return fn(adj, noun);
}

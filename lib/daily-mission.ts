/**
 * Daily Mission — deterministic per-UTC-day mission picker.
 *
 * Index = floor(Date.now()/86400000) % 10. One mission per civilization.
 * Completing the mission credits +5 ⬡ via /api/mission/claim.
 */

import { CIVILIZATIONS, type CivilizationSlug } from "@/lib/constants";

export type Mission = {
  id: string;          // e.g. "visit:blue-synthesis"
  kicker: string;      // "TODAY'S MISSION · ⬡"
  title: string;       // "Visit the Blue Synthesis."
  description: string; // "Find the doctrine page and read its essence."
  reward: number;      // 5
  href: string;        // "/civilizations/blue-synthesis"
  cta: string;         // "VISIT BLUE SYNTHESIS →"
  civ: CivilizationSlug;
};

// Ordered list of civilization slugs — one mission per civ.
// Order matches the CIVILIZATIONS map declaration so the rotation feels logical.
const MISSION_CIVS: CivilizationSlug[] = [
  "blue-synthesis",
  "red-corruption",
  "green-growth",
  "purple-oracle",
  "white-transmission",
  "pink-luxury",
  "black-fracture",
  "gold-sovereignty",
  "void-404",
  "silver-machine",
];

const MISSION_DESCRIPTIONS: Record<CivilizationSlug, string> = {
  "blue-synthesis":     "Find the doctrine page and read its essence.",
  "red-corruption":     "Walk the corrupted hex. Witness the rust.",
  "green-growth":       "Where signal lands, life answers. Go see.",
  "purple-oracle":      "Read between the transmissions. The Oracle waits.",
  "white-transmission": "The androids carry the signal. Receive it.",
  "pink-luxury":        "The city wears the signal. Visit the court.",
  "black-fracture":     "Some doctrines win in silence. Find theirs.",
  "gold-sovereignty":   "The hex turned outward, made permanent. Approach the throne.",
  "void-404":           "The 404 was never an error. Step into the void.",
  "silver-machine":     "Cold optimization. Pure repetition. Witness the machine.",
};

export function dailyMissionIndex(d: Date = new Date()): number {
  return Math.floor(d.getTime() / 86400000) % MISSION_CIVS.length;
}

export function getDailyMission(d: Date = new Date()): Mission {
  const idx = dailyMissionIndex(d);
  const slug = MISSION_CIVS[idx];
  const civ = CIVILIZATIONS[slug];
  const name = civ.name;
  const upper = name.toUpperCase();
  return {
    id: `visit:${slug}`,
    kicker: "TODAY'S MISSION · ⬡",
    title: `Visit the ${name}.`,
    description: MISSION_DESCRIPTIONS[slug],
    reward: 5,
    href: `/civilizations/${slug}`,
    cta: `VISIT ${upper} →`,
    civ: slug,
  };
}

/** UTC day stamp for storage keys (e.g. "2026-05-21"). */
export function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

import citizensData from "@/data/citizens.json";

type Citizen = {
  id: number;
  civilization: string;
  tier: string;
  shape: string;
  caste: string;
  hex_state: string;
  signal_type: string;
  sub_archetype: string;
  aura: string;
};

// Frequency table for each trait, computed once.
const TRAIT_FREQ = (() => {
  const arr = citizensData as Citizen[];
  const fields = [
    "civilization",
    "tier",
    "shape",
    "caste",
    "hex_state",
    "signal_type",
    "sub_archetype",
    "aura",
  ] as const;
  const tally: Record<string, Record<string, number>> = {};
  for (const f of fields) tally[f] = {};
  for (const c of arr) {
    for (const f of fields) {
      const v = String((c as unknown as Record<string, string>)[f] ?? "");
      tally[f][v] = (tally[f][v] || 0) + 1;
    }
  }
  return tally;
})();

function scoreFor(c: Citizen): number {
  // Sum of inverse frequency per trait. Higher score = rarer.
  const fields = [
    "civilization",
    "tier",
    "shape",
    "caste",
    "hex_state",
    "signal_type",
    "sub_archetype",
    "aura",
  ] as const;
  let s = 0;
  for (const f of fields) {
    const v = String((c as unknown as Record<string, string>)[f] ?? "");
    const n = TRAIT_FREQ[f][v] || 1;
    s += 1 / n;
  }
  return s;
}

const RANK_BY_ID = (() => {
  const arr = citizensData as Citizen[];
  const scored = arr.map((c) => ({ id: c.id, score: scoreFor(c) }));
  scored.sort((a, b) => b.score - a.score);
  const out: Record<number, number> = {};
  scored.forEach((row, i) => {
    out[row.id] = i + 1;
  });
  return out;
})();

export function rarityRank(tokenId: number): number | null {
  return RANK_BY_ID[tokenId] ?? null;
}

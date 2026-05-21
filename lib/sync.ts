import { CIVILIZATIONS, CivilizationSlug } from "./constants";
import { getByCivilization } from "./citizens";

// Deterministic hash → civilization assignment based on a normalized handle.
// Same handle always returns the same civilization. Weighted by population
// so the assignment reflects real city distribution.
const POPS = Object.entries(CIVILIZATIONS).map(([slug, c]) => ({ slug: slug as CivilizationSlug, pop: c.population }));
const TOTAL_POP = POPS.reduce((s, x) => s + x.pop, 0);

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function normalizeHandle(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 32);
}

export function syncHandle(handle: string): {
  handle: string;
  civilization: CivilizationSlug;
  caste: string;
  patron: { id: number; name: string; civSlug: string };
  spread: number;
} {
  const h = normalizeHandle(handle);
  const seed = fnv1a("freelon::" + h);
  // Pick civilization by weighted distribution.
  let pick = seed % TOTAL_POP;
  let civilization: CivilizationSlug = POPS[0].slug;
  for (const p of POPS) {
    if (pick < p.pop) { civilization = p.slug; break; }
    pick -= p.pop;
  }
  // Pick caste deterministically from second-stage hash.
  const seed2 = fnv1a(h + "::caste");
  const CASTES = ["SIGNAL BORN", "DUST RUNNER", "CHOIR OF STATIC", "ARCHITECT", "VOID KNIGHT", "SYNTH ASCENDED", "THE THRONE"];
  const CASTE_WEIGHTS = [1677, 1140, 824, 150, 142, 66, 41];
  const totalC = CASTE_WEIGHTS.reduce((s, x) => s + x, 0);
  let pc = seed2 % totalC;
  let caste = CASTES[0];
  for (let i = 0; i < CASTES.length; i++) {
    if (pc < CASTE_WEIGHTS[i]) { caste = CASTES[i]; break; }
    pc -= CASTE_WEIGHTS[i];
  }
  // Pick a patron citizen in that civilization.
  const candidates = getByCivilization(civilization).filter((c) => c.tier !== "Honorary" && c.tier !== "One of One");
  const seed3 = fnv1a(h + "::patron");
  const patron = candidates[seed3 % candidates.length];
  // Spread = how many citizens share this exact civ
  const spread = candidates.length;
  return {
    handle: h,
    civilization,
    caste,
    patron: { id: patron.id, name: patron.transmission_name || `Citizen #${patron.id}`, civSlug: civilization },
    spread,
  };
}

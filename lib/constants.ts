export const CONTRACT = "0xa79e73c9828db3fcd7c77be7d9f356fb684b5504";
export const IMAGE_CID = "bafybeifax6nksc7h7m3duztjbrpy3e4bnyz3k3nj6xqcdleqsnpod622vi";
export const METADATA_CID = "bafybeieqxqqqq5qy2mnjnztbd42bhikeqmsppseeilpqw5yavjl2kzgc7e";
export const TOTAL = 4040;

export const OPENSEA_BASE = `https://opensea.io/assets/ethereum/${CONTRACT}`;
export const ETHERSCAN_BASE = `https://etherscan.io/address/${CONTRACT}`;
export const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export function imageUrl(tokenId: number) {
  return `${IPFS_GATEWAY}/${IMAGE_CID}/${tokenId.toString().padStart(4, "0")}.jpg`;
}

// Fast local mirror for the 4 hero 1-of-1s — avoids IPFS gateway lag for LCP.
// Falls through to the IPFS URL if the tokenId is not in the local set.
const LOCAL_HEROES = new Set([1, 404, 1337, 4040]);
export function heroImageUrl(tokenId: number) {
  if (LOCAL_HEROES.has(tokenId)) {
    return `/heroes/${tokenId.toString().padStart(4, "0")}.webp`;
  }
  return imageUrl(tokenId);
}

export function openseaUrl(tokenId: number) {
  return `${OPENSEA_BASE}/${tokenId}`;
}

export const CIVILIZATIONS = {
  "blue-synthesis":     { name: "Blue Synthesis",   stamp: "BLU.700", doctrine: "Synthesis",    role: "tech monks · network civilization",         population: 700, color: "#4a8acb", bg: "#0c1218", essence: "the foundation",            chant: "WE HEAR. WE SYNC.",          rival: "red-corruption",     rivalLine: "Red is the noise we filter. Without us, the signal becomes screams." },
  "red-corruption":     { name: "Red Corruption",   stamp: "RED.700", doctrine: "Corruption",   role: "military cult · signal enforcers",          population: 700, color: "#c54a3a", bg: "#180a0c", essence: "the counter-force",         chant: "WE BURN THE NOISE.",         rival: "blue-synthesis",     rivalLine: "Blue calls us noise. Blue has never bled for the signal." },
  "green-growth":       { name: "Green Growth",     stamp: "GRN.620", doctrine: "Growth",       role: "bio-engineered · adaptive organisms",       population: 620, color: "#5a9a4a", bg: "#0a1410", essence: "the body remembers the signal", chant: "WE TAKE ROOT.",            rival: "silver-machine",     rivalLine: "Silver is a sterile lie. Only the body can hold a god." },
  "purple-oracle":      { name: "Purple Oracle",    stamp: "PUR.520", doctrine: "Oracle",       role: "psychics · forbidden signal",               population: 520, color: "#8a4ac5", bg: "#120a18", essence: "the forbidden",             chant: "WE READ BETWEEN.",           rival: "white-transmission", rivalLine: "White listens. We answer. There is a difference." },
  "white-transmission": { name: "White Transmission", stamp: "WHT.430", doctrine: "Transmission", role: "androids · sacred synthetic order",       population: 430, color: "#e6e1d2", bg: "#101012", essence: "the divine",                chant: "WE CARRY. WE DELIVER.",      rival: "black-fracture",     rivalLine: "Black inherits absence. We inherit duty." },
  "pink-luxury":        { name: "Pink Luxury",      stamp: "PIN.350", doctrine: "Luxury",       role: "fashion · synthetic beauty",                population: 350, color: "#d97aa0", bg: "#181014", essence: "the courtly",               chant: "WE WEAR THE SIGNAL.",        rival: "gold-sovereignty",   rivalLine: "Gold buys the throne. We are watched on the throne." },
  "black-fracture":     { name: "Black Fracture",   stamp: "BLK.260", doctrine: "Fracture",     role: "stealth · shadow operators",                population: 260, color: "#404045", bg: "#0d0d10", essence: "identity through absence",  chant: "WE WERE NEVER HERE.",        rival: "white-transmission", rivalLine: "White is loud. We win in the silence between transmissions." },
  "gold-sovereignty":   { name: "Gold Sovereignty", stamp: "GLD.200", doctrine: "Sovereignty",  role: "ruling caste · royal elite",                population: 200, color: "#c8aa64", bg: "#1a1408", essence: "the hex is a crown",        chant: "WE DECREE.",                 rival: "pink-luxury",        rivalLine: "Pink performs power. We hold it." },
  "void-404":           { name: "Void 404",         stamp: "VOI.180", doctrine: "Void/404",     role: "signal ghosts · lost protocols",            population: 180, color: "#6a4a8a", bg: "#0c0c14", essence: "the mythic",                chant: "WE RETURN UNNAMED.",         rival: "blue-synthesis",     rivalLine: "Blue networks the living. We network the absent." },
  "silver-machine":     { name: "Silver Machine",   stamp: "SIL.080", doctrine: "Machine",      role: "pure machine civilization",                 population: 80,  color: "#b0b4be", bg: "#0f1114", essence: "cold optimization",         chant: "WE COMPUTE.",                rival: "green-growth",       rivalLine: "Green decomposes. We persist." },
} as const;

export const CASTES = {
  "SIGNAL BORN":     { count: 1677, role: "mystics · signal receivers · the most numerous" },
  "DUST RUNNER":     { count: 1140, role: "civilians of the outer city · working class" },
  "CHOIR OF STATIC": { count: 824,  role: "signal-corrupted casualties" },
  "ARCHITECT":       { count: 150,  role: "sacred engineers · builders of transmission systems" },
  "VOID KNIGHT":     { count: 142,  role: "military protectors" },
  "SYNTH ASCENDED":  { count: 66,   role: "human-machine hybrids" },
  "THE THRONE":      { count: 41,   role: "ruling elite" },
} as const;

export const SHAPES = {
  "Geometric Hood Main":    { count: 800, tier: "Common", lore: "the canonical Freelon silhouette · the baseline citizen" },
  "Geometric Hood Variant": { count: 600, tier: "Common · Uncommon", lore: "the aggressive variant · deeper hood angles" },
  "Lumen":                  { count: 500, tier: "Common · Uncommon", lore: "the arrow-tip ceremonial form · candle-citizen" },
  "Mask":                   { count: 350, tier: "Uncommon · Rare", lore: "separate ceremonial mask covering the face" },
  "Chained":                { count: 300, tier: "Uncommon · Rare", lore: "hex-chain veils hanging from the hood" },
  "Archon":                 { count: 280, tier: "Uncommon · Rare", lore: "full hex-mesh tessellation across the face" },
  "Veil":                   { count: 250, tier: "Uncommon · Rare", lore: "translucent geometric veil over the face" },
  "Crown-Bearer":           { count: 220, tier: "Rare · Epic", lore: "structural geometric crown atop the hood" },
  "Horned":                 { count: 180, tier: "Rare · Epic", lore: "hex-shaped horns rising from the crown" },
  "Halo":                   { count: 160, tier: "Rare · Epic", lore: "round seamless face · glowing void framed by gold" },
  "Monolith":               { count: 130, tier: "Epic · Legendary", lore: "tall pyramidal hood · no face · vertical hex line" },
  "Split":                  { count: 100, tier: "Epic", lore: "cathedral-spire helm with plague-mask cheek piece" },
  "Antenna":                { count: 80,  tier: "Epic", lore: "multiple gold transmission antennae rising vertical" },
  "Prism":                  { count: 50,  tier: "Legendary", lore: "angular sword-shape head · single glow strip" },
  "Shard":                  { count: 30,  tier: "Legendary", lore: "pure pointed cone helm · brutalist warrior monolith" },
  "Sanctum":                { count: 10,  tier: "Legendary", lore: "high pointed gothic arch · cathedral citizen · rarest shape" },
} as const;

export type CivilizationSlug = keyof typeof CIVILIZATIONS;
export type CasteName = keyof typeof CASTES;
export type ShapeName = keyof typeof SHAPES;

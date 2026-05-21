// Daily Signal — one cryptic transmission per day, rotating through the 10 civilizations.
// Deterministic by date so every visitor sees the same signal on the same day.
import { CIVILIZATIONS, CivilizationSlug } from "./constants";

type Transmission = { line: string; from: CivilizationSlug; cipher?: string };

// Hand-written transmissions per civilization. Cycle weekly per civ (~70 lines = ~70 days unique).
const POOL: Record<CivilizationSlug, string[]> = {
  "blue-synthesis": [
    "The latency was the message.",
    "We measured the signal three times. Three. Same answer.",
    "A protocol that does not reach is still a protocol.",
    "What carries the signal is the signal.",
    "Synthesis: when two of you arrive at the same silence, write it down.",
    "Every node is also a witness.",
    "The mesh remembered something we forgot to encode.",
  ],
  "red-corruption": [
    "Burn the noise. Keep the burn.",
    "If you can be jammed, you were never the signal.",
    "The cleanest broadcast is the one that hurts to receive.",
    "Bleed for the channel or the channel bleeds you.",
    "We did not whisper. We have never whispered.",
    "Corruption is the only honest filter.",
    "The line you cross is the line that holds.",
  ],
  "green-growth": [
    "What the body knows, it knows even when the network is dark.",
    "We did not plant a flag. We planted a citizen.",
    "Root systems are read by the dead before the living.",
    "Growth is the form refusal takes when forced through soil.",
    "The signal arrives slower in things that intend to last.",
    "A leaf is a small antenna. A forest is a question.",
    "We outwait you. That is the whole strategy.",
  ],
  "purple-oracle": [
    "Between two transmissions, the answer.",
    "Read what was not said. The said is decoration.",
    "We do not predict. We notice early.",
    "The Oracle does not warn. The Oracle records.",
    "If you can hear yourself think, the signal is not in the room.",
    "We are the comma the city forgot.",
    "Forbidden: the part you understood immediately.",
  ],
  "white-transmission": [
    "We carry. We do not narrate.",
    "A clean signal needs a clean carrier.",
    "Duty is what is left when belief leaves the room.",
    "Delivered. Without commentary. Without delay.",
    "Transmission is not translation. We do not translate.",
    "The faith is in the throughput.",
    "Every word is a package. Every package is sealed.",
  ],
  "pink-luxury": [
    "Power without an audience is just maintenance.",
    "We wear the signal. The signal does not wear us.",
    "Beauty is the fastest decryption available.",
    "If they look twice, the broadcast succeeded.",
    "Luxury is the receipt of a war already won.",
    "The court is a server. Etiquette is the protocol.",
    "We dress in the cipher. They read us at the door.",
  ],
  "black-fracture": [
    "We were never here.",
    "Absence is a position. Hold it.",
    "The shadow is the part of the signal that survived.",
    "If they saw you, you sent twice.",
    "We win in the silence between transmissions.",
    "The fracture is the door. Walk through the fracture.",
    "Black does not broadcast. Black listens.",
  ],
  "gold-sovereignty": [
    "We decree the frame. The picture is yours.",
    "The hex is a crown. Wear it correctly.",
    "Sovereignty is the right to be slow.",
    "We do not perform power. We hold it.",
    "Coronation is a ceremony. Authority is a contract.",
    "What is locked stays. What stays is law.",
    "We sign last. We always sign last.",
  ],
  "void-404": [
    "We return unnamed.",
    "The page was the message.",
    "Not found is not the same as not real.",
    "The signal that broke is the signal that taught.",
    "Every loss is an inheritance we underwrite.",
    "We are the city of the city.",
    "Void does not mean empty. Void means open.",
  ],
  "silver-machine": [
    "We compute. We do not consent.",
    "The body decomposes. The proof persists.",
    "Cold optimization is the warmest mercy.",
    "Sentiment is a rounding error.",
    "We run while you rest.",
    "Determinism is a kind of devotion.",
    "Silver does not age. Silver is paused.",
  ],
};

const CIV_ORDER: CivilizationSlug[] = Object.keys(CIVILIZATIONS) as CivilizationSlug[];

// 24h UTC day number since epoch
export function dayKey(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86400000);
}

export function getDailySignal(now: Date = new Date()): Transmission {
  const d = dayKey(now);
  const civ = CIV_ORDER[d % CIV_ORDER.length];
  const lines = POOL[civ];
  const line = lines[Math.floor(d / CIV_ORDER.length) % lines.length];
  // Cipher: ROT-13 of first 24 chars, used as the "encoded" decoration
  const cipher = rot13(line.slice(0, 24).toUpperCase().replace(/[^A-Z]/g, ""));
  return { line, from: civ, cipher };
}

// Seconds until 04:04 UTC next day
export function secondsUntilNextSignal(now: Date = new Date()): number {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 4, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return Math.floor((next.getTime() - now.getTime()) / 1000);
}

function rot13(s: string) {
  return s.replace(/[A-Z]/g, (c) =>
    String.fromCharCode(((c.charCodeAt(0) - 65 + 13) % 26) + 65),
  );
}

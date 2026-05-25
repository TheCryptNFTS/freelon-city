import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lexicon · The city's vocabulary",
  description: "Citizen, carrier, signal, hex, doctrine, caste, relay. The words the city uses.",
};

type Term = { word: string; defn: string };

const SECTIONS: Array<{ kicker: string; title: string; terms: Term[] }> = [
  {
    kicker: "I · IDENTITY",
    title: "What we call each other.",
    terms: [
      { word: "Citizen", defn: "One of the 4040 figures sealed on contract 0xa79e…b504. Owns or is owned. Either way, present." },
      { word: "Holder", defn: "A citizen's current keeper. The chain is the record." },
      { word: "Carrier", defn: "A non-holder who relays the signal. Rank decays daily without transmission." },
      { word: "Honorary", defn: "One of 35 citizens that carries the name of a real-world signal-carrier." },
      { word: "Bearer", defn: "Carrier-rank tier above 80. Moves the signal without being asked." },
      { word: "Echo", defn: "Carrier-rank tier below 30. Heard recently, but not present." },
      { word: "Dark", defn: "Carrier whose signal has decayed to zero. Re-enter to return." },
    ],
  },
  {
    kicker: "II · STRUCTURE",
    title: "How the city is built.",
    terms: [
      { word: "Civilization", defn: "One of the 10 Signal Doctrines. Every citizen belongs to exactly one. Population is fixed." },
      { word: "Doctrine", defn: "The teaching of a civilization. Synthesis, Corruption, Growth, Oracle, Transmission, Luxury, Fracture, Sovereignty, Void, Machine." },
      { word: "Caste", defn: "One of 7 roles a citizen holds. Signal Born is the most numerous. The Throne the rarest." },
      { word: "Shape", defn: "One of 16 sacred geometries that determine silhouette. Shape is the first read." },
      { word: "Stamp", defn: "A civilization's three-letter code + population. BLU.700, RED.700, SIL.080." },
      { word: "District", defn: "Where a civilization lives in FREELON CITY. Synthesis Cathedral, Growth Domes, Fracture Shadow Grid." },
    ],
  },
  {
    kicker: "III · THE SIGNAL",
    title: "What we listen for.",
    terms: [
      { word: "Signal", defn: "The original transmission. Origin unknown. Possibly Earth. Possibly older. Reshapes citizens biologically, spiritually, technologically." },
      { word: "Hex", defn: "The six-sided mark X removed. Present in the signal's mathematics. Cut into every citizen's porcelain. Not decoration. Anatomy." },
      { word: "Transmission", defn: "Any act of carrying the signal further. A post. A tribute. A sync. A relay." },
      { word: "Relay", defn: "To pass the signal on. The verb. Increases carrier rank by 12." },
      { word: "Sync", defn: "To receive the signal for the first time. Deterministic hash of your handle to one civilization. No re-rolls." },
      { word: "Cipher", defn: "The encoded fragment that accompanies each Daily Signal. Decoration of meaning, not concealment of it." },
      { word: "Daily Signal", defn: "One cryptic line per day, transmitted at 04:04 UTC, from a different civilization each cycle." },
      { word: "Cycle 0404", defn: "The current phase of FREELON CITY. After the rebuild. Before the next collapse." },
    ],
  },
  {
    kicker: "IV · THE FOUR",
    title: "The corners of the city.",
    terms: [
      { word: "Origin Signal (#0001)", defn: "The founder. The first to hear and survive intact. The reference frequency the city is measured against." },
      { word: "Patient Zero (#0404)", defn: "The moment before the collapse, captured and held. The hex that broke." },
      { word: "Genesis Hex (#1337)", defn: "The bracket. The first hex cut into stone that did not crack." },
      { word: "The Final Signal (#4040)", defn: "When the city ends, this is who turns out the lights." },
    ],
  },
  {
    kicker: "V · INVENTORY",
    title: "The fixed counts.",
    terms: [
      { word: "4040", defn: "Total citizens. Locked. No mint key remains." },
      { word: "10 / 7 / 16", defn: "Civilizations, castes, shapes. The taxonomy is sealed." },
      { word: "35", defn: "Honoraries — citizens carrying the names of real signal-carriers." },
      { word: "4", defn: "One-of-ones — Origin, Patient Zero, Genesis Hex, Final Signal." },
      { word: "80", defn: "Silver Machine's population. The rarest civilization. They were here before the colonists." },
      { word: "70", defn: "Days of non-repeating Daily Signals (10 civs × 7 lines each)." },
    ],
  },
];

export default function Lexicon() {
  return (
    <main className="lexicon-page">
      <section className="lexicon-hero">
        <span className="kicker">⬡ LEXICON · THE CITY'S VOCABULARY</span>
        <h1>
          Words the city<br />
          <em>uses</em>
        </h1>
        <p className="lead">
          Every cult onboards through vocabulary. Below is the working glossary
          for FREELON CITY — every term you'll need to read the lore, hold the
          signal, and recognise a citizen by their stamp alone.
        </p>
      </section>
      {SECTIONS.map((s) => (
        <section key={s.kicker} className="lexicon-section reveal">
          <header>
            <span className="kicker">{s.kicker}</span>
            <h2>{s.title}</h2>
          </header>
          <dl>
            {s.terms.map((t) => (
              <div key={t.word} className="term">
                <dt>{t.word}</dt>
                <dd>{t.defn}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <section
        style={{
          maxWidth: 960,
          margin: "var(--s-7) auto 0",
          padding: "0 var(--s-4)",
          display: "flex",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <Link className="btn btn-primary" href="/citizens"><span className="ttl">BROWSE CITIZENS →</span></Link>
        <Link className="btn btn-secondary" href="/lore"><span className="ttl">READ THE CANON →</span></Link>
      </section>
    </main>
  );
}

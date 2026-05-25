import type { Metadata } from "next";
import Link from "next/link";
import { CONTRACT, IMAGE_CID, METADATA_CID, imageUrl } from "@/lib/constants";

export const metadata: Metadata = {
  title: "The Art System",
  description: "How 4040 citizens are generated from 16 sacred shapes, 10 civilizations, and 7 castes — locked on-chain.",
};

const SECTIONS = [
  {
    h: "01",
    t: "THE SHAPE SYSTEM",
    body:
      "16 sacred shapes form the base of every citizen. Hood, Crown, Spire, Veil, Cipher, Wing, Hex, Pyramid, Orb, Mask, Halo, Ring, Tablet, Sigil, Throne, Echo. Each citizen is built from one primary shape and one secondary modifier. Rarity is a function of which shapes combine, weighted by population.",
  },
  {
    h: "02",
    t: "THE TEN CIVILIZATIONS",
    body:
      "Every citizen belongs to one of ten signal doctrines. Civilization is set on-chain at mint and determines color, caste eligibility, and in-city earning bonuses. The doctrines: synthesis, corruption, growth, oracle, transmission, fracture, sovereignty, void, luxury, machine.",
  },
  {
    h: "03",
    t: "THE SEVEN CASTES",
    body:
      "Caste determines a citizen's social hierarchy inside the city. Carrier, Architect, Choir, Witness, Throne, Vector, Voice. Population is fixed; rarity is set by the contract.",
  },
  {
    h: "04",
    t: "THE LOCKED METADATA",
    body:
      "The contract is a closed loop. 4040 tokens. No mint function. No metadata update. No admin key call that can change a single trait. The contract at " + CONTRACT.slice(0, 10) + "…" + CONTRACT.slice(-6) + " is the canonical source of every citizen's identity. What we render is a faithful read of what is already on-chain. Image CID: " + IMAGE_CID.slice(0, 14) + "… Metadata CID: " + METADATA_CID.slice(0, 14) + "… Both sealed.",
  },
  {
    h: "05",
    t: "THE ART RENDERING",
    body:
      "Each citizen image is composed from layered SVG components driven by the on-chain traits. The composition runs deterministically — same traits, same image, every time, forever. The 35 honorary citizens carry hand-detailed art. The four 1-of-1 transmissions are unique.",
  },
  {
    h: "06",
    t: "THE ON-SITE ECONOMY",
    body:
      "Hex is the city's internal credit. Active carriers earn it — by sniping red signals, sweeping the floor, posting daily, and selling into liquidity. Passive holding earns a small baseline that pauses if you go 14 days without an active move. Tithes burn hex onto the patrons wall for 7 days. All recorded by the city, not the contract.",
  },
];

export default function RebuildPage() {
  return (
    <main className="rebuild" style={{ backgroundImage: "linear-gradient(180deg, rgba(10,12,18,0.6) 0%, rgba(10,12,18,0.94) 65%, var(--bg) 100%), url(/atmos/rebuild.webp)", backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" }}>
      <section className="rebuild-hero">
        <span className="kicker">⬡ THE CITY&apos;S ARCHITECTURE</span>
        <h1>
          <em>4040 citizens</em><br />
          Locked metadata<br />
          Generative art
        </h1>
        <p className="lead">
          The art is a generative system over 16 sacred shapes, 10 civilizations, 7 castes, and a single immutable contract. Here is how it works.
        </p>
      </section>
      <section className="timeline">
        {SECTIONS.map((p, i) => (
          <article key={i} className="phase">
            <div className="hh">{p.h}</div>
            <div className="body">
              <h2>{p.t}</h2>
              <p>{p.body}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="rebuild-proof">
        <span className="kicker">THE CITY</span>
        <h2>Four citizens, four readings of the system</h2>
        <div className="proof-grid">
          {[1, 404, 1337, 4040].map((id) => (
            <Link key={id} href={`/citizens/${id}`} className="proof-cell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(id)} alt={`#${id}`} />
              <div className="id">#{id.toString().padStart(4, "0")}</div>
            </Link>
          ))}
        </div>
      </section>
      <section className="rebuild-cta">
        <span className="kicker">NEXT SIGNAL</span>
        <Link className="btn btn-primary" href="/civilizations"><span className="ttl">EXPLORE THE CIVILIZATIONS →</span></Link>
        <Link className="btn btn-secondary" href="/lore"><span className="ttl">READ THE LORE →</span></Link>
        <a className="btn btn-secondary" href={`https://opensea.io/assets/ethereum/${CONTRACT}`} target="_blank" rel="noopener noreferrer"><span className="ttl">GET A FREELON ↗</span></a>
      </section>
    </main>
  );
}

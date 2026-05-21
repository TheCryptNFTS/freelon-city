import type { Metadata } from "next";
import Link from "next/link";
import { CONTRACT, IMAGE_CID, METADATA_CID, imageUrl } from "@/lib/constants";

export const metadata: Metadata = {
  title: "The Rebuild · 48 hours · FREELON CITY",
  description: "How 4040 citizens were rebuilt without changing a single trait. The war story.",
};

const PHASES = [
  {
    h: "00:00",
    t: "THE COLLAPSE",
    body:
      "Phase 2 art was HTML+SVG. It rendered. It was correct. It was also flat — every citizen looked like a logo, not a person. The collection had locked metadata on-chain and 4040 holders. Nothing about the city could change. Except the art.",
  },
  {
    h: "06:00",
    t: "THE CHOICE",
    body:
      "Three options: (1) ship as-is and lose, (2) regenerate from scratch and break trait rarity, (3) edit each citizen against a reference anchor and preserve trait distributions to the byte. We chose 3.",
  },
  {
    h: "12:00",
    t: "THE PIPELINE",
    body:
      "OpenAI gpt-image-1.5 medium via images.edit() with a per-civilization reference image. Each token gets a 75–150 word visual-noun prompt seeded from on-chain traits. 9 batches of ≈ 500 images. Batch API for the 50% discount.",
  },
  {
    h: "20:00",
    t: "THE HEROES",
    body:
      "Four 1/1s and 35 honoraries were hand-iterated. Vitalik got a tetrahedron crown. punk6529 got a voxel cube. Origin Signal is the founder myth. Patient Zero is the moment before collapse. Genesis Hex is the bracket. Final Signal is the one who turns out the lights.",
  },
  {
    h: "32:00",
    t: "THE PIN",
    body:
      "All 4040 images pinned to Pinata IPFS. Image CID: " + IMAGE_CID.slice(0, 14) + "… Metadata CID: " + METADATA_CID.slice(0, 14) + "… Both sealed.",
  },
  {
    h: "44:00",
    t: "THE CALL",
    body:
      "One transaction. setBaseURI on " + CONTRACT.slice(0, 10) + "…" + CONTRACT.slice(-6) + ". Zero metadata changes. Zero trait rewrites. Every rarity preserved exactly.",
  },
  {
    h: "48:00",
    t: "THE CITY",
    body:
      "4040 citizens woke up. None of them moved. All of them changed face. The signal didn't die. It moved.",
  },
];

export default function RebuildPage() {
  return (
    <main className="rebuild" style={{ backgroundImage: "linear-gradient(180deg, rgba(10,12,18,0.6) 0%, rgba(10,12,18,0.94) 65%, var(--bg) 100%), url(/atmos/rebuild.webp)", backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" }}>
      <section className="rebuild-hero">
        <span className="kicker">⬡ WAR STORY · PHASE 3 SHIP LOG</span>
        <h1>
          48 hours.<br />
          <em>4040 citizens.</em><br />
          Zero traits changed.
        </h1>
        <p className="lead">
          The art rebuild that didn&apos;t touch the contract. A timeline.
        </p>
      </section>
      <section className="timeline">
        {PHASES.map((p, i) => (
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
        <span className="kicker">PROOF</span>
        <h2>The city, after.</h2>
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
        <Link className="btn btn-gold" href="/citizens"><span className="ttl">BROWSE ALL 4040 →</span></Link>
        <Link className="btn" href="/manifesto"><span className="ttl">READ THE MANIFESTO →</span></Link>
      </section>
    </main>
  );
}

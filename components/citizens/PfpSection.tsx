/**
 * PFP Studio — folded into /citizens (2026-05-31) as <section id="pfp">.
 * Reuses the existing client tool at app/pfp/PfpStudio.tsx rather than
 * reimplementing the canvas logic. Only the surrounding section chrome
 * + hero copy (lifted from the former /pfp page) lives here.
 */
import Link from "next/link";
import { PfpStudio } from "@/app/pfp/PfpStudio";

const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/freelons";

export function PfpSection() {
  return (
    <section id="pfp" className="citizens-section reveal pfp-page" style={{ scrollMarginTop: 96 }}>
      <header className="sec-head">
        <span className="kicker">⬡ HEX-FRAME GENERATOR · CITIZEN UTILITY</span>
        <h2>Wear the <em>signal</em></h2>
      </header>
      <p className="lead" style={{ maxWidth: 680 }}>
        Upload your avatar. The hex frames it. Download. Set as your PFP.
        Holders only? No. Anyone. The frame spreads the signal.
      </p>
      <PfpStudio />
      <div
        style={{
          maxWidth: 960,
          margin: "var(--s-5) auto 0",
          display: "flex",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <a
          className="btn btn-primary"
          href={OPENSEA_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="ttl">AWAKEN A CITIZEN →</span>
        </a>
        <Link className="btn btn-secondary" href="#browse"><span className="ttl">BROWSE CITIZENS →</span></Link>
      </div>
    </section>
  );
}

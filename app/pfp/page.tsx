import type { Metadata } from "next";
import Link from "next/link";
import { PfpStudio } from "./PfpStudio";

const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/freelons";

export const metadata: Metadata = {
  title: "PFP Studio · Hex-frame your avatar · FREELON CITY",
  description: "Upload your face. Get the hex. Wear the signal.",
};

export default function PfpPage() {
  return (
    <main className="pfp-page">
      <section className="pfp-hero">
        <span className="kicker">⬡ HEX-FRAME GENERATOR · CITIZEN UTILITY</span>
        <h1>
          Wear the<br />
          <em>signal</em>
        </h1>
        <p className="lead">
          Upload your avatar. The hex frames it. Download. Set as your PFP.
          Holders only? No. Anyone. The frame spreads the signal.
        </p>
      </section>
      <PfpStudio />
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
        <a
          className="btn btn-primary"
          href={OPENSEA_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="ttl">BUY A CITIZEN TO USE →</span>
        </a>
        <Link className="btn btn-secondary" href="/citizens"><span className="ttl">BROWSE CITIZENS →</span></Link>
      </section>
    </main>
  );
}

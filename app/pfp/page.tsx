import type { Metadata } from "next";
import { PfpStudio } from "./PfpStudio";

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
          <em>signal.</em>
        </h1>
        <p className="lead">
          Upload your avatar. The hex frames it. Download. Set as your PFP.
          Holders only? No. Anyone. The frame spreads the signal.
        </p>
      </section>
      <PfpStudio />
    </main>
  );
}

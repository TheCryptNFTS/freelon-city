import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal · FREELON CITY",
  description: "Terms, Privacy, DMCA, and contact for FREELON CITY.",
};

export default function LegalIndex() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <span className="kicker">⬡ LEGAL · DOCUMENTS</span>
        <h1>The <em>paperwork</em></h1>
        <p className="lead">
          FREELON CITY is a 4040-citizen art collection sealed on Ethereum
          contract <code>0xa79e…b504</code>. The contract is immutable; the
          documents below govern this website and its services.
        </p>
      </section>
      <section className="legal-list">
        <Link href="/legal/terms" className="legal-row">
          <h3>Terms of Use</h3>
          <p>The rules for using this site, the PFP Studio, the Carrier system, and the Daily Signal.</p>
          <span className="arrow">→</span>
        </Link>
        <Link href="/legal/privacy" className="legal-row">
          <h3>Privacy</h3>
          <p>What we store (almost nothing), what we don&apos;t (almost everything), and how to contact us about it.</p>
          <span className="arrow">→</span>
        </Link>
        <Link href="/legal/honorary-notice" className="legal-row">
          <h3>Honorary Notice</h3>
          <p>Citizens named after real people. How to be removed, corrected, or formally honored.</p>
          <span className="arrow">→</span>
        </Link>
        <Link href="/legal/dmca" className="legal-row">
          <h3>DMCA + Contact</h3>
          <p>Reporting infringement, contacting the project, and our response timeline.</p>
          <span className="arrow">→</span>
        </Link>
      </section>
    </main>
  );
}

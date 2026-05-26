import type { Metadata } from "next";
import Link from "next/link";
import { ShopGrid } from "./ShopGrid";
import { CATEGORIES, ITEMS, itemsByCategory } from "@/lib/shop";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "Physical artefacts from FREELON CITY. Carrier garments, sealed objects, and archive fragments.";
export const metadata: Metadata = {
  title: "Shop · Artefacts of the Archive",
  description: PAGE_DESC,
  openGraph: {
    title: "Shop · Artefacts of the Archive",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop · Artefacts of the Archive",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

export default function ShopPage() {
  const totals: Record<string, number> = {};
  for (const c of CATEGORIES) totals[c] = itemsByCategory(c).length;

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <span className="kicker">⬡ HEX SHOP · OFF-CHAIN INVENTORY</span>
        <h1>
          Spend the signal<br />
          <em>Own a piece of the city</em>
        </h1>
        <p className="lead">
          Property, land, ceremonial arms, woven cloth, the rarest artifacts of the broken signal.
          Pay in <strong>⬡ hex</strong>. Supply finite where the lore demands.
        </p>
      </section>

      <div className="shop-totals" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: "var(--s-5)", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-dim)" }}>
        <span>{ITEMS.length} ITEMS</span>
        {CATEGORIES.map((c) => (
          <span key={c}>
            {c} · {totals[c]}
          </span>
        ))}
      </div>

      <ShopGrid />

      <section style={{ marginTop: "var(--s-6)", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/earn"><span className="ttl">THE LEDGER →</span></Link>
          <Link className="btn btn-secondary" href="/leaderboard"><span className="ttl">THE LEADERBOARD →</span></Link>
          <Link className="btn btn-secondary" href="/patrons"><span className="ttl">THE PATRONS WALL →</span></Link>
        </div>
      </section>
    </div>
  );
}

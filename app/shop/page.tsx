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
    /* Archival visual pass 2026-05-26: .home-page wrapper triggers the
       scoped archival system (textures, void bg, ash panels). All
       existing .shop-page + ShopGrid styles + buy logic are preserved
       — the override is hero + CTAs only. */
    <div className="home-page shop-page">
      <section className="shop-hero">
        {/* Audit 2026-05-26 cleanup:
           - "HEX SHOP · OFF-CHAIN INVENTORY" → archive-native framing
             ("OFF-CHAIN INVENTORY" was database-label tone, audit sev 7)
           - "Own a piece of the city" → archive-native heading
             (audit flagged as real-estate-sales tone)
           - "rarest artifacts of the broken signal. Supply finite where
             the lore demands" → restrained, no scarcity sales-talk
           - CTA row 3 → 2: dropped /earn, /leaderboard, /patrons (all
             hidden routes per the route compression; the storefront
             must not re-expose them). */}
        <span className="kicker">⬡ SHOP · ARCHIVE ARTEFACTS</span>
        <h1>
          Objects from <em>the signal.</em>
        </h1>
        <p className="lead">
          Physical fragments from FREELON CITY. Carrier garments, sealed
          objects, and archive pieces tied to the world forming around the
          missing HEX. Paid in <strong>⬡ hex</strong> — the free city credit you
          earn by showing up, not real money.
        </p>
      </section>

      <div className="shop-totals" style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: "var(--s-5)", fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-dim)" }}>
        <span>{ITEMS.length} ARTEFACTS</span>
        {CATEGORIES.map((c) => (
          <span key={c}>
            {c} · {totals[c]}
          </span>
        ))}
      </div>

      <ShopGrid />

      <section style={{ marginTop: "var(--s-6)", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        {/* 2026-06-07 funnel: shop is a HEX sink off the core loop — repoint its
            primary back to the product so a non-owner doesn't dead-end here. */}
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <Link className="btn btn-primary" href="/demo"><span className="ttl">DON&apos;T OWN A FREELON? SEE AN AGENT →</span></Link>
          <Link className="btn btn-secondary" href="/sync"><span className="ttl">ENTER THE CITY →</span></Link>
        </div>
      </section>
    </div>
  );
}

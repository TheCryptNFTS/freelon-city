import type { Metadata } from "next";
import Link from "next/link";
import { ShopGrid } from "./ShopGrid";
import { CATEGORIES, ITEMS, itemsByCategory } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Hex Shop · Spend the signal · FREELON CITY",
  description:
    "Spend hex points on property, land, ceremonial weapons, robes, and signal-era artifacts. Off-chain inventory, on-chain mythology.",
};

export default function ShopPage() {
  const totals: Record<string, number> = {};
  for (const c of CATEGORIES) totals[c] = itemsByCategory(c).length;

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <span className="kicker">⬡ HEX SHOP · OFF-CHAIN INVENTORY</span>
        <h1>
          Spend the signal<br />
          <em>Own a piece of the city</em>
        </h1>
        <p className="lead">
          Property, land, ceremonial arms, woven cloth, and the rarest artifacts of the broken signal.
          Pay in <strong>⬡ hex points</strong>. Supply is finite where the lore demands it.
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
          <Link className="btn btn-primary" href="/earn"><span className="ttl">EARN MORE HEX →</span></Link>
          <Link className="btn btn-secondary" href="/leaderboard"><span className="ttl">LEADERBOARD →</span></Link>
          <Link className="btn btn-secondary" href="/patrons"><span className="ttl">PATRONS WALL →</span></Link>
        </div>
      </section>
    </main>
  );
}

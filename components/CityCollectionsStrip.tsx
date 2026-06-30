import Link from "next/link";
import { COLLECTION_META } from "@/lib/collections-data";

/**
 * SIX COLLECTIONS, ONE CITY — the homepage "populations" beat (2026-06-30 brand
 * architecture pass, founder call: the site is an ECOSYSTEM, not one product
 * page). The 06-30 reduction had stripped every ecosystem signal off the
 * homepage, so a stranger left not knowing six collections exist or why FREELON
 * is the one being pushed. This restores that layer — but as ONE compact strip
 * of role-labelled chips, NOT the full grid/tree the reduction rightly cut as a
 * second sitemap. Each collection is a POPULATION of the city with a role; the
 * flagship (FREELONS) is marked and leads. Full role map + browse lives at
 * /collections. Roles are pulled from the locked COLLECTION_META lore — no new
 * claims, no invented lore (COPY_LEGAL_CHECKLIST).
 */

type Pop = { title: string; role: string; href: string; flagship?: boolean };

// FREELONS first as the flagship citizen class; the five sister collections
// follow in mint order (COLLECTION_META.order). Roles are the one-line city
// function compressed from each collection's kicker/epithet.
const POPULATIONS: Pop[] = [
  { title: "FREELONS", role: "The citizens you own & train", href: "/citizens", flagship: true },
  ...Object.values(COLLECTION_META)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      title: c.title,
      role: c.epithet,
      href:
        c.title === "Crypt TCG"
          ? "/crypt-tcg"
          : "/collections",
    })),
];

export function CityCollectionsStrip() {
  return (
    <section className="city-pops reveal" aria-label="Six collections, one city">
      <header className="city-pops__head">
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ SIX COLLECTIONS · ONE CITY</span>
        <h2 className="city-pops__h2">
          One city, many kinds of <em>citizen.</em>
        </h2>
        <p className="city-pops__lead">
          <strong>FREELON CITY is the world. FREELON is the flagship citizen collection inside
          it.</strong> The city is six collections in all — each a population with a role.
          FREELON is the one you own and train; the rest are free to meet.
        </p>
      </header>

      <ul className="city-pops__row">
        {POPULATIONS.map((p) => (
          <li key={p.title}>
            <Link href={p.href} className={`city-pops__chip${p.flagship ? " is-flagship" : ""}`}>
              <span className="city-pops__name">{p.title}</span>
              <span className="city-pops__role">{p.role}</span>
              {p.flagship && <span className="city-pops__flag">FLAGSHIP</span>}
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/collections" className="city-pops__all">
        See all six collections and their roles <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

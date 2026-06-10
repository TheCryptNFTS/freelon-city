/**
 * SnipesSection — snipe board (rares listed below ~1.5x floor).
 * Folded from app/undervalued into the /dashboard hub. Server component;
 * fetches OpenSea listings and surfaces rare citizens near floor.
 */
import Link from "next/link";
import { headers } from "next/headers";
import { CIVILIZATIONS, heroImageUrl, openseaUrl } from "@/lib/constants";
import citizensData from "@/data/citizens.json";
import type { Citizen } from "@/lib/citizens";
import type { ListingItem } from "@/app/api/opensea/listings/route";

const CITIZENS_BY_ID: Record<number, Citizen> = (() => {
  const out: Record<number, Citizen> = {};
  for (const c of citizensData as Citizen[]) out[c.id] = c;
  return out;
})();

const RARE_TIERS = new Set([
  "Rare",
  "Epic",
  "Legendary",
  "Honorary",
  "One of One",
]);

async function fetchListings(): Promise<ListingItem[]> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  const base = host ? `${proto}://${host}` : "";
  try {
    const r = await fetch(`${base}/api/opensea/listings`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const d = (await r.json()) as { listings?: ListingItem[] };
    return d.listings || [];
  } catch {
    return [];
  }
}

function civName(slug: string): string {
  return (
    (CIVILIZATIONS as Record<string, { name: string }>)[slug]?.name ?? slug
  );
}
function civColor(slug: string): string {
  return (
    (CIVILIZATIONS as Record<string, { color: string }>)[slug]?.color ??
    "#c8aa64"
  );
}

export async function SnipesSection() {
  const listings = await fetchListings();
  // Floor is the lowest listing in the sample
  const floor = listings.length > 0 ? listings[0].priceEth : null;
  const ceiling = floor !== null ? floor * 1.5 : Infinity;

  const candidates = listings
    .filter((l) => l.priceEth <= ceiling)
    .map((l) => ({ listing: l, citizen: CITIZENS_BY_ID[l.tokenId] }))
    .filter((x) => x.citizen && RARE_TIERS.has(x.citizen.tier))
    // Sort by tier value desc, then price asc (best deal on highest rarity first)
    .sort((a, b) => {
      const tierOrder: Record<string, number> = {
        Rare: 1,
        Epic: 2,
        Legendary: 3,
        Honorary: 4,
        "One of One": 5,
      };
      const tierDiff =
        (tierOrder[b.citizen.tier] || 0) - (tierOrder[a.citizen.tier] || 0);
      if (tierDiff !== 0) return tierDiff;
      return a.listing.priceEth - b.listing.priceEth;
    })
    .slice(0, 12);

  return (
    <section id="snipes" className="heat-page" style={{ scrollMarginTop: 96 }}>
      <div className="kicker" style={{ color: "var(--gold)" }}>
        ⬡ MISPRICED BY THE CITY
      </div>
      <h2
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(32px, 5vw, 56px)",
          lineHeight: 0.92,
          letterSpacing: "-0.02em",
          margin: "var(--s-4) 0 var(--s-3)",
          textTransform: "uppercase",
        }}
      >
        Mispriced by the City
      </h2>
      <p
        style={{
          color: "var(--ink-2)",
          maxWidth: "62ch",
          fontSize: 17,
          lineHeight: 1.5,
        }}
      >
        Rare citizens listed near floor. The city sees them. The market hasn&apos;t.
      </p>
      <p
        style={{
          color: "var(--ink-dim)",
          fontFamily: "var(--mono2)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginTop: "var(--s-3)",
        }}
      >
        Not financial advice. Just observation.
      </p>

      {floor !== null && (
        <div
          style={{
            marginTop: "var(--s-4)",
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--ink-dim)",
            letterSpacing: "0.12em",
          }}
        >
          Sample floor: {floor.toFixed(4)} ETH · ceiling: {(floor * 1.5).toFixed(4)} ETH
        </div>
      )}

      {candidates.length === 0 ? (
        <section className="empty-hero">
          <span className="kicker">⬡ THE MARKET IS BALANCED</span>
          <h3 className="empty-hero-title">The market is balanced</h3>
          <p className="empty-hero-sub">The city sees what the market sees. When a listing flags a bounty, it surfaces here.</p>
        </section>
      ) : (
        <div className="undervalued-grid">
          {candidates.map(({ listing, citizen }) => {
            const id4 = citizen.id.toString().padStart(4, "0");
            const color = civColor(citizen.civilization);
            return (
              <div
                key={citizen.id}
                className="undervalued-card"
                style={{ borderTopColor: color, borderTopWidth: 2 }}
              >
                <Link href={`/citizens/${citizen.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heroImageUrl(citizen.id)} alt={citizen.name} loading="lazy" />
                  <div className="meta" style={{ color }}>#{id4}</div>
                  {(citizen.transmission_name || citizen.honoree) && (
                    <div
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: 15,
                        lineHeight: 1.15,
                        color: "var(--ink)",
                        marginTop: 4,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {citizen.transmission_name || citizen.honoree}
                    </div>
                  )}
                  <div className="price">{listing.priceEth.toFixed(4)} ETH</div>
                  <div className="meta" style={{ marginTop: 4 }}>
                    {civName(citizen.civilization)} · {citizen.tier}
                  </div>
                </Link>
                <a
                  href={openseaUrl(citizen.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="meta"
                  style={{ display: "inline-block", marginTop: 8, color: "var(--gold)" }}
                >
                  OPENSEA →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

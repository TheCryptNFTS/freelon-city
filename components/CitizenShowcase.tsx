import Link from "next/link";
import { getAllCitizens } from "@/lib/citizens";
import { heroImageUrl } from "@/lib/constants";

// ── CITIZEN SHOWCASE ────────────────────────────────────────────────
// Show-don't-tell, asset-free: the homepage sells "OWN A FREELON" but
// previously showed zero Freelons. Game sites lead with their roster
// (LoL champions, the Pokédex). We own 4040 portraits — so this is a
// slow auto-scrolling band of real citizens, right under the hero, so a
// visitor SEES the product the moment they arrive.
//
// Uses only the local-mirror heroes (the 4 one-of-ones + 35 honoraries):
// they're fast .webp (no IPFS gateway lag), and they're the strongest,
// most recognisable art in the collection. Each tile links to its citizen.
// The track is duplicated so the marquee loops seamlessly; motion is
// disabled for prefers-reduced-motion users (CSS).
export function CitizenShowcase() {
  const all = getAllCitizens();
  const ones = all.filter((c) => c.tier === "One of One");
  const honoraries = all.filter((c) => c.tier === "Honorary");
  const heroes = [...ones, ...honoraries];
  if (heroes.length === 0) return null;

  // Two copies → seamless -50% translate loop.
  const track = [...heroes, ...heroes];

  return (
    <section className="citizen-showcase" aria-label="A few of the 4040 citizens">
      <span className="citizen-showcase__cap">A FEW OF THE 4040 · TAP ANY CITIZEN →</span>
      <div className="citizen-showcase__track">
        {track.map((c, i) => {
          const label = c.honoree || c.transmission_name || `Citizen #${c.id}`;
          return (
            <Link
              key={`${c.id}-${i}`}
              href={`/citizens/${c.id}`}
              className="citizen-showcase__cell"
              aria-hidden={i >= heroes.length || undefined}
              tabIndex={i >= heroes.length ? -1 : undefined}
              title={label}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl(c.id)}
                alt={label}
                loading="lazy"
                width={96}
                height={96}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

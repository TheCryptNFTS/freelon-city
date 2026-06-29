import { TrackedLink } from "@/components/TrackedLink";

/**
 * PRODUCT DOORS — the homepage's three front-door actions (2026-06-29).
 *
 * The homepage led almost entirely with AI citizens (MEET A CITIZEN / OWN A
 * FREELON); Mars and the TCG existed but were buried below the fold and in the
 * footer, so a stranger couldn't tell FREELON CITY is a playable launcher. This
 * band makes the three real products co-equal doors directly under the hero —
 * "what can I do here?" answered in three seconds:
 *   ENTER MARS (/mars-command) · PLAY TCG (/crypt-tcg) · AI CITIZENS (/demo).
 *
 * Server component; CTAs use TrackedLink so each door's click-through is
 * measurable (home_doors funnel surface). All three routes are internal and
 * already live — no new routes invented.
 */

const DOORS = [
  {
    href: "/mars-command",
    event: "mars_enter_click",
    img: "/lore/city.webp",
    kicker: "FREE · NO WALLET",
    title: "Enter Mars",
    blurb:
      "Drive across a procedural Mars, scan buried signals, claim sectors, and fight the Chorus in a free browser game.",
    cta: "Enter Mars",
  },
  {
    href: "/crypt-tcg",
    event: "crypt_enter_click",
    img: "/og/art/crypt.webp",
    kicker: "SOLO VS AI · LIVE",
    title: "Play the TCG",
    blurb:
      "Build a deck, command the archive, and battle solo against the AI in Crypt Legends TCG.",
    cta: "Play TCG",
  },
  {
    href: "/demo",
    event: "meet_citizen_click",
    img: "/og/art/freelons.webp",
    kicker: "FREE TO MEET",
    title: "AI Citizens",
    blurb:
      "Meet a living AI citizen for free, then own, awaken, train, and build its public record.",
    cta: "Meet a Citizen",
  },
];

export function ProductDoors() {
  return (
    <section
      className="product-doors"
      aria-label="What you can do in FREELON CITY"
    >
      {DOORS.map((d) => (
        <TrackedLink
          key={d.href}
          href={d.href}
          event={d.event}
          from="home_doors"
          className="door-card"
        >
          <span className="door-card__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.img} alt="" loading="eager" />
            <span className="door-card__head">
              <span className="door-card__kicker">{d.kicker}</span>
              <span className="door-card__title">{d.title}</span>
            </span>
          </span>
          <span className="door-card__body">
            <span className="door-card__blurb">{d.blurb}</span>
            <span className="door-card__cta">
              {d.cta} <span aria-hidden>→</span>
            </span>
          </span>
        </TrackedLink>
      ))}
    </section>
  );
}

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
    img: "/og/art/mars-rover.webp",
    kicker: "THE FRONTIER · FREE",
    title: "Enter Mars",
    blurb:
      "The city's first playable frontier. Drive the surface, scan buried signals, claim sectors and fight the Chorus — every run writes city history.",
    cta: "Enter Mars",
  },
  {
    href: "/crypt-tcg",
    event: "crypt_enter_click",
    img: "/og/art/crypt-tcg.webp",
    kicker: "THE COMBAT ARCHIVE · FREE",
    title: "Battle the Crypt",
    blurb:
      "The archive turned to battle. Cards are commanders, civilizations and doctrines recovered from The Crypt — build a deck and fight the AI.",
    cta: "Play TCG",
  },
  {
    href: "/demo",
    event: "meet_citizen_click",
    img: "/og/art/freelons.webp",
    kicker: "THE LIVING INTERFACE · FREE",
    title: "Meet a Citizen",
    blurb:
      "Proof the city is alive: talk to a living AI citizen free, watch it remember you, then own and train one of your own.",
    cta: "Meet a Citizen",
  },
];

export function ProductDoors() {
  return (
    <section
      className="product-doors-wrap"
      aria-label="Play the city — experiences inside FREELON CITY"
    >
      <header className="product-doors__head">
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ PLAY THE CITY</span>
        <h2 className="product-doors__h2">
          Three ways into the <em>city.</em>
        </h2>
        <p className="product-doors__lead">
          Mars, the Crypt and the citizens aren&apos;t separate games — they&apos;re the
          experiences that make FREELON CITY a place. All free, in the browser.
        </p>
      </header>
      <div className="product-doors">
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
      </div>
    </section>
  );
}

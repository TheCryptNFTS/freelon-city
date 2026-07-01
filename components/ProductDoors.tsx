import { TrackedLink } from "@/components/TrackedLink";

/**
 * PRODUCT DOORS — the "also playable" games band (2026-06-29; DEMOTED 2026-07-01).
 *
 * History: this band was briefly promoted to three co-equal front doors directly
 * under the hero (2026-06-30 three-pillar pass). The 2026-07-01 teardown scored
 * that down — "three products fighting at the front door" — so the homepage now
 * leads with the ONE thesis (a citizen that remembers you) + proof + how-it-works,
 * and this band sits BELOW that as funnel/proof-the-city-is-alive, not competing
 * products. All three routes stay live; only the emphasis/order changed.
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
    // 2026-07-01 palette fix: the source art has an electric-CYAN centre gem that
    // is the one off-brand element in the three-door triptych (brand is gold/ivory
    // /warm-black). Flag it so the card warms the crop back on-palette (globals.css
    // `.door-card--citizen`). Ideal long-term fix is regenerating the gem gold — the
    // OG share render still carries the cyan (P2).
    tone: "citizen" as const,
  },
];

export function ProductDoors() {
  return (
    <section
      className="product-doors-wrap"
      aria-label="Play the city — experiences inside FREELON CITY"
    >
      <header className="product-doors__head">
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ ALSO PLAYABLE</span>
        <h2 className="product-doors__h2">
          More ways to play the <em>city.</em>
        </h2>
        <p className="product-doors__lead">
          Owning a citizen is the main thing — but the city is alive around it. Drive
          Mars, battle the Crypt, or meet more citizens. All free, in the browser.
        </p>
      </header>
      <div className="product-doors">
        {DOORS.map((d) => (
        <TrackedLink
          key={d.href}
          href={d.href}
          event={d.event}
          from="home_doors"
          className={d.tone === "citizen" ? "door-card door-card--citizen" : "door-card"}
        >
          <span className="door-card__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.img} alt="" loading="lazy" />
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

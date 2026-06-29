import Link from "next/link";
import { TrackedLink } from "@/components/TrackedLink";

/**
 * ENTER MARS — homepage game-mode band (2026-06-29 site-design rebuild).
 *
 * Built to match the CryptTcgBand quality bar: a two-column band — strong copy
 * (kicker + display headline + pitch + feature pills + two CTAs + live dot) and
 * a single cinematic focal visual (original Mars rover key art generated for
 * this project, public/og/art/mars-rover.webp). Replaces the weak orange
 * cityscape that used to stand in for Mars. Server component; CTA is the client
 * TrackedLink so the home → mars funnel stays measurable.
 */

const FEATURES = [
  "Free · no wallet",
  "Procedural Mars",
  "Scan signals",
  "Claim sectors",
  "Web playable",
];

export function MarsBand() {
  return (
    <section
      className="reveal feature-band"
      aria-label="Enter Mars"
      style={{ maxWidth: 1080, margin: "var(--s-6) auto", padding: "0 var(--s-4)" }}
    >
      <div className="feature-band__inner feature-band__inner--mars">
        {/* VISUAL */}
        <Link href="/mars-command" className="feature-band__media" aria-hidden tabIndex={-1}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/og/art/mars-rover.webp" alt="" loading="lazy" />
          <span className="feature-band__hud">SECTOR 04 · SIGNAL DETECTED</span>
        </Link>

        {/* COPY */}
        <div className="feature-band__copy">
          <span className="kicker" style={{ color: "var(--gold)" }}>
            ⬡ ENTER MARS · FREE BROWSER GAME
          </span>
          <h2 className="feature-band__h2">
            Drive the red frontier.{" "}
            <em>Scan the signal.</em> Claim the map.
          </h2>
          <p className="feature-band__pitch">
            Pilot a rover across a procedural Mars, hunt buried signals, claim
            sectors and hold them against the Chorus — a real browser game you
            can play right now, no wallet required.
          </p>

          <ul className="feature-band__pills">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <div className="feature-band__ctas">
            <TrackedLink
              href="/mars-command"
              event="mars_enter_click"
              from="home_mars_band"
              className="btn btn-primary btn-lg"
            >
              <span className="ttl">ENTER MARS →</span>
            </TrackedLink>
            <Link className="btn btn-secondary" href="/play">
              <span className="ttl">ALL CITY GAMES →</span>
            </Link>
          </div>

          <div className="feature-band__live">
            <span aria-hidden className="feature-band__dot" />
            Live · free to play &nbsp;·&nbsp; no wallet, no signup
          </div>
        </div>
      </div>
    </section>
  );
}

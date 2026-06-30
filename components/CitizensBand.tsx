import { TrackedLink } from "@/components/TrackedLink";
import { heroImageUrl } from "@/lib/constants";

/**
 * AI CITIZENS — homepage feature band (2026-06-29 site-design rebuild).
 *
 * Matches the CryptTcgBand / MarsBand quality bar: strong edited copy on the
 * left (kicker + display headline + pitch + feature pills + two CTAs + live
 * dot) and a single authentic focal visual on the right — a REAL FREELON
 * portrait (#404, on-brand with the 404 motif) wrapped in a CSS profile panel
 * (skill bars + a memory line) rather than a generated fake-UI image. This
 * keeps the collection honestly represented and avoids gibberish UI text.
 * Server component; primary CTA is the client TrackedLink so the home → demo
 * funnel stays measurable.
 */

const FEATURES = [
  "Remembers you",
  "Provable recall",
  "Hex memory brain",
  "Free demo",
  "4,040 citizens",
];

export function CitizensBand() {
  return (
    <section
      className="reveal feature-band"
      aria-label="AI Citizens"
      style={{ maxWidth: 1080, margin: "var(--s-6) auto", padding: "0 var(--s-4)" }}
    >
      <div className="feature-band__inner feature-band__inner--citizens">
        {/* COPY */}
        <div className="feature-band__copy">
          <span className="kicker" style={{ color: "var(--gold)" }}>
            ⬡ AI CITIZENS · IT REMEMBERS YOU
          </span>
          <h2 className="feature-band__h2">
            A citizen that <em>remembers you</em> — and can prove it.
          </h2>
          <p className="feature-band__pitch">
            Every FREELON is an AI citizen with a visible memory brain. Tell one
            something, come back later, and it recalls — then shows the exact
            trail of why. No wallet needed to meet one.
          </p>

          <ul className="feature-band__pills">
            {FEATURES.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          <div className="feature-band__ctas">
            <TrackedLink
              href="/demo"
              event="meet_citizen_click"
              from="home_citizens_band"
              className="btn btn-primary btn-lg"
            >
              <span className="ttl">MEET A CITIZEN →</span>
            </TrackedLink>
            <TrackedLink
              href="/citizens"
              event="browse_citizens_click"
              from="home_citizens_band"
              className="btn btn-secondary"
            >
              <span className="ttl">BROWSE ALL 4,040 →</span>
            </TrackedLink>
          </div>

          <div className="feature-band__live">
            <span aria-hidden className="feature-band__dot" />
            Live demo · free &nbsp;·&nbsp; no wallet, no signup
          </div>
        </div>

        {/* VISUAL — real FREELON portrait + CSS profile panel */}
        <div className="feature-band__media" aria-hidden>
          <div className="citizen-profile">
            <div className="citizen-profile__portrait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImageUrl(404)} alt="" loading="lazy" />
              <span className="citizen-profile__id">CITIZEN #404 · ONLINE</span>
            </div>
            <div className="citizen-profile__body">
              <div className="citizen-profile__row">
                <span className="citizen-profile__label">Recall</span>
                <span className="citizen-profile__bar"><span style={{ width: "88%" }} /></span>
              </div>
              <div className="citizen-profile__row">
                <span className="citizen-profile__label">Reputation</span>
                <span className="citizen-profile__bar"><span style={{ width: "72%" }} /></span>
              </div>
              <p className="citizen-profile__memory">
                Remembers: you said your <b>favorite signal was Sector 04</b>.
                Asked again 3 days later → answered correctly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

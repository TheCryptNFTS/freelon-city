import Link from "next/link";
import { CITY_LORE, CIVILIZATION_LORE } from "@/lib/worldbuilding";
import { CIVILIZATIONS } from "@/lib/constants";

export const metadata = { title: "The Canon · FREELON CITY" };

export default function LorePage() {
  return (
    <main
      className="lore-page"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(10,12,18,0.55) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/lore/city.webp)",
        backgroundSize: "1600px auto",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
      }}
    >
      <section className="lore-hero">
        <span className="term-badge flicker"><span className="dot" />THE CANON · CYCLE 0404</span>
        <h1>
          A signal. A city.<br />
          <em>A civilization on Mars</em>
        </h1>
        <p className="lead">
          Everything you need to know about FREELON CITY — the founding, the
          districts, the ten civilizations, the alliances, the rivalries, the rituals.
        </p>
      </section>

      <section className="lore-block">
        <div className="lore-grid">
          <div>
            <span className="kicker">⬡ I · THE FOUNDING</span>
            <h2>{CITY_LORE.founding.title}</h2>
          </div>
          <p className="lore-body">{CITY_LORE.founding.body}</p>
        </div>
      </section>

      <section className="lore-block">
        <div className="lore-grid">
          <div>
            <span className="kicker">⬡ II · THE MAP</span>
            <h2>{CITY_LORE.geography.title}</h2>
          </div>
          <p className="lore-body">{CITY_LORE.geography.body}</p>
        </div>
      </section>

      <section className="lore-civs-intro">
        <span className="kicker">⬡ III · THE TEN CIVILIZATIONS</span>
        <h2>
          Each one a doctrine.<br />
          <em>Each one a grudge</em>
        </h2>
      </section>

      <div className="lore-civ-list">
        {Object.entries(CIVILIZATION_LORE).map(([slug, lore]) => {
          const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; color: string; chant: string; population: number }>)[slug];
          return (
            <article
              key={slug}
              className="lore-civ-row"
              style={{ "--civ": civ?.color } as React.CSSProperties}
            >
              <div className="lore-row-inner">
                <div className="lore-civ-id">
                  <span className="kicker" style={{ color: civ?.color }}>{civ?.name}</span>
                  <h3 style={{ color: civ?.color }}>{civ?.doctrine}</h3>
                  <div className="pop-line">
                    POP · <strong style={{ color: civ?.color }}>{civ?.population}</strong>
                  </div>
                  <p className="motto">&ldquo;{lore.motto}&rdquo;</p>
                  <div className="chant" style={{ color: civ?.color }}>⬡ {civ?.chant}</div>
                </div>

                <div className="lore-civ-history">
                  <span className="kicker">HISTORY</span>
                  <p>{lore.history}</p>
                  <div className="ritual">
                    <span className="kicker">RITUAL</span>
                    <p>{lore.ritual}</p>
                  </div>
                </div>

                <div className="lore-civ-position">
                  <div>
                    <span className="kicker">DISTRICT</span>
                    <p className="district">{lore.district}</p>
                  </div>
                  <div className="block">
                    <span className="kicker">ALLIES</span>
                    <p className="mono-line">
                      {lore.allies.length > 0
                        ? lore.allies
                            .map((a) => (CIVILIZATIONS as Record<string, { doctrine: string }>)[a]?.doctrine)
                            .join(" · ")
                        : "—"}
                    </p>
                  </div>
                  <div className="block">
                    <span className="kicker">RIVALS</span>
                    <p className="mono-line">
                      {lore.rivals
                        .map((r) => (CIVILIZATIONS as Record<string, { doctrine: string }>)[r]?.doctrine)
                        .join(" · ")}
                    </p>
                    <p className="rival-line">&ldquo;{lore.rivalLine}&rdquo;</p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="lore-cta">
        <h3>
          The signal is open.<br />
          <em>Find where you belong</em>
        </h3>
        <div className="cta-row">
          <Link href="/civilizations" className="btn btn-primary">
            <span className="ttl">FIND YOUR CIVILIZATION <span className="ar">→</span></span>
          </Link>
          <Link href="/sync" className="btn btn-secondary">
            <span className="ttl">RECEIVE THE SIGNAL →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

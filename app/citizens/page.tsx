import { getAllCitizens } from "@/lib/citizens";
import { FindCitizen } from "@/components/FindCitizen";
import { CitizensBrowser } from "@/components/CitizensBrowser";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";
import Link from "next/link";

export const metadata = { title: "Citizens" };

const ONE_TAGS: Record<number, { slug: string; sub: string }> = {
  1:    { slug: "origin-signal",   sub: "ONE OF ONE · SIGNAL BORN" },
  404:  { slug: "patient-zero",    sub: "ONE OF ONE · CHOIR OF STATIC" },
  1337: { slug: "genesis-hex",     sub: "ONE OF ONE · VOID KNIGHT" },
  4040: { slug: "the-final-signal", sub: "ONE OF ONE · THE THRONE" },
};

export default function Citizens() {
  const all = getAllCitizens();
  const ones = all.filter((c) => c.tier === "One of One");
  const honoraries = all.filter((c) => c.tier === "Honorary");
  const legendaries = all.filter((c) => c.tier === "Legendary").slice(0, 12);

  const mini = all.map((c) => ({
    id: c.id,
    civilization: c.civilization,
    caste: c.caste,
    shape: c.shape,
    tier: c.tier,
    honoree: c.honoree || undefined,
    transmission_name: c.transmission_name || undefined,
  }));

  return (
    <main className="citizens-page">
      <section className="citizens-hero">
        <span className="kicker">⬡ CITIZENS · 4040 TOTAL</span>
        <h1>Find your <em>citizen</em></h1>
        <p className="lead">Enter a token number 1—4040 to look up any Freelon directly.</p>
        <div className="finder">
          <FindCitizen />
        </div>
      </section>

      <section className="citizens-section reveal">
        <header className="sec-head">
          <span className="kicker">ONE OF ONES</span>
          <h2>The <em>Four</em></h2>
        </header>
        <div className="ones-grid">
          {ones.map((c) => {
            const tag = ONE_TAGS[c.id];
            const civ = (CIVILIZATIONS as Record<string, { color: string }>)[c.civilization];
            return (
              <Link
                key={c.id}
                href={tag ? `/${tag.slug}` : `/citizens/${c.id}`}
                className="one-card"
                style={{ "--civ": civ?.color } as React.CSSProperties}
              >
                <div className="img-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(c.id)} alt={c.transmission_name || c.name} loading="lazy" />
                </div>
                <div className="meta">
                  <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                  <h3>{c.transmission_name || c.name}</h3>
                  <span className="sub">{tag?.sub || `ONE OF ONE · ${c.caste}`}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="citizens-section reveal">
        <header className="sec-head">
          <span className="kicker">35 ELEVATED CITIZENS</span>
          <h2>The <em>Honoraries</em></h2>
        </header>
        <div className="honor-grid">
          {honoraries.map((c) => {
            const civ = (CIVILIZATIONS as Record<string, { color: string }>)[c.civilization];
            const handle = (c.honoree_handle || "").replace(/^@/, "") || String(c.id);
            return (
              <Link key={c.id} href={`/tribute/${handle}`} className="honor-card" style={{ "--civ": civ?.color } as React.CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(c.id)} alt={c.honoree} loading="lazy" />
                <div className="meta">
                  <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                  <span className="name">{c.honoree}</span>
                  <span className="handle">{c.honoree_handle}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="citizens-section reveal">
        <header className="sec-head">
          <span className="kicker">40 TOTAL · 12 SHOWN</span>
          <h2>The <em>Legendaries</em></h2>
        </header>
        <div className="legendary-grid">
          {legendaries.map((c) => {
            const civ = (CIVILIZATIONS as Record<string, { color: string }>)[c.civilization];
            return (
              <Link key={c.id} href={`/citizens/${c.id}`} className="legendary-card" style={{ "--civ": civ?.color } as React.CSSProperties}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(c.id)} alt={c.name} loading="lazy" />
                <div className="meta">
                  <span className="id">#{c.id.toString().padStart(4, "0")}</span>
                  <span className="shape">{c.shape}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="citizens-section reveal">
        <header className="sec-head">
          <span className="kicker">SEARCH · FILTER · SCROLL</span>
          <h2>Browse all <em>4040</em></h2>
        </header>
        <CitizensBrowser all={mini} />
      </section>
    </main>
  );
}

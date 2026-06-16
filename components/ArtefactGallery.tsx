import { collectionBySlug, openseaCollectionUrl } from "@/lib/collections";
import { tokenUrl } from "@/lib/collections-data";
import type { ArtefactGroup } from "@/lib/wallet-artefacts";

/**
 * ArtefactGallery — the holder's owned tokens across the five sister collections,
 * rendered as FREELON-grade cards (art + traits + collection lore) instead of the
 * bare "held: N" chips. One section per HELD collection; not-held collections are
 * omitted (the set-completion chips above already show those). Matches the site's
 * 12px rounded, civ/collection-accented card language. Server component — pure data.
 */
export function ArtefactGallery({ groups }: { groups: ArtefactGroup[] }) {
  const held = groups.filter((g) => g.has && g.preview.length > 0);
  if (held.length === 0) return null;

  return (
    <section className="artefacts">
      <h2 className="kicker passport-section-kicker">⬡ ARTEFACTS HELD · ACROSS THE CITY</h2>
      {held.map((g) => {
        const c = collectionBySlug(g.slug);
        const moreCount = g.count - g.preview.length;
        return (
          <div key={g.slug} className="artefact-group">
            <header className="artefact-head" style={{ ["--accent" as string]: g.color }}>
              <div className="artefact-head__title">
                <span className="artefact-head__role">⬡ {g.role}</span>
                <span className="artefact-head__name">{g.name}</span>
                {g.epithet ? <span className="artefact-head__epithet">{g.epithet}</span> : null}
              </div>
              <a className="artefact-head__link" href={openseaCollectionUrl(g.slug)} target="_blank" rel="noreferrer">
                {g.count}
                {g.count >= 50 ? "+" : ""} held ↗
              </a>
            </header>

            <div className="artefact-grid">
              {g.preview.map((t) => {
                const href = c ? tokenUrl(c.chain, c.contract, t.id) : openseaCollectionUrl(g.slug);
                return (
                  <a
                    key={t.id}
                    className="artefact-card"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ["--accent" as string]: g.color }}
                    title={t.name}
                  >
                    <div className="artefact-card__art">
                      {t.img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.img} alt={t.name} loading="lazy" />
                      ) : (
                        <span className="artefact-card__glyph" aria-hidden>⬡</span>
                      )}
                    </div>
                    <div className="artefact-card__meta">
                      <span className="artefact-card__name">{t.name}</span>
                      {t.traits.length > 0 ? (
                        <span className="artefact-card__traits">
                          {t.traits.map((tr) => (
                            <span key={tr.type} className="artefact-chip" title={`${tr.type}: ${tr.value}`}>
                              {tr.value}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </a>
                );
              })}
              {moreCount > 0 ? (
                <a
                  className="artefact-card artefact-card--more"
                  href={openseaCollectionUrl(g.slug)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ["--accent" as string]: g.color }}
                >
                  <span className="artefact-more__n">+{g.count >= 50 ? "45+" : moreCount}</span>
                  <span className="artefact-more__l">more</span>
                </a>
              ) : null}
            </div>
          </div>
        );
      })}

      <style>{`
        .artefacts { margin: var(--s-2) 0 var(--s-5); }
        .artefact-group { margin-top: var(--s-4); }
        .artefact-head {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; padding-bottom: 8px; margin-bottom: 10px;
          border-bottom: 1px solid var(--line);
        }
        .artefact-head__title { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
        .artefact-head__role {
          font-family: var(--mono2); font-size: 10px; letter-spacing: 0.18em;
          text-transform: uppercase; color: var(--accent);
        }
        .artefact-head__name { font-family: var(--display); font-size: 18px; letter-spacing: -0.01em; color: var(--ink); }
        .artefact-head__epithet { font-family: var(--mono2); font-size: 10px; letter-spacing: 0.05em; color: var(--ink-dim); }
        .artefact-head__link {
          font-family: var(--mono2); font-size: 11px; letter-spacing: 0.08em;
          color: var(--ink-dim); text-decoration: none; white-space: nowrap;
        }
        .artefact-head__link:hover { color: var(--accent); }

        .artefact-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;
        }
        .artefact-card {
          display: block; border: 1px solid var(--line); border-top: 2px solid var(--accent);
          border-radius: 12px; overflow: hidden; background: var(--surface, rgba(255,255,255,0.03));
          text-decoration: none; color: var(--ink);
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .artefact-card:hover { transform: translateY(-2px); border-color: var(--accent); }
        .artefact-card__art {
          position: relative; aspect-ratio: 1; overflow: hidden; background: #0a0a0c;
          display: grid; place-items: center;
        }
        .artefact-card__art img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .artefact-card__glyph { font-size: 28px; color: color-mix(in srgb, var(--accent) 60%, var(--ink-dim)); }
        .artefact-card__meta { padding: 8px 10px; display: flex; flex-direction: column; gap: 5px; }
        .artefact-card__name {
          font-family: var(--grotesk, var(--display)); font-weight: 700; font-size: 11.5px;
          line-height: 1.2; color: var(--ink);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .artefact-card__traits { display: flex; flex-wrap: wrap; gap: 4px; }
        .artefact-chip {
          font-family: var(--mono2); font-size: 8.5px; letter-spacing: 0.04em;
          text-transform: uppercase; color: var(--ink-2);
          background: rgba(255,255,255,0.05); border: 1px solid var(--line);
          border-radius: 4px; padding: 2px 5px;
          max-width: 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .artefact-card--more {
          display: grid; place-items: center; align-content: center; gap: 2px;
          aspect-ratio: 1; text-align: center;
        }
        .artefact-more__n { font-family: var(--display); font-size: 22px; color: var(--accent); }
        .artefact-more__l { font-family: var(--mono2); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
      `}</style>
    </section>
  );
}

export default ArtefactGallery;

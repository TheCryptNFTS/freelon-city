"use client";
import { useMemo, useState } from "react";
import type { Token, Facet } from "@/lib/collections-data";

/**
 * Generic trait explorer for a non-Freelon collection — the same shape as
 * the Freelons CitizensBrowser, but data-driven by whatever trait facets the
 * collection has (built server-side in lib/collections-data). Search +
 * collapsible filter panel (defaults closed so the grid is the hero); each
 * card links out to the token on OpenSea since these collections trade there.
 *
 * Small facets (≤ CHIP_LIMIT values) render as chip rows; larger ones render
 * as a compact <select> so a 90-value trait doesn't flood the panel.
 */
const CHIP_LIMIT = 16;
const PAGE = 60;

export function CollectionBrowser({
  tokens,
  facets,
  chain,
  contract,
  accent,
}: {
  tokens: Token[];
  facets: Facet[];
  chain: string;
  contract: string;
  accent: string;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const activeCount = Object.values(sel).filter(Boolean).length;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tokens.filter((t) => {
      for (const [type, val] of Object.entries(sel)) {
        if (val && t.traits[type] !== val) return false;
      }
      if (!term) return true;
      if (String(t.id).includes(term)) return true;
      if (t.name.toLowerCase().includes(term)) return true;
      for (const v of Object.values(t.traits)) {
        if (v.toLowerCase().includes(term)) return true;
      }
      return false;
    });
  }, [tokens, q, sel]);

  const showing = filtered.slice(0, shown);
  const hasFilters = !!(q || activeCount);

  function setTrait(type: string, value: string) {
    setSel((s) => ({ ...s, [type]: s[type] === value ? "" : value }));
    setShown(PAGE);
  }
  function reset() {
    setQ("");
    setSel({});
    setShown(PAGE);
  }

  return (
    <section className="citizens-browser">
      <div className="citizens-filter-bar">
        <div className="citizens-filter-bar__inner">
          <input
            type="text"
            placeholder="search by #id, name, trait…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            className="citizens-search"
          />

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              alignSelf: "flex-start",
              marginTop: 8,
              background: "transparent",
              border: "1px solid var(--line-2)",
              color: activeCount ? "var(--gold)" : "var(--ink-2)",
              borderColor: activeCount ? "var(--gold)" : "var(--line-2)",
              padding: "6px 12px",
              borderRadius: 999,
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <span>Filters{activeCount ? ` · ${activeCount}` : ""}</span>
            <span aria-hidden style={{ transform: filtersOpen ? "rotate(180deg)" : "none", transition: "transform 120ms ease" }}>▾</span>
          </button>

          {filtersOpen && facets.map((f) =>
            f.values.length <= CHIP_LIMIT ? (
              <div key={f.type} className="citizens-chip-row">
                <span className="citizens-chip-row__label">{f.type.toUpperCase()}</span>
                <div className="ui-filter-bar citizens-chip-row__chips">
                  <button
                    type="button"
                    onClick={() => setTrait(f.type, "")}
                    className={`ui-chip${!sel[f.type] ? " ui-chip--active" : ""}`}
                  >
                    All
                  </button>
                  {f.values.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTrait(f.type, v)}
                      className={`ui-chip${sel[f.type] === v ? " ui-chip--active" : ""}`}
                      style={sel[f.type] === v ? { borderColor: accent, color: accent, background: `${accent}1a` } : undefined}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div key={f.type} className="citizens-chip-row">
                <span className="citizens-chip-row__label">{f.type.toUpperCase()}</span>
                <select
                  value={sel[f.type] || ""}
                  onChange={(e) => { setSel((s) => ({ ...s, [f.type]: e.target.value })); setShown(PAGE); }}
                  className="collection-select"
                >
                  <option value="">All ({f.values.length})</option>
                  {f.values.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            ),
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-dim)" }}>
            <span>
              {filtered.length.toLocaleString()} of {tokens.length.toLocaleString()} match
              {filtered.length > shown && ` · showing ${shown}`}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={reset}
                style={{ background: "transparent", border: "1px solid var(--line-2)", color: "var(--ink-dim)", padding: "4px 10px", borderRadius: 999, fontFamily: "inherit", fontSize: 10, letterSpacing: "0.18em", cursor: "pointer" }}
              >
                CLEAR
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="results-grid">
        {showing.map((t) => (
          <a
            key={t.id}
            href={`https://opensea.io/assets/${chain}/${contract}/${t.id}`}
            target="_blank"
            rel="noreferrer"
            className="result-cell scan-card"
            style={{ "--civ": accent, position: "relative" } as React.CSSProperties}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.img} alt={t.name} loading="lazy" />
            <div className="meta">
              <div className="id">#{t.id}</div>
              <div className="sub">{t.name}</div>
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "var(--s-5)", textAlign: "center", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.15em" }}>
          NO TOKENS MATCH · ADJUST YOUR FILTERS
        </div>
      )}

      {filtered.length > shown && (
        <div className="load-more">
          <button onClick={() => setShown((s) => s + PAGE)}>LOAD {PAGE} MORE →</button>
        </div>
      )}
    </section>
  );
}

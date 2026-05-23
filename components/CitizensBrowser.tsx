"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";

type Mini = {
  id: number;
  civilization: string;
  caste: string;
  shape: string;
  tier: string;
  honoree?: string;
  transmission_name?: string;
  // Optional fine-grained traits — pass-through from citizens.json so
  // the chip filters below can target them. Discord ask 2026-05-24:
  // "hard to find traits when they aren't listed" — these surface them.
  sub_archetype?: string;
  aura?: string;
  hex_state?: string;
};

const TIERS = ["One of One", "Honorary", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

export function CitizensBrowser({
  all,
  rareTraitIds,
  rareThreshold = 20,
}: {
  all: Mini[];
  /**
   * Set of citizen IDs whose at-least-one trait value appears at most
   * `rareThreshold` times across the entire collection. Pre-computed
   * server-side and passed in to avoid client-side O(n²) on 4040 rows.
   * Cards in this set get a RARE badge; the chip lets users filter to
   * just these citizens.
   */
  rareTraitIds?: Set<number>;
  rareThreshold?: number;
}) {
  const [q, setQ] = useState("");
  const [civ, setCiv] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [shape, setShape] = useState<string>("");
  const [caste, setCaste] = useState<string>("");
  const [subArch, setSubArch] = useState<string>("");
  const [aura, setAura] = useState<string>("");
  const [onlyUnique, setOnlyUnique] = useState(false);
  const [shown, setShown] = useState(60);

  const shapes = useMemo(() => Array.from(new Set(all.map((x) => x.shape))).sort(), [all]);
  const castes = useMemo(() => Array.from(new Set(all.map((x) => x.caste).filter(Boolean))).sort(), [all]);
  const subArches = useMemo(() => Array.from(new Set(all.map((x) => x.sub_archetype || "").filter((s) => s && s !== "None"))).sort(), [all]);
  const auras = useMemo(() => Array.from(new Set(all.map((x) => x.aura || "").filter((s) => s && s !== "None"))).sort(), [all]);
  const civs = useMemo(() => Object.entries(CIVILIZATIONS) as Array<[string, { name: string; color: string; doctrine: string }]>, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((c) => {
      if (civ && c.civilization !== civ) return false;
      if (tier && c.tier !== tier) return false;
      if (shape && c.shape !== shape) return false;
      if (caste && c.caste !== caste) return false;
      if (subArch && c.sub_archetype !== subArch) return false;
      if (aura && c.aura !== aura) return false;
      if (onlyUnique && !rareTraitIds?.has(c.id)) return false;
      if (!term) return true;
      if (String(c.id).includes(term)) return true;
      const blob = `${c.transmission_name || ""} ${c.honoree || ""} ${c.caste} ${c.shape} ${c.civilization} ${c.sub_archetype || ""} ${c.aura || ""} ${c.hex_state || ""}`.toLowerCase();
      return blob.includes(term);
    });
  }, [all, q, civ, tier, shape, caste, subArch, aura, onlyUnique, rareTraitIds]);

  const showing = filtered.slice(0, shown);
  const hasFilters = !!(q || civ || tier || shape || caste || subArch || aura || onlyUnique);

  function reset() {
    setQ(""); setCiv(""); setTier(""); setShape(""); setCaste(""); setSubArch(""); setAura(""); setOnlyUnique(false); setShown(60);
  }

  return (
    <section className="citizens-browser">
      {/* ── Sticky filter bar ────────────────────────────────────── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(5,5,5,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--line)",
          padding: "var(--s-3) 0",
          margin: "0 calc(-1 * var(--s-4))",
          marginBottom: "var(--s-3)",
        }}
      >
        <div style={{ padding: "0 var(--s-4)" }}>
          {/* Search input */}
          <input
            type="text"
            placeholder="search by #id, honoree, name, caste…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(60); }}
            style={{
              width: "100%",
              padding: "12px 14px",
              fontSize: 14,
              fontFamily: "var(--mono2)",
              color: "var(--ink)",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--line-2)",
              borderRadius: 10,
              marginBottom: 10,
            }}
          />

          {/* Civ chips */}
          <ChipRow label="CIV">
            <Chip label="All" active={!civ} onClick={() => { setCiv(""); setShown(60); }} />
            {civs.map(([slug, info]) => (
              <Chip
                key={slug}
                label={info.name}
                active={civ === slug}
                color={info.color}
                onClick={() => { setCiv(slug === civ ? "" : slug); setShown(60); }}
              />
            ))}
          </ChipRow>

          {/* Tier chips */}
          <ChipRow label="TIER">
            <Chip label="All" active={!tier} onClick={() => { setTier(""); setShown(60); }} />
            {TIERS.map((t) => (
              <Chip
                key={t}
                label={t}
                active={tier === t}
                onClick={() => { setTier(t === tier ? "" : t); setShown(60); }}
              />
            ))}
          </ChipRow>

          {/* Shape chips (collapsed unless 9 or fewer) */}
          <ChipRow label="SHAPE">
            <Chip label="All" active={!shape} onClick={() => { setShape(""); setShown(60); }} />
            {shapes.map((s) => (
              <Chip
                key={s}
                label={s}
                active={shape === s}
                onClick={() => { setShape(s === shape ? "" : s); setShown(60); }}
              />
            ))}
          </ChipRow>

          {/* Caste — broad role identity */}
          <ChipRow label="CASTE">
            <Chip label="All" active={!caste} onClick={() => { setCaste(""); setShown(60); }} />
            {castes.map((s) => (
              <Chip key={s} label={s} active={caste === s} onClick={() => { setCaste(s === caste ? "" : s); setShown(60); }} />
            ))}
          </ChipRow>

          {/* Sub-archetype — fine-grained (collars, gear, etc.) */}
          {subArches.length > 0 && (
            <ChipRow label="SUB-ARCHETYPE">
              <Chip label="All" active={!subArch} onClick={() => { setSubArch(""); setShown(60); }} />
              {subArches.map((s) => (
                <Chip key={s} label={s} active={subArch === s} onClick={() => { setSubArch(s === subArch ? "" : s); setShown(60); }} />
              ))}
            </ChipRow>
          )}

          {/* Aura */}
          {auras.length > 0 && (
            <ChipRow label="AURA">
              <Chip label="All" active={!aura} onClick={() => { setAura(""); setShown(60); }} />
              {auras.map((s) => (
                <Chip key={s} label={s} active={aura === s} onClick={() => { setAura(s === aura ? "" : s); setShown(60); }} />
              ))}
            </ChipRow>
          )}

          {/* Rare-trait toggle (One-of-Ones + carriers of any trait that
              appears ≤ rareThreshold times across the collection) */}
          {rareTraitIds && rareTraitIds.size > 0 && (
            <ChipRow label="RARITY">
              <Chip
                label={`★ RAREST · ${rareTraitIds.size}`}
                active={onlyUnique}
                color="#E8B247"
                onClick={() => { setOnlyUnique((v) => !v); setShown(60); }}
              />
              <span
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  color: "var(--ink-dim)",
                  textTransform: "uppercase",
                  marginLeft: 4,
                }}
              >
                trait count ≤ {rareThreshold}
              </span>
            </ChipRow>
          )}

          {/* Meta row — count + clear */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-dim)" }}>
            <span>
              {filtered.length.toLocaleString()} of {all.length.toLocaleString()} match
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

      {/* ── Results grid ─────────────────────────────────────────── */}
      <div className="results-grid">
        {showing.map((c) => {
          const civObj = (CIVILIZATIONS as Record<string, { color: string; doctrine: string }>)[c.civilization];
          const isUnique = rareTraitIds?.has(c.id);
          return (
            <Link
              key={c.id}
              href={`/citizens/${c.id}`}
              className="result-cell scan-card"
              style={{ "--civ": civObj?.color, position: "relative" } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(c.id)} alt={`Citizen #${c.id}`} loading="lazy" />
              {isUnique && (
                <span
                  aria-label="Carries a rare trait"
                  title={`At least one trait value is among the rarest in the collection (count ≤ ${rareThreshold})`}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    padding: "3px 7px",
                    background: "rgba(232,178,71,0.92)",
                    color: "#1a1208",
                    fontFamily: "var(--mono2)",
                    fontSize: 9,
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                    borderRadius: 4,
                    textTransform: "uppercase",
                    pointerEvents: "none",
                  }}
                >
                  ★ RARE
                </span>
              )}
              <div className="meta">
                <div className="id">#{c.id.toString().padStart(4, "0")}</div>
                <div className="sub">{civObj?.doctrine?.toUpperCase()} · {c.tier.toUpperCase()}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "var(--s-5)", textAlign: "center", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.15em" }}>
          NO CITIZENS MATCH · ADJUST YOUR FILTERS
        </div>
      )}

      {filtered.length > shown && (
        <div className="load-more">
          <button onClick={() => setShown((s) => s + 60)}>LOAD 60 MORE →</button>
        </div>
      )}
    </section>
  );
}

// ── tiny components ────────────────────────────────────────────────

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "6px 0", flexWrap: "wrap" }}>
      <span style={{ fontFamily: "var(--mono2)", fontSize: 9, letterSpacing: "0.22em", color: "var(--ink-dim)", marginRight: 4, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function Chip({
  label,
  active,
  color = "var(--gold)",
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "4px 10px",
        border: `1px solid ${active ? color : "var(--line)"}`,
        background: active ? `${color}1a` : "transparent",
        color: active ? color : "var(--ink-dim)",
        borderRadius: 999,
        fontFamily: "var(--mono2)",
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

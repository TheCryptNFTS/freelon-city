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
};

const TIERS = ["One of One", "Honorary", "Legendary", "Epic", "Rare", "Uncommon", "Common"];

export function CitizensBrowser({ all }: { all: Mini[] }) {
  const [q, setQ] = useState("");
  const [civ, setCiv] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [shape, setShape] = useState<string>("");
  const [shown, setShown] = useState(60);

  const shapes = useMemo(() => Array.from(new Set(all.map((x) => x.shape))).sort(), [all]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((c) => {
      if (civ && c.civilization !== civ) return false;
      if (tier && c.tier !== tier) return false;
      if (shape && c.shape !== shape) return false;
      if (!term) return true;
      if (String(c.id).includes(term)) return true;
      const blob =
        `${c.transmission_name || ""} ${c.honoree || ""} ${c.caste} ${c.shape} ${c.civilization}`.toLowerCase();
      return blob.includes(term);
    });
  }, [all, q, civ, tier, shape]);

  const showing = filtered.slice(0, shown);

  return (
    <section className="citizens-browser">
      <div className="filters">
        <input
          type="text"
          placeholder="search by id, honoree, transmission name, caste…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setShown(60); }}
        />
        <select value={civ} onChange={(e) => { setCiv(e.target.value); setShown(60); }}>
          <option value="">all civilizations</option>
          {Object.entries(CIVILIZATIONS).map(([slug, c]) => (
            <option key={slug} value={slug}>{c.name}</option>
          ))}
        </select>
        <select value={tier} onChange={(e) => { setTier(e.target.value); setShown(60); }}>
          <option value="">all tiers</option>
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={shape} onChange={(e) => { setShape(e.target.value); setShown(60); }}>
          <option value="">all shapes</option>
          {shapes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(q || civ || tier || shape) && (
          <button onClick={() => { setQ(""); setCiv(""); setTier(""); setShape(""); setShown(60); }}>
            clear
          </button>
        )}
      </div>
      <div className="results-meta">
        {filtered.length.toLocaleString()} citizen{filtered.length === 1 ? "" : "s"} match.
        {filtered.length > shown && ` showing ${shown}.`}
      </div>
      <div className="results-grid">
        {showing.map((c) => {
          const civObj = (CIVILIZATIONS as Record<string, { color: string; doctrine: string }>)[c.civilization];
          return (
            <Link
              key={c.id}
              href={`/citizens/${c.id}`}
              className="result-cell scan-card"
              style={{ "--civ": civObj?.color } as React.CSSProperties}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(c.id)} alt={`Citizen #${c.id}`} loading="lazy" />
              <div className="meta">
                <div className="id">#{c.id.toString().padStart(4, "0")}</div>
                <div className="sub">{civObj?.doctrine?.toUpperCase()} · {c.tier.toUpperCase()}</div>
              </div>
            </Link>
          );
        })}
      </div>
      {filtered.length > shown && (
        <div className="load-more">
          <button onClick={() => setShown((s) => s + 60)}>LOAD 60 MORE →</button>
        </div>
      )}
    </section>
  );
}

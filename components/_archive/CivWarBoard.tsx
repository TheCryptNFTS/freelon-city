"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Sale = { tokenId: number; priceEth?: string | null; ts?: number | null };
type CivRow = { slug: string; name: string; color: string; pop: number; sales: number; volume: number; lastTs: number | null };

const citizens = citizensData as Array<{ id: number; civilization: string }>;

export function CivWarBoard() {
  const [rows, setRows] = useState<CivRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/opensea/recent")
      .then((r) => r.json())
      .then((d) => {
        const sales: Sale[] = d.events || [];
        const byCiv: Record<string, { sales: number; volume: number; lastTs: number | null }> = {};
        for (const [slug] of Object.entries(CIVILIZATIONS)) byCiv[slug] = { sales: 0, volume: 0, lastTs: null };
        for (const s of sales) {
          const c = citizens[s.tokenId - 1];
          if (!c) continue;
          const slug = c.civilization;
          if (!byCiv[slug]) continue;
          byCiv[slug].sales += 1;
          byCiv[slug].volume += s.priceEth ? Number(s.priceEth) : 0;
          if (s.ts && (!byCiv[slug].lastTs || s.ts > (byCiv[slug].lastTs as number))) byCiv[slug].lastTs = s.ts;
        }
        const r: CivRow[] = Object.entries(CIVILIZATIONS).map(([slug, c]) => ({
          slug, name: c.name, color: c.color, pop: c.population,
          ...byCiv[slug],
        }));
        r.sort((a, b) => (b.volume - a.volume) || (b.sales - a.sales) || (b.pop - a.pop));
        setRows(r);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const narrative = deriveNarrative(rows);

  return (
    <section className="civ-war reveal">
      <div className="war-bar">
        <div>
          <span className="kicker">⬡ LIVE · CIVILIZATION WAR · 24H</span>
          <h2>Every sale moves <em>the city</em></h2>
          <p className="war-sub">Every carrier strengthens a signal. Every civilization fights for the top bracket.</p>
        </div>
        <span className="war-meta">SORTED BY VOLUME · POPULATION FIXED</span>
      </div>
      {loaded && rows.length > 0 && (
        <div className="war-narrative">⬡ {narrative}</div>
      )}
      <div className="war-table">
        <div className="war-head">
          <span>RANK</span><span>CIVILIZATION</span><span className="num">POP</span><span className="num">SALES</span><span className="num">VOL · ETH</span><span>LAST</span>
        </div>
        {(loaded ? rows : Object.entries(CIVILIZATIONS).map(([slug, c], i) => ({ slug, name: c.name, color: c.color, pop: c.population, sales: 0, volume: 0, lastTs: null, _placeholder: i })))
          .slice(0, 10)
          .map((r, i) => (
            <Link key={r.slug} href={`/civilizations/${r.slug}`} className="war-row" style={{ "--civ": r.color } as React.CSSProperties}>
              <span className="rank">{String(i + 1).padStart(2, "0")}</span>
              <span className="civ-name"><span className="dot" />{r.name.toUpperCase()}</span>
              <span className="num">{r.pop}</span>
              <span className="num">{r.sales || "—"}</span>
              <span className="num vol">{r.volume ? r.volume.toFixed(2) : "—"}</span>
              <span className="last">{r.lastTs ? timeAgo(r.lastTs) : "—"}</span>
            </Link>
        ))}
      </div>
    </section>
  );
}

function deriveNarrative(rows: CivRow[]): string {
  if (!rows.length) return "The city is watching.";
  const withVol = rows.filter((r) => r.volume > 0);
  if (withVol.length === 0) return "The city is watching. No civilization has moved yet.";

  const top = rows[0];
  const second = rows[1];
  const topName = top.name.toUpperCase();

  // Single mover
  if (withVol.length === 1) return `${topName} is the only civilization moving.`;

  const secondName = second?.name.toUpperCase() ?? "";
  const totalVol = withVol.reduce((sum, r) => sum + r.volume, 0);
  const topShare = top.volume / totalVol;

  // Runaway: top civ > 50% of total volume
  if (topShare > 0.5) return `${topName} is running away with it.`;

  // Trading blows: top 2 within 10% of each other
  if (second && second.volume > 0) {
    const gap = (top.volume - second.volume) / top.volume;
    if (gap < 0.1) return `${topName} and ${secondName} are trading blows.`;
  }

  // Climber: a lower-ranked civ has volume > top's pop-normalized rate
  // Heuristic: third or lower with > 60% of second's volume = climber
  const third = rows[2];
  if (third && second && third.volume > second.volume * 0.6 && third.volume > 0) {
    return `${third.name.toUpperCase()} is climbing fast.`;
  }

  return "The city is watching.";
}

function timeAgo(ts: number) {
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

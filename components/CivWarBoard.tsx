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

  return (
    <section className="civ-war reveal">
      <div className="war-bar">
        <div>
          <span className="kicker">⬡ LIVE · CIVILIZATION WAR · 24H</span>
          <h2>The <em>scoreboard</em></h2>
        </div>
        <span className="war-meta">SORTED BY VOLUME · POPULATION FIXED</span>
      </div>
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

function timeAgo(ts: number) {
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

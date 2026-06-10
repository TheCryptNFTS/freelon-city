"use client";

/**
 * TransformsWall — a public wall of the most recent image transforms owners have
 * generated. This is the "show the aha without a free run" surface: a visitor
 * sees real branded outputs from real citizens before paying anything.
 *
 * Self-hiding: renders NOTHING until the feed has entries, so it never shows an
 * empty box on a cold-start site. Fills in as people generate + share.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

type TransformEntry = { tokenId: number; url: string; style: string; ts: number };

export default function TransformsWall({ limit = 12 }: { limit?: number }) {
  const [items, setItems] = useState<TransformEntry[]>([]);
  // Stored transform URLs can go dead (deleted/expired). A wall of broken-image
  // glyphs looks worse than no wall, so drop any entry whose image fails to load
  // and self-hide the whole section once every remaining entry is dead.
  const [dead, setDead] = useState<Record<string, true>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/transforms", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const list = Array.isArray(d?.transforms) ? (d.transforms as TransformEntry[]) : [];
        setItems(list.slice(0, limit));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const live = items.filter((t) => !dead[`${t.tokenId}-${t.ts}`]);
  if (live.length === 0) return null; // cold-start or all-dead: show nothing, never a broken frame

  return (
    <section className="transforms-wall reveal">
      <span className="kicker">⬡ MADE IN FREELON CITY · REAL OUTPUTS</span>
      <p className="transforms-wall-sub">
        Real transforms owners made from their own citizens. Yours could be next.{" "}
        {/* /proof handoff (2026-06-10): turns "nice renders" into "renders only
            an owner can make" — the argument that converts. */}
        <Link href="/proof" style={{ color: "var(--gold)" }}>How only an owner can make these →</Link>
      </p>
      <div className="transforms-wall-grid">
        {live.map((t) => {
          const id4 = t.tokenId.toString().padStart(4, "0");
          return (
            <Link
              key={`${t.tokenId}-${t.ts}`}
              href={`/citizens/${t.tokenId}`}
              className="transforms-wall-item"
              title={`#${id4} · ${t.style}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.url}
                alt={`FREELON #${id4} — ${t.style}`}
                loading="lazy"
                onError={() => setDead((p) => ({ ...p, [`${t.tokenId}-${t.ts}`]: true }))}
              />
              <span className="transforms-wall-cap">#{id4} · {t.style}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

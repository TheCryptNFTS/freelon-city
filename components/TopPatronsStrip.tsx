import Link from "next/link";
import { getAllActive } from "@/lib/tithe-store";
import { CIVILIZATIONS } from "@/lib/constants";

/**
 * Top 10 patrons across all civs, last 7 days. Server component, rendered on
 * the home page. Falls back to nothing when no tithes have been burned yet.
 */
export async function TopPatronsStrip() {
  const all = await getAllActive();
  const flat = Object.entries(all).flatMap(([civSlug, list]) =>
    list.map((t) => ({ ...t, civSlug })),
  );
  if (flat.length === 0) return null;
  const top = flat.sort((a, b) => b.amount - a.amount).slice(0, 10);

  return (
    <section className="top-patrons-strip">
      <div className="tp-head">
        <span className="kicker">⬡ TOP PATRONS · 7-DAY BURN</span>
        <Link href="/patrons" className="tp-more">SEE ALL →</Link>
      </div>
      <ol className="tp-list">
        {top.map((t, i) => {
          const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[t.civSlug];
          return (
            <li key={t.id} className="tp-row" style={{ "--civ": civ?.color || "var(--gold)" } as React.CSSProperties}>
              <span className="tp-rank">{String(i + 1).padStart(2, "0")}</span>
              <span className="tp-name">{t.display}</span>
              <span className="tp-civ" style={{ color: civ?.color }}>{civ?.name?.toUpperCase()}</span>
              <span className="tp-amt">{t.amount.toLocaleString()} ⬡</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

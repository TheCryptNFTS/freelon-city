import Link from "next/link";
import { CIVILIZATIONS, CONTRACT } from "@/lib/constants";
import citizensData from "@/data/citizens.json";
import type { Citizen } from "@/lib/citizens";

export const revalidate = 180;

const CITIZENS_BY_ID: Record<number, Citizen> = (() => {
  const out: Record<number, Citizen> = {};
  for (const c of citizensData as Citizen[]) out[c.id] = c;
  return out;
})();

type SaleEvent = {
  event_type?: string;
  nft?: { identifier?: string };
  payment?: { quantity?: string; decimals?: number; symbol?: string };
};

async function fetchRecentSales(limitCount: number): Promise<Citizen[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  const out: Citizen[] = [];
  let next: string | undefined;
  for (let page = 0; page < 4 && out.length < limitCount; page++) {
    const u = new URL(
      `https://api.opensea.io/api/v2/events/chain/ethereum/contract/${CONTRACT}`,
    );
    u.searchParams.set("event_type", "sale");
    u.searchParams.set("limit", "50");
    if (next) u.searchParams.set("next", next);
    let r: Response;
    try {
      r = await fetch(u.toString(), {
        headers: { "X-API-KEY": apiKey },
        next: { revalidate: 180 },
      });
    } catch {
      break;
    }
    if (!r.ok) break;
    const d = (await r.json()) as { asset_events?: SaleEvent[]; next?: string };
    const events = d.asset_events || [];
    for (const ev of events) {
      const idStr = ev.nft?.identifier;
      if (!idStr) continue;
      const tid = parseInt(idStr, 10);
      const c = CITIZENS_BY_ID[tid];
      if (!c) continue;
      out.push(c);
      if (out.length >= limitCount) break;
    }
    next = d.next;
    if (!next) break;
  }
  return out;
}

type Tally = Record<string, number>;

function tally<K extends keyof Citizen>(citizens: Citizen[], key: K): Tally {
  const t: Tally = {};
  for (const c of citizens) {
    const v = String(c[key]);
    if (!v) continue;
    t[v] = (t[v] || 0) + 1;
  }
  return t;
}

function topN(tally: Tally, n: number): Array<{ label: string; count: number }> {
  return Object.entries(tally)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function civDisplayName(slug: string): string {
  const c = (CIVILIZATIONS as Record<string, { name: string }>)[slug];
  return c?.name ?? slug;
}

function civColor(slug: string): string | null {
  const c = (CIVILIZATIONS as Record<string, { color: string }>)[slug];
  return c?.color ?? null;
}

const TIER_RANK: Record<string, number> = {
  "Common": 0,
  "Uncommon": 1,
  "Rare": 2,
  "Epic": 3,
  "Legendary": 4,
  "Honorary": 5,
  "One of One": 6,
};
const RARE_TIERS = new Set(["Rare", "Epic", "Legendary", "Honorary", "One of One"]);

export default async function HeatPage() {
  const sales = await fetchRecentSales(30);
  const total = sales.length;

  // For Tiers column, filter to rare-and-above only — Common dominates and would drown out the signal
  const civCounts = tally(sales, "civilization");
  const allTierCounts = tally(sales, "tier");
  const tierCounts: Tally = {};
  for (const [k, v] of Object.entries(allTierCounts)) {
    if (RARE_TIERS.has(k)) tierCounts[k] = v;
  }
  const tierTotal = Object.values(tierCounts).reduce((a, b) => a + b, 0);
  const casteCounts = tally(sales, "caste");
  const shapeCounts = tally(sales, "shape");

  const columns: Array<{
    title: string;
    rows: Array<{ label: string; count: number; color?: string | null }>;
    denom: number;
  }> = [
    {
      title: "Civilizations",
      denom: total,
      rows: topN(civCounts, 5).map((r) => ({
        label: civDisplayName(r.label),
        count: r.count,
        color: civColor(r.label),
      })),
    },
    {
      title: "Tiers (Rare+)",
      denom: tierTotal || total,
      rows: topN(tierCounts, 5)
        .sort((a, b) => (TIER_RANK[b.label] ?? 0) - (TIER_RANK[a.label] ?? 0))
        .map((r) => ({ label: r.label, count: r.count })),
    },
    {
      title: "Castes",
      denom: total,
      rows: topN(casteCounts, 5).map((r) => ({ label: r.label, count: r.count })),
    },
    {
      title: "Shapes",
      denom: total,
      rows: topN(shapeCounts, 5).map((r) => ({ label: r.label, count: r.count })),
    },
  ];

  return (
    <div className="heat-page">
      <div className="kicker" style={{ color: "var(--gold)" }}>⬡ HOT TRAITS · LAST {total || 30} SALES</div>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: "var(--t-h1)",
          lineHeight: 0.92,
          letterSpacing: "-0.02em",
          margin: "var(--s-4) 0 var(--s-3)",
          textTransform: "uppercase",
        }}
      >
        Trait Market Heat
      </h1>
      <p style={{ color: "var(--ink-2)", maxWidth: "62ch", fontSize: 17, lineHeight: 1.5 }}>
        Which traits are moving. Counts of recent sales bucketed by civilization,
        tier, caste, and shape. Refreshes every 3 minutes.
      </p>

      {total === 0 ? (
        <div
          style={{
            marginTop: "var(--s-6)",
            padding: "var(--s-6)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink-dim)",
            fontFamily: "var(--mono2)",
            fontSize: 12,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          No recent sales detected.
        </div>
      ) : (
        <div className="heat-grid">
          {columns.map((col) => (
            <div key={col.title} className="heat-col">
              <h3>{col.title}</h3>
              {col.rows.length === 0 && (
                <div
                  style={{
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                  }}
                >
                  —
                </div>
              )}
              {col.rows.map((r) => {
                const denom = col.denom || 1;
                const pct = Math.round((r.count / denom) * 100);
                return (
                  <div key={r.label}>
                    <div className="heat-row">
                      <span
                        style={{
                          color: r.color ?? "var(--ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.label}
                      </span>
                      <span style={{ color: "var(--gold-bright)" }}>
                        {r.count} · {pct}%
                      </span>
                      <div
                        className="heat-bar"
                        style={{
                          width: `${pct}%`,
                          background: r.color ?? "var(--gold)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: "var(--s-7)",
          display: "flex",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <Link className="btn btn-primary" href="/citizens"><span className="ttl">BROWSE CITIZENS →</span></Link>
        <Link className="btn btn-secondary" href="/undervalued"><span className="ttl">SEE UNDERVALUED →</span></Link>
      </div>
    </div>
  );
}

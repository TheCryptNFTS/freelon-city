import { ImageResponse } from "next/og";
import { CIVILIZATIONS, type CivilizationSlug } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600";

type RecentEvent = {
  tokenId: number | null;
  name?: string;
  priceEth?: string | null;
};

type RecentResponse = {
  events: RecentEvent[];
};

type Citizen = { id: number; civilization: string };

async function fetchRecent(origin: string): Promise<RecentResponse | null> {
  try {
    const r = await fetch(`${origin}/api/opensea/recent`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return (await r.json()) as RecentResponse;
  } catch {
    return null;
  }
}

function tallyCivs(events: RecentEvent[]): Array<{
  slug: CivilizationSlug;
  count: number;
}> {
  const citizens = citizensData as Citizen[];
  const byId = new Map<number, string>();
  for (const c of citizens) byId.set(c.id, c.civilization);

  const counts = new Map<string, number>();
  for (const ev of events) {
    if (ev.tokenId == null) continue;
    const slug = byId.get(ev.tokenId);
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([slug, count]) => ({ slug: slug as CivilizationSlug, count }))
    .filter((x) => x.slug in CIVILIZATIONS)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const recent = await fetchRecent(origin);
  const top = recent?.events ? tallyCivs(recent.events) : [];
  const maxCount = top.length > 0 ? Math.max(...top.map((t) => t.count)) : 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#050505",
          color: "#F5F2E8",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 6,
            color: "#C8A75D",
            fontFamily: "monospace",
            display: "flex",
          }}
        >
          {/* drawn hexagon — a literal ⬡ glyph tofus in satori (no font carries it) */}
          <svg width="16" height="18" viewBox="0 0 26 30" style={{ marginRight: 12 }}>
            <path d="M13 1 L25 8 L25 22 L13 29 L1 22 L1 8 Z" fill="none" stroke="#C8A75D" strokeWidth="3" />
          </svg>
          FREELON CITY · MARKET HEAT
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 600,
              color: "#F5F2E8",
              display: "flex",
              lineHeight: 1,
              letterSpacing: 2,
            }}
          >
            TRAIT HEAT · LAST 30D
          </span>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            gap: 26,
            width: "100%",
          }}
        >
          {top.length === 0 && (
            <span
              style={{
                fontSize: 26,
                color: "#888",
                fontFamily: "monospace",
                display: "flex",
                letterSpacing: 3,
              }}
            >
              — NO RECENT SALES —
            </span>
          )}
          {top.map((row) => {
            const civ = CIVILIZATIONS[row.slug];
            const pct = Math.max(8, Math.round((row.count / maxCount) * 100));
            return (
              <div
                key={row.slug}
                style={{ display: "flex", flexDirection: "column", width: "100%" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <span
                    style={{
                      fontSize: 32,
                      color: civ.color,
                      letterSpacing: 3,
                      display: "flex",
                    }}
                  >
                    {civ.name.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: 28,
                      color: "#F5F2E8",
                      fontFamily: "monospace",
                      display: "flex",
                    }}
                  >
                    {row.count} SALES
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    width: "100%",
                    height: 14,
                    background: "#15171c",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: 14,
                      background: civ.color,
                      display: "flex",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
            marginTop: "auto",
            paddingTop: 28,
            borderTop: "1px solid #1a1d26",
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com/heat</span>
          <span style={{ display: "flex", color: "#C8A75D" }}>
            THE CITY MOVES
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": CACHE },
    },
  );
}

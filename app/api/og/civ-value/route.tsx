import { ImageResponse } from "next/og";
import { CIVILIZATIONS } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

async function fetchFloor(): Promise<number> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.OPENSEA_API_KEY)
      headers["X-API-KEY"] = process.env.OPENSEA_API_KEY;
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/stats",
      { headers, next: { revalidate: 300 } }
    );
    if (!r.ok) return 0;
    const d = await r.json();
    return Number(d?.total?.floor_price || 0);
  } catch {
    return 0;
  }
}

export async function GET() {
  const floor = await fetchFloor();
  const civs = Object.entries(CIVILIZATIONS).map(([slug, c]) => ({
    slug,
    name: c.name,
    color: c.color,
    population: c.population,
    value: floor * c.population,
  }));
  const total = civs.reduce((s, c) => s + c.value, 0);
  const max = Math.max(...civs.map((c) => c.value), 1);
  const sorted = [...civs].sort((a, b) => b.value - a.value);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          padding: "50px 60px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 6,
            color: "#c8aa64",
            fontFamily: "monospace",
            display: "flex",
          }}
        >
          ⬡ 404 — FREELON CITY · COLLECTION VALUE BY CIV
        </div>
        <div
          style={{
            marginTop: 12,
            fontSize: 44,
            fontWeight: 300,
            color: "#e6e1d2",
            display: "flex",
          }}
        >
          {total.toFixed(2)} ETH{" "}
          <span style={{ color: "#888", marginLeft: 16, display: "flex" }}>
            @ floor {floor.toFixed(4)}
          </span>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            flex: 1,
          }}
        >
          {sorted.map((c) => (
            <div
              key={c.slug}
              style={{ display: "flex", alignItems: "center", gap: 14 }}
            >
              <span
                style={{
                  width: 220,
                  fontSize: 18,
                  color: "#e6e1d2",
                  display: "flex",
                }}
              >
                {c.name}
              </span>
              <div
                style={{
                  width: 620,
                  height: 22,
                  background: "#13131a",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${(c.value / max) * 100}%`,
                    height: 22,
                    background: c.color,
                    display: "flex",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 16,
                  color: "#c8aa64",
                  fontFamily: "monospace",
                  width: 140,
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {c.value.toFixed(2)} ETH
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
            marginTop: 16,
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com</span>
          <span style={{ display: "flex", color: "#c8aa64" }}>
            WE HEAR · WE SYNC · WE ARE
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": CACHE },
    }
  );
}

import { ImageResponse } from "next/og";
import { TOTAL, CIVILIZATIONS } from "@/lib/constants";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

async function fetchStats(): Promise<{
  floor: number;
  holders: number | null;
  volume: number | null;
}> {
  try {
    const headers: Record<string, string> = {};
    if (process.env.OPENSEA_API_KEY)
      headers["X-API-KEY"] = process.env.OPENSEA_API_KEY;
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/stats",
      { headers, next: { revalidate: 300 } }
    );
    if (!r.ok) return { floor: 0, holders: null, volume: null };
    const d = await r.json();
    return {
      floor: Number(d?.total?.floor_price || 0),
      holders: d?.total?.num_owners ?? null,
      volume: d?.total?.volume ?? null,
    };
  } catch {
    return { floor: 0, holders: null, volume: null };
  }
}

export async function GET() {
  const { floor, holders, volume } = await fetchStats();
  const hexIndex = floor * TOTAL;
  const civCount = Object.keys(CIVILIZATIONS).length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
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
          {/* drawn hexagon — a literal ⬡ glyph tofus in satori (no font carries it) */}
          <svg width="16" height="18" viewBox="0 0 26 30" style={{ marginRight: 12 }}>
            <path d="M13 1 L25 8 L25 22 L13 29 L1 22 L1 8 Z" fill="none" stroke="#c8aa64" strokeWidth="3" />
          </svg>
          404 — FREELON CITY · HEX INDEX
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 22,
              color: "#888",
              letterSpacing: 4,
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            TOTAL CITY VALUE
          </span>
          <span
            style={{
              fontSize: 140,
              fontWeight: 500,
              color: "#c8aa64",
              display: "flex",
              lineHeight: 1,
              marginTop: 12,
            }}
          >
            {hexIndex.toFixed(2)}
          </span>
          <span
            style={{
              fontSize: 28,
              color: "#e6e1d2",
              letterSpacing: 6,
              fontFamily: "monospace",
              display: "flex",
              marginTop: 6,
            }}
          >
            ETH
          </span>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 50,
            paddingTop: 30,
            borderTop: "1px solid #1a1d26",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              FLOOR
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {floor.toFixed(4)} ETH
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              SUPPLY
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {TOTAL}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              HOLDERS
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {holders ?? "—"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              CIVS
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {civCount}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 13,
                color: "#888",
                letterSpacing: 3,
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              VOLUME
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {volume !== null ? `${Number(volume).toFixed(1)} ETH` : "—"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
            marginTop: 24,
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com</span>
          <span style={{ display: "flex", color: "#c8aa64" }}>
            ON MARS · WE HEAR · WE SYNC · WE ARE
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

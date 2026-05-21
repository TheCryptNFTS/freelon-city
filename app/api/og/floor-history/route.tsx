import { ImageResponse } from "next/og";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600, stale-while-revalidate=1200";

type HexIndex = {
  floor: number;
  index: number;
  history: Array<{ ts: number; index: number }>;
};

async function fetchHexIndex(origin: string): Promise<HexIndex> {
  try {
    const r = await fetch(`${origin}/api/hex-index`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return { floor: 0, index: 0, history: [] };
    return (await r.json()) as HexIndex;
  } catch {
    return { floor: 0, index: 0, history: [] };
  }
}

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const hi = await fetchHexIndex(origin);
  const floor = hi.floor;
  // Real history from /api/hex-index. Each snapshot stores `index`; convert back
  // to floor (index = floor × 10000 since per-civ-floor is global here).
  const series = hi.history.length > 0
    ? hi.history.map((s) => s.index / 10000)
    : Array.from({ length: 30 }, () => floor);
  const points: number[] = series.length > 1 ? series : [floor, floor];
  const w = 1080;
  const h = 280;
  const max = Math.max(...points, floor, 0.0001) * 1.1;
  const min = 0;
  const stepX = w / Math.max(1, points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
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
          ⬡ 404 — FREELON CITY · FLOOR HISTORY
        </div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "baseline",
            gap: 20,
          }}
        >
          <span
            style={{
              fontSize: 76,
              fontWeight: 400,
              color: "#c8aa64",
              display: "flex",
            }}
          >
            {floor.toFixed(4)} ETH
          </span>
          <span
            style={{
              fontSize: 20,
              color: "#888",
              display: "flex",
              letterSpacing: 4,
              fontFamily: "monospace",
            }}
          >
            CURRENT FLOOR
          </span>
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={{ display: "block" }}
          >
            <rect x="0" y="0" width={w} height={h} fill="#0c0f16" />
            {/* grid lines */}
            {[0.25, 0.5, 0.75].map((g) => (
              <line
                key={g}
                x1={0}
                x2={w}
                y1={h * g}
                y2={h * g}
                stroke="#1a1d26"
                strokeWidth={1}
              />
            ))}
            <path
              d={path}
              fill="none"
              stroke="#c8aa64"
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#666",
            justifyContent: "center",
            marginTop: 8,
          }}
        >
          {hi.history.length > 1
            ? `${hi.history.length} DAILY SNAPSHOTS`
            : "SNAPSHOTS BUILDING — CHECK BACK TOMORROW"}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
            marginTop: 20,
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

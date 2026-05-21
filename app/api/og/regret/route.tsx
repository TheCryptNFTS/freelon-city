import { ImageResponse } from "next/og";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";

export const runtime = "nodejs";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

function regretLevel(pct: number): string {
  if (pct < 0) return "RELIEF";
  if (pct < 25) return "MILD";
  if (pct < 100) return "MODERATE";
  if (pct < 300) return "SEVERE";
  return "TERMINAL";
}

function levelColor(level: string): string {
  switch (level) {
    case "RELIEF": return "#6abf52";
    case "MILD": return "#9a9a9a";
    case "MODERATE": return "#e5794a";
    case "SEVERE": return "#c54a3a";
    case "TERMINAL": return "#ff4a3a";
  }
  return "#c8aa64";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idStr = url.searchParams.get("id") || "1";
  const pastStr = url.searchParams.get("past") || "0";
  const pctStr = url.searchParams.get("pct");
  const currentStr = url.searchParams.get("current");

  const id = Math.max(1, Math.min(4040, Number(idStr) || 1));
  const past = Number(pastStr) || 0;
  const current = currentStr != null ? Number(currentStr) : 0;
  const pct = pctStr != null ? Number(pctStr) : (past > 0 ? ((current - past) / past) * 100 : 0);
  const level = regretLevel(pct);
  const color = levelColor(level);

  const citizen = getCitizen(id);
  const civSlug = citizen?.civilization ?? "blue-synthesis";
  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[civSlug];
  const civName = civ?.name ?? "Unknown";
  const civColor = civ?.color ?? "#c8aa64";

  const id4 = id.toString().padStart(4, "0");
  const img = imageUrl(id);

  const pctDisplay = (pct >= 0 ? "+" : "") + pct.toFixed(0) + "%";

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
          flexDirection: "row",
          padding: "60px",
          position: "relative",
        }}
      >
        <div
          style={{
            width: 460,
            height: 460,
            display: "flex",
            overflow: "hidden",
            border: `2px solid ${color}`,
            background: "#000",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt="" width={460} height={460} style={{ width: 460, height: 460, objectFit: "cover" }} />
        </div>

        <div
          style={{
            flex: 1,
            marginLeft: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 18,
              letterSpacing: 6,
              color: "#c54a3a",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            ⬡ THE REGRET MACHINE
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 72,
              fontWeight: 700,
              letterSpacing: -2,
              color: "#e6e1d2",
              display: "flex",
              lineHeight: 1,
            }}
          >
            #{id4}
          </div>

          <div
            style={{
              marginTop: 6,
              fontSize: 22,
              color: civColor,
              fontFamily: "monospace",
              letterSpacing: 2,
              display: "flex",
            }}
          >
            {civName.toUpperCase()}
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 22,
              color: "#888",
              display: "flex",
              fontFamily: "monospace",
            }}
          >
            You sold for {past.toFixed(4)} ETH
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 22,
              color: "#e6e1d2",
              display: "flex",
              fontFamily: "monospace",
            }}
          >
            Current value: {current.toFixed(4)} ETH
          </div>

          <div
            style={{
              marginTop: 32,
              padding: "16px 22px",
              border: `2px solid ${color}`,
              display: "flex",
              flexDirection: "column",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ fontSize: 13, letterSpacing: 4, color: "#888", fontFamily: "monospace", display: "flex" }}>
              REGRET LEVEL
            </span>
            <span style={{ fontSize: 54, fontWeight: 800, color, letterSpacing: 2, display: "flex" }}>
              {level}
            </span>
            <span style={{ fontSize: 28, color: "#e6e1d2", fontFamily: "monospace", display: "flex", marginTop: 4 }}>
              {pctDisplay}
            </span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 13,
            letterSpacing: 4,
            color: "#666",
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com/regret</span>
          <span style={{ display: "flex", color: "#c54a3a" }}>
            SOLD BY CARRIERS WHO LEFT THE CITY
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

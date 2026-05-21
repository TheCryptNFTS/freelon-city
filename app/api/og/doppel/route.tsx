import { ImageResponse } from "next/og";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { normalizeHandle } from "@/lib/sync";

export const runtime = "nodejs";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

const REASONS = [
  "chaotic posting pattern detected",
  "signal alignment confirmed",
  "doctrinal resonance detected",
  "hex-frequency match",
  "carrier signature isolated",
  "civilizational fingerprint matched",
  "transmission cadence overlap",
  "fracture pattern reconstructed",
  "void protocol echoed in handle",
  "your noise is their signature",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("h") || "anon";
  const handle = normalizeHandle(raw) || "anon";

  const hash = fnv1a("doppel::" + handle);
  const id = (hash % 4040) + 1;
  const reason = REASONS[hash % REASONS.length];

  const citizen = getCitizen(id);
  const civSlug = citizen?.civilization ?? "blue-synthesis";
  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[civSlug];
  const civName = civ?.name ?? "Unknown";
  const civColor = civ?.color ?? "#c8aa64";

  const id4 = id.toString().padStart(4, "0");

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
            border: `2px solid ${civColor}`,
            background: "#000",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(id)} alt="" width={460} height={460} style={{ width: 460, height: 460, objectFit: "cover" }} />
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
              color: "#c8aa64",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            ⬡ SIGNAL MATCH
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: -2,
              color: "#e6e1d2",
              display: "flex",
              lineHeight: 1,
            }}
          >
            @{handle}
          </div>

          <div
            style={{
              marginTop: 12,
              fontSize: 34,
              color: "#888",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            → CITIZEN #{id4}
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 28,
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
              marginTop: 36,
              padding: "16px 22px",
              border: `1px solid #2a2a30`,
              display: "flex",
              flexDirection: "column",
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <span style={{ fontSize: 13, letterSpacing: 4, color: "#888", fontFamily: "monospace", display: "flex" }}>
              REASON
            </span>
            <span style={{ fontSize: 24, color: "#e6e1d2", display: "flex", marginTop: 6 }}>
              {reason}
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
          <span style={{ display: "flex" }}>freeloncity.com/doppelganger</span>
          <span style={{ display: "flex", color: "#c8aa64" }}>
            YOUR SIGNAL MATCH
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

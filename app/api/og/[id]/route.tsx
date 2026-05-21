import { ImageResponse } from "next/og";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return new Response("Not found", { status: 404 });

  const color = civilizationColor(c.civilization);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string }>)[c.civilization];
  const id4 = tid.toString().padStart(4, "0");
  const heading = c.transmission_name || c.honoree || `Citizen #${id4}`;
  const sub = `${c.shape} · ${c.tier}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#0a0c12",
          color: "#e6e1d2",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Left: image */}
        <div
          style={{
            width: "630px",
            height: "630px",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRight: `3px solid ${color}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl(tid)}
            width="630"
            height="630"
            alt=""
            style={{ width: "630px", height: "630px", objectFit: "cover" }}
          />
        </div>

        {/* Right: metadata */}
        <div
          style={{
            flex: 1,
            padding: "60px 50px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 18,
                letterSpacing: 6,
                color: "#c8aa64",
                fontFamily: "monospace",
                display: "flex",
              }}
            >
              ⬡ 404 — FREELON CITY · #{id4}
            </div>

            <div
              style={{
                marginTop: 36,
                fontSize: heading.length > 16 ? 52 : 64,
                fontWeight: 300,
                color: "#e6e1d2",
                lineHeight: 1.05,
                display: "flex",
              }}
            >
              {heading}
            </div>

            <div
              style={{
                marginTop: 16,
                fontSize: 22,
                color,
                display: "flex",
              }}
            >
              {sub}
            </div>

            <div
              style={{
                marginTop: 36,
                fontSize: 18,
                color: "#888888",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span style={{ display: "flex" }}>{civ?.name ?? c.civilization} · {civ?.doctrine ?? ""}</span>
              <span style={{ display: "flex" }}>{c.caste} · {c.hex_state}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "monospace",
              fontSize: 14,
              letterSpacing: 4,
              color: "#888888",
            }}
          >
            <div style={{ display: "flex" }}>404 HEX NOT FOUND</div>
            <div style={{ display: "flex", color: "#c8aa64", marginTop: 6 }}>
              ON MARS · WE HEAR · WE SYNC · WE ARE
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

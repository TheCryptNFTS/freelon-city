import { ImageResponse } from "next/og";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS, LOCAL_HEROES } from "@/lib/constants";

export const runtime = "edge";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return new Response("Not found", { status: 404 });
  const id4src = tid.toString().padStart(4, "0");
  const imgSrc = LOCAL_HEROES.has(tid)
    ? new URL(`/heroes/${id4src}.webp`, req.url).toString()
    : imageUrl(tid);

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
        {/* Left: image — civ color is load-bearing: a civ-hued edge glow + border
            so every shared card carries its civilization's signature, not a
            hairline divider. */}
        <div
          style={{
            width: "630px",
            height: "630px",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderRight: `4px solid ${color}`,
            boxShadow: `inset -60px 0 90px -40px ${color}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            width="630"
            height="630"
            alt=""
            style={{ width: "630px", height: "630px", objectFit: "cover" }}
          />
          {/* Civ-color wash riding the inner edge toward the metadata panel. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              background: `linear-gradient(90deg, transparent 62%, ${color}55 100%)`,
            }}
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
              ⬡ FREELON CITY · #{id4}
            </div>

            <div
              style={{
                marginTop: 34,
                fontSize: heading.length > 16 ? 54 : 66,
                fontWeight: 600,
                color,
                lineHeight: 1.04,
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

          {/* Thesis line — tells a cold viewer what this IS at a glance, replacing
              the old lore-noise footer. Copy-safe (no value/return language). */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontFamily: "monospace",
              fontSize: 17,
              letterSpacing: 4,
              color: "#c8aa64",
            }}
          >
            AI CHARACTER · 1 OF 4,040 · FREELONCITY.COM
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache the rendered card hard. Citizen metadata is immutable per id,
        // so this image can be cached forever. Lets X / Discord / iMessage
        // hit Vercel's CDN cache instead of re-rendering each time — which
        // is what causes social cards to silently show a placeholder.
        "Cache-Control": "public, max-age=31536000, immutable, s-maxage=31536000",
      },
    },
  );
}

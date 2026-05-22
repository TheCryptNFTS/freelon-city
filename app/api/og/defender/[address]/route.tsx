import { ImageResponse } from "next/og";
import { isValidAddress } from "@/lib/wallet-tokens";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=600";

type HexData = {
  defenderTick?: {
    qualifyingTokens?: number;
    hexCredited?: number;
    daysCredited?: number;
  };
};

async function fetchHex(origin: string, addr: string): Promise<HexData> {
  try {
    const r = await fetch(`${origin}/api/wallet/${addr}/hex`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return {};
    return (await r.json()) as HexData;
  } catch {
    return {};
  }
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  if (!isValidAddress(address)) {
    return new Response("Invalid address", { status: 400 });
  }
  const origin = new URL(req.url).origin;
  const data = await fetchHex(origin, address);
  const qualifying = data.defenderTick?.qualifyingTokens ?? 0;
  const qualifyingLabel = qualifying > 0 ? String(qualifying) : "—";

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
          ⬡ FREELON CITY · FLOOR DEFENDER
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontSize: 110,
              fontWeight: 600,
              color: "#C8A75D",
              display: "flex",
              lineHeight: 1,
              letterSpacing: 2,
            }}
          >
            FLOOR DEFENDER
          </span>
          <span
            style={{
              fontSize: 34,
              color: "#F5F2E8",
              letterSpacing: 4,
              fontFamily: "monospace",
              display: "flex",
              marginTop: 24,
            }}
          >
            {qualifyingLabel} CITIZENS HELD 30D+
          </span>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 60,
            paddingTop: 28,
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
              ADDRESS
            </span>
            <span
              style={{
                fontSize: 32,
                color: "#F5F2E8",
                fontFamily: "monospace",
                display: "flex",
                marginTop: 4,
              }}
            >
              {shortAddr(address)}
            </span>
          </div>
          {data.defenderTick?.hexCredited !== undefined &&
            data.defenderTick.hexCredited > 0 && (
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
                  LAST CREDITED
                </span>
                <span
                  style={{
                    fontSize: 32,
                    color: "#C8A75D",
                    display: "flex",
                    marginTop: 4,
                  }}
                >
                  +{data.defenderTick.hexCredited.toLocaleString()} ⬡
                </span>
              </div>
            )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
            marginTop: 22,
          }}
        >
          <span style={{ display: "flex" }}>
            The city remembers · freeloncity.com/defenders
          </span>
          <span style={{ display: "flex", color: "#C8A75D" }}>
            WE HOLD THE FLOOR
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

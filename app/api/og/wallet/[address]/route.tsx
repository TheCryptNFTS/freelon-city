import { ImageResponse } from "next/og";
import { CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { getWalletTokens, normalizeAddress } from "@/lib/wallet-tokens";

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

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const norm = normalizeAddress(address);

  const display = norm ? shortAddr(norm) : address.slice(0, 10);

  const [tokens, floor] = await Promise.all([
    norm ? getWalletTokens(norm, 500) : Promise.resolve(null),
    fetchFloor(),
  ]);
  const balance = tokens?.balance ?? 0;
  const ids = tokens?.tokenIds ?? [];
  // (netWorth = balance × floor removed — no personal valuation on the public OG card.)

  const civCounts = new Map<string, number>();
  for (const tid of ids) {
    const c = getCitizen(tid);
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
  }
  const top = [...civCounts.entries()]
    .map(([slug, count]) => {
      const def = (
        CIVILIZATIONS as Record<string, { name: string; color: string }>
      )[slug];
      return {
        name: def?.name ?? slug,
        color: def?.color ?? "#c8aa64",
        count,
        pct: balance > 0 ? (count / balance) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
          ⬡ 404 — FREELON CITY · WALLET
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 56,
            fontWeight: 300,
            color: "#e6e1d2",
            display: "flex",
            fontFamily: "monospace",
          }}
        >
          {display}
        </div>

        <div
          style={{
            marginTop: 36,
            display: "flex",
            gap: 60,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 4,
                color: "#888",
                display: "flex",
              }}
            >
              CITIZENS
            </span>
            <span
              style={{
                fontSize: 64,
                fontWeight: 500,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {balance}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 14,
                letterSpacing: 4,
                color: "#888",
                display: "flex",
              }}
            >
              FLOOR
            </span>
            <span
              style={{
                fontSize: 64,
                fontWeight: 500,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {floor.toFixed(4)}
            </span>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            flex: 1,
          }}
        >
          <span
            style={{
              fontSize: 14,
              letterSpacing: 4,
              color: "#888",
              display: "flex",
            }}
          >
            CIV ALIGNMENT
          </span>
          {top.length === 0 ? (
            <span style={{ display: "flex", fontSize: 22, color: "#666" }}>
              No FREELONS held.
            </span>
          ) : (
            top.map((c) => (
              <div
                key={c.name}
                style={{ display: "flex", alignItems: "center", gap: 16 }}
              >
                <span
                  style={{
                    width: 200,
                    fontSize: 18,
                    color: "#e6e1d2",
                    display: "flex",
                  }}
                >
                  {c.name}
                </span>
                <div
                  style={{
                    width: 600,
                    height: 14,
                    background: "#181820",
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(2, c.pct)}%`,
                      height: 14,
                      background: c.color,
                      display: "flex",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 18,
                    color: "#c8aa64",
                    fontFamily: "monospace",
                    display: "flex",
                  }}
                >
                  {c.pct.toFixed(0)}%
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "monospace",
            fontSize: 14,
            letterSpacing: 4,
            color: "#888",
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

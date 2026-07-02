import { ImageResponse } from "next/og";
import { isValidAddress } from "@/lib/wallet-tokens";

export const runtime = "nodejs";
const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

type HexData = {
  balance: number;
  lifetimeEarned: number;
  tick?: { tier?: string; balance?: number; multiplier?: number };
};

async function fetchHex(origin: string, addr: string): Promise<HexData> {
  try {
    const r = await fetch(`${origin}/api/wallet/${addr}/hex`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return { balance: 0, lifetimeEarned: 0 };
    return (await r.json()) as HexData;
  } catch {
    return { balance: 0, lifetimeEarned: 0 };
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
  const tier = data.tick?.tier ?? "Initiate";
  const citizens = data.tick?.balance ?? 0;

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
          WALLET HEX · FREELON CITY
        </div>

        <div style={{ display: "flex", marginTop: 18 }}>
          <span
            style={{
              fontSize: 24,
              color: "#888",
              letterSpacing: 4,
              fontFamily: "monospace",
            }}
          >
            {shortAddr(address)}
          </span>
        </div>

        <div
          style={{
            marginTop: 28,
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
            WALLET HEX BALANCE
          </span>
          <span
            style={{
              fontSize: 160,
              fontWeight: 500,
              color: "#c8aa64",
              display: "flex",
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            {data.balance.toLocaleString()}
          </span>
          <span
            style={{
              fontSize: 32,
              color: "#e6e1d2",
              letterSpacing: 6,
              fontFamily: "monospace",
              display: "flex",
              marginTop: 4,
            }}
          >
            {/* drawn hexagon unit mark (⬡ tofus in satori) */}
            <svg width="26" height="30" viewBox="0 0 26 30" style={{ marginRight: 14 }}>
              <path d="M13 1 L25 8 L25 22 L13 29 L1 22 L1 8 Z" fill="none" stroke="#e6e1d2" strokeWidth="2.5" />
            </svg>
            HEX
          </span>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 60,
            paddingTop: 26,
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
              LIFETIME EARNED
            </span>
            <span
              style={{
                fontSize: 36,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {data.lifetimeEarned.toLocaleString()}
              {/* drawn hexagon unit mark (⬡ tofus in satori) */}
              <svg width="22" height="26" viewBox="0 0 26 30" style={{ marginLeft: 10 }}>
                <path d="M13 1 L25 8 L25 22 L13 29 L1 22 L1 8 Z" fill="none" stroke="#e6e1d2" strokeWidth="2.5" />
              </svg>
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
              CITIZENS
            </span>
            <span
              style={{
                fontSize: 36,
                color: "#e6e1d2",
                display: "flex",
                marginTop: 4,
              }}
            >
              {citizens}
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
              TIER
            </span>
            <span
              style={{
                fontSize: 36,
                color: "#c8aa64",
                display: "flex",
                marginTop: 4,
              }}
            >
              {tier}
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
            marginTop: 18,
          }}
        >
          <span style={{ display: "flex" }}>freeloncity.com</span>
          <span style={{ display: "flex", color: "#c8aa64" }}>
            ON MARS · WE HEAR · WE SYNC · WE ARE
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}

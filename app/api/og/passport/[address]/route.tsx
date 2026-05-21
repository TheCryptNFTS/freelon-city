import { ImageResponse } from "next/og";
import { CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { getWalletTokens, normalizeAddress } from "@/lib/wallet-tokens";
import { getWalletHex, listWalletHexRecords } from "@/lib/wallet-hex-store";
import {
  classifyWallet,
  classFlavor,
} from "@/lib/wallet-classification";

export const runtime = "nodejs";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

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

  const [tokens, hex, hexRecords] = await Promise.all([
    norm ? getWalletTokens(norm, 500) : Promise.resolve(null),
    norm
      ? getWalletHex(norm)
      : Promise.resolve({
          balance: 0,
          lifetimeEarned: 0,
          claimStreak: 0,
        } as { balance: number; lifetimeEarned: number; claimStreak: number }),
    listWalletHexRecords(500),
  ]);
  const balance = tokens?.balance ?? 0;
  const ids = tokens?.tokenIds ?? [];

  // City rank
  const sortedByBalance = [...hexRecords].sort(
    (a, b) => b.balance - a.balance
  );
  const rankIdx = norm
    ? sortedByBalance.findIndex((r) => r.address === norm)
    : -1;
  const cityRank = rankIdx >= 0 ? rankIdx + 1 : null;

  // Dominant civ
  const civCounts = new Map<string, number>();
  for (const tid of ids) {
    const c = getCitizen(tid);
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
  }
  let domSlug: string | null = null;
  let domCount = 0;
  for (const [slug, n] of civCounts) {
    if (n > domCount) {
      domCount = n;
      domSlug = slug;
    }
  }
  const dom = domSlug
    ? (CIVILIZATIONS as Record<string, { name: string; color: string }>)[
        domSlug
      ]
    : null;
  const civColor = dom?.color ?? "#c8aa64";
  const civName = dom?.name ?? "—";

  const klass = classifyWallet({
    balance,
    tokenIds: ids,
    hexLifetime: hex.lifetimeEarned ?? 0,
    hexBalanceRank: cityRank,
  });
  const flavor = classFlavor(klass);
  const streak = (hex as { claimStreak?: number }).claimStreak ?? 0;
  const hexBal = hex.balance ?? 0;

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
          ⬡ FREELON CITY PASSPORT
        </div>

        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            color: "#a8a59a",
            fontFamily: "monospace",
            display: "flex",
          }}
        >
          {display}
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 104,
            fontWeight: 700,
            color: civColor,
            lineHeight: 1,
            letterSpacing: -2,
            display: "flex",
            borderBottom: `6px solid ${civColor}`,
            paddingBottom: 12,
          }}
        >
          {klass}
        </div>

        <div
          style={{
            marginTop: 38,
            display: "flex",
            gap: 36,
            justifyContent: "space-between",
          }}
        >
          {[
            { lbl: "CITIZENS", val: String(balance) },
            { lbl: "DOMINANT CIV", val: civName, color: civColor },
            { lbl: "HEX BALANCE", val: hexBal.toLocaleString() },
            { lbl: "STREAK", val: `${streak}d` },
            {
              lbl: "RANK",
              val: cityRank !== null ? `#${cityRank}` : "—",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  letterSpacing: 4,
                  color: "#888",
                  display: "flex",
                }}
              >
                {s.lbl}
              </span>
              <span
                style={{
                  fontSize: 42,
                  fontWeight: 500,
                  color: s.color ?? "#e6e1d2",
                  display: "flex",
                  marginTop: 6,
                }}
              >
                {s.val}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 50,
            fontSize: 26,
            color: "#e6e1d2",
            display: "flex",
            fontStyle: "italic",
            opacity: 0.92,
          }}
        >
          “{flavor}”
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

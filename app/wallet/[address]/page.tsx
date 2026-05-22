import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CONTRACT,
  CIVILIZATIONS,
  imageUrl,
  LOCAL_HEROES,
} from "@/lib/constants";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { HexEarningsLog } from "@/components/HexEarningsLog";
import { TitheForm } from "@/components/TitheForm";
import { ShareOG } from "@/components/ShareOG";
import {
  getWalletTokens,
  normalizeAddress,
} from "@/lib/wallet-tokens";

export const revalidate = 300;

type HolderRow = { address: string; count: number };

async function fetchAllHolders(): Promise<HolderRow[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  const wallets = new Map<string, number>();
  let next: string | null = null;
  let pages = 0;
  const MAX_PAGES = 30;
  const limit = 200;

  try {
    do {
      const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT}/nfts?limit=${limit}${
        next ? `&next=${encodeURIComponent(next)}` : ""
      }`;
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        nfts?: Array<{
          identifier?: string;
          owners?: Array<{ address?: string }>;
          owner?: string;
        }>;
        next?: string | null;
      };
      const nfts = data.nfts || [];
      for (const nft of nfts) {
        const owner =
          (Array.isArray(nft.owners) && nft.owners[0]?.address) || nft.owner;
        if (!owner) continue;
        const key = owner.toLowerCase();
        wallets.set(key, (wallets.get(key) || 0) + 1);
      }
      next = data.next ?? null;
      pages += 1;
      if (pages >= MAX_PAGES) break;
    } while (next);
  } catch {
    /* fall through */
  }

  return [...wallets.entries()]
    .map(([address, count]) => ({ address, count }))
    .sort((a, b) => b.count - a.count);
}

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

type AcquisitionEvent = { tokenId: number; timestamp: number };

async function fetchLongestHeld(
  address: string,
  tokenIds: number[]
): Promise<{ tokenId: number; timestamp: number } | null> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey || tokenIds.length === 0) return null;
  const owned = new Set(tokenIds);
  const acquisitions: AcquisitionEvent[] = [];
  let next: string | null = null;
  let pages = 0;
  const MAX_PAGES = 6;

  try {
    do {
      const url = `https://api.opensea.io/api/v2/events/accounts/${address}?event_type=transfer&chain=ethereum&limit=50${
        next ? `&next=${encodeURIComponent(next)}` : ""
      }`;
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 600 },
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        asset_events?: Array<{
          event_type?: string;
          to_address?: string;
          to_account?: { address?: string };
          event_timestamp?: number;
          nft?: { contract?: string; identifier?: string };
        }>;
        next?: string | null;
      };
      const evts = data.asset_events || [];
      for (const e of evts) {
        const toAddr = (
          e.to_address ||
          e.to_account?.address ||
          ""
        ).toLowerCase();
        if (toAddr !== address.toLowerCase()) continue;
        const contract = (e.nft?.contract || "").toLowerCase();
        if (contract !== CONTRACT.toLowerCase()) continue;
        const tid = Number(e.nft?.identifier);
        if (!Number.isFinite(tid) || !owned.has(tid)) continue;
        const ts = Number(e.event_timestamp || 0);
        if (!ts) continue;
        acquisitions.push({ tokenId: tid, timestamp: ts });
      }
      next = data.next ?? null;
      pages += 1;
      if (pages >= MAX_PAGES) break;
    } while (next);
  } catch {
    return null;
  }

  if (acquisitions.length === 0) return null;
  // Keep earliest per token (first acquisition wins for currently-owned tokens)
  const earliestByToken = new Map<number, number>();
  for (const a of acquisitions) {
    const cur = earliestByToken.get(a.tokenId);
    if (cur === undefined || a.timestamp < cur) {
      earliestByToken.set(a.tokenId, a.timestamp);
    }
  }
  let bestId = -1;
  let bestTs = Number.POSITIVE_INFINITY;
  for (const [tid, ts] of earliestByToken) {
    if (ts < bestTs) {
      bestTs = ts;
      bestId = tid;
    }
  }
  if (bestId < 0) return null;
  return { tokenId: bestId, timestamp: bestTs };
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const norm = normalizeAddress(address);
  const display = norm ? shortAddr(norm) : address;
  const ogUrl = `/api/og/wallet/${norm ?? address}`;
  return {
    title: `Wallet · ${display} · FREELON CITY`,
    description: `Public profile · FREELON holdings, civ alignment, rank.`,
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

const MAX_GALLERY = 24;

export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const norm = normalizeAddress(address);
  if (!norm) notFound();

  const [tokensRes, holders, floor] = await Promise.all([
    getWalletTokens(norm, 500),
    fetchAllHolders(),
    fetchFloor(),
  ]);

  const tokenIds = tokensRes?.tokenIds ?? [];
  const balance = tokensRes?.balance ?? 0;

  // Civ breakdown
  const civCounts = new Map<string, number>();
  for (const tid of tokenIds) {
    const c = getCitizen(tid);
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
  }
  const civBreakdown = [...civCounts.entries()]
    .map(([slug, count]) => {
      const def = (
        CIVILIZATIONS as Record<string, { name: string; color: string }>
      )[slug];
      return {
        slug,
        name: def?.name ?? slug,
        color: def?.color ?? "var(--gold)",
        count,
        pct: balance > 0 ? (count / balance) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Net worth (real per-civ floor × ownedTokens) — we currently only have a
  // collection-wide floor, so per-civ floor = collection floor.
  const netWorth = balance * floor;

  // Rank
  let rank: number | null = null;
  let totalHolders: number | null = null;
  if (holders.length > 0) {
    totalHolders = holders.length;
    const idx = holders.findIndex((h) => h.address === norm);
    rank = idx >= 0 ? idx + 1 : null;
  }

  // Longest held
  const longest = await fetchLongestHeld(norm, tokenIds);
  const longestCitizen = longest ? getCitizen(longest.tokenId) : null;

  const galleryIds = tokenIds.slice(0, MAX_GALLERY);
  const overflow = Math.max(0, tokenIds.length - MAX_GALLERY);

  return (
    <main className="wallet-page">
      <section className="wallet-hero">
        <span className="kicker">⬡ PUBLIC WALLET PROFILE</span>
        <h1 className="wallet-addr-h1">{shortAddr(norm)}</h1>
        <p className="wallet-addr-full">
          <code>{norm}</code>
        </p>
        <div className="wallet-share-row">
          <ShareOG
            text="My rank in FREELON CITY:"
            ogPath={`/api/og/rank/${norm}`}
            pagePath="/leaderboard"
            variant="secondary"
            label="SHARE MY RANK ↗"
          />
          <ShareOG
            text="I'm a Floor Defender in FREELON CITY:"
            ogPath={`/api/og/defender/${norm}`}
            pagePath="/defenders"
            variant="secondary"
            label="I'M A DEFENDER ↗"
          />
        </div>
        <p style={{ marginTop: "var(--s-3)" }}>
          <Link href={`/passport/${norm}`} className="btn btn-primary">
            <span className="ttl">VIEW PASSPORT →</span>
          </Link>
        </p>
      </section>

      <section className="wallet-stats">
        <div className="wallet-stat">
          <span className="ws-label">FREELON NET WORTH</span>
          <span className="ws-value">{netWorth.toFixed(4)} ETH</span>
          <span className="ws-sub">
            {balance} citizen{balance !== 1 ? "s" : ""} · floor{" "}
            {floor.toFixed(4)} ETH
          </span>
        </div>
        <div className="wallet-stat">
          <span className="ws-label">RANK</span>
          <span className="ws-value">
            {rank !== null && totalHolders !== null
              ? `#${rank} / ${totalHolders}`
              : balance > 0
              ? "SYNCING"
              : "Not a holder"}
          </span>
          <span className="ws-sub">among all FREELON holders</span>
        </div>
        <div className="wallet-stat">
          <span className="ws-label">LONGEST HELD</span>
          {longest && longestCitizen ? (
            <>
              <Link
                href={`/citizens/${longest.tokenId}`}
                className="ws-value ws-link"
              >
                #{longest.tokenId.toString().padStart(4, "0")}
              </Link>
              <span className="ws-sub">
                since{" "}
                {new Date(longest.timestamp * 1000).toLocaleDateString(
                  undefined,
                  { year: "numeric", month: "short", day: "numeric" }
                )}
              </span>
            </>
          ) : (
            <>
              <span className="ws-value">SYNCING</span>
              <span className="ws-sub">indexing on-chain history</span>
            </>
          )}
        </div>
      </section>

      <section className="wallet-hex-section" style={{ marginTop: "var(--s-5)" }}>
        <HexEarningsLog address={norm} />
      </section>

      <section className="wallet-tithe-section" style={{ marginTop: "var(--s-5)" }}>
        <TitheForm
          address={norm}
          civs={Object.entries(CIVILIZATIONS).map(([slug, c]) => ({ slug, name: c.name, color: c.color }))}
        />
      </section>

      <section className="wallet-civs">
        <h2 className="kicker">⬡ CIV ALIGNMENT</h2>
        {civBreakdown.length === 0 ? (
          <p className="wallet-empty">No FREELONS in this wallet.</p>
        ) : (
          <ul className="wallet-civ-list">
            {civBreakdown.map((c) => (
              <li
                key={c.slug}
                className="wallet-civ-row"
                style={{ "--civ": c.color } as React.CSSProperties}
              >
                <span className="wcr-name">{c.name}</span>
                <span className="wcr-bar-wrap">
                  <span
                    className="wcr-bar"
                    style={{ width: `${c.pct}%`, background: c.color }}
                  />
                </span>
                <span className="wcr-pct">{c.pct.toFixed(0)}%</span>
                <span className="wcr-count">{c.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wallet-gallery">
        <h2 className="kicker">
          ⬡ CITIZEN GALLERY{" "}
          <span className="gallery-count">
            {balance > 0 ? `· ${balance}` : ""}
          </span>
        </h2>
        {galleryIds.length === 0 ? (
          <p className="wallet-empty">Nothing to show.</p>
        ) : (
          <ul className="wallet-grid">
            {galleryIds.map((tid) => {
              const c = getCitizen(tid);
              const color = c ? civilizationColor(c.civilization) : "var(--gold)";
              const id4 = tid.toString().padStart(4, "0");
              const src = LOCAL_HEROES.has(tid)
                ? `/heroes/${id4}.webp`
                : imageUrl(tid);
              return (
                <li key={tid} className="wallet-grid-item">
                  <Link href={`/citizens/${tid}`}>
                    <span
                      className="wgi-frame"
                      style={{ borderColor: color }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`#${id4}`} loading="lazy" />
                    </span>
                    <span className="wgi-id">#{id4}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {overflow > 0 && (
          <a
            href={`https://opensea.io/${norm}`}
            target="_blank"
            rel="noreferrer"
            className="wallet-overflow"
          >
            +{overflow} more on OpenSea ↗
          </a>
        )}
      </section>

      <section className="wallet-foot">
        <Link href="/dashboard" className="btn btn-ghost">
          <span className="ttl">← Dashboard</span>
        </Link>
        <a
          href={`https://etherscan.io/address/${norm}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          <span className="ttl">Etherscan ↗</span>
        </a>
        <a
          href={`https://opensea.io/${norm}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          <span className="ttl">OpenSea ↗</span>
        </a>
      </section>
      <section className="wallet-next" style={{ maxWidth: 1100, margin: "var(--s-6) auto 0", padding: "0 var(--s-4)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          Your passport classifies this wallet by holdings, hex, streak, and rank.
        </p>
        <Link href={`/passport/${norm}`} className="btn btn-primary">
          <span className="ttl">VIEW PASSPORT →</span>
        </Link>
      </section>
    </main>
  );
}

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
import { getWalletHex } from "@/lib/wallet-hex-store";
import { getWalletArtefacts } from "@/lib/wallet-artefacts";
import { ArtefactGallery } from "@/components/ArtefactGallery";
import { ECONOMY } from "@/lib/economy-constants";
import { StampViewerAddr } from "@/components/StampViewerAddr";
import { CarrierHealthCta } from "@/components/CarrierHealthCta";
import { NotificationInbox } from "@/components/NotificationInbox";
import { FeaturedCitizenPicker } from "@/components/FeaturedCitizenPicker";
import { CANON } from "@/lib/canon";

export const revalidate = 300;

type HolderRow = { address: string; count: number };

async function fetchAllHolders(): Promise<HolderRow[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  const wallets = new Map<string, number>();
  let next: string | null = null;
  let pages = 0;
  // Lowered from 30 to 10 to keep the server component well under Vercel's
  // 10s function timeout. 10 pages × 200 = 2000 NFTs, which covers >99% of
  // wallets. Larger wallets simply show a partial holders set; their rank
  // computation will be conservative but the page still renders fast.
  //
  // Also enforce a hard wall-clock budget (7s) — when OpenSea is slow,
  // pagination alone could blow past 10s. If we run out of time, return
  // what we've got and let the rank be approximate.
  const MAX_PAGES = 10;
  const HARD_BUDGET_MS = 7000;
  const startedAt = Date.now();
  const limit = 200;

  try {
    do {
      if (Date.now() - startedAt > HARD_BUDGET_MS) break;
      const url = `https://api.opensea.io/api/v2/chain/ethereum/contract/${CONTRACT}/nfts?limit=${limit}${
        next ? `&next=${encodeURIComponent(next)}` : ""
      }`;
      const remainingMs = Math.max(500, HARD_BUDGET_MS - (Date.now() - startedAt));
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), remainingMs);
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
        signal: ac.signal,
      }).catch(() => null);
      clearTimeout(timer);
      if (!res || !res.ok) break;
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
  // Hard wall-clock budget (matches fetchHolders above): with no per-fetch
  // timeout, 6 sequential pages against a slow OpenSea could blow past Vercel's
  // 10s function limit and 500 the whole page. Bound the loop and abort each
  // fetch on the remaining budget; partial data just yields an approximate
  // "longest held" rather than a crash.
  const HARD_BUDGET_MS = 7000;
  const startedAt = Date.now();

  try {
    do {
      if (Date.now() - startedAt > HARD_BUDGET_MS) break;
      const url = `https://api.opensea.io/api/v2/events/accounts/${address}?event_type=transfer&chain=ethereum&limit=50${
        next ? `&next=${encodeURIComponent(next)}` : ""
      }`;
      const remainingMs = Math.max(500, HARD_BUDGET_MS - (Date.now() - startedAt));
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), remainingMs);
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 600 },
        signal: ac.signal,
      }).catch(() => null);
      clearTimeout(timer);
      if (!res || !res.ok) break;
      type RawTransferEv = {
        event_type?: string;
        to_address?: string;
        to_account?: { address?: string };
        event_timestamp?: number;
        nft?: { contract?: string; identifier?: string };
      };
      const data = (await res.json()) as { asset_events?: RawTransferEv[]; events?: RawTransferEv[]; next?: string | null };
      // OpenSea has historically shipped these under both `asset_events`
      // (current) and `events` (legacy/some endpoints). Accept either.
      const { extractEvents } = await import("@/lib/opensea-fetch");
      const evts = extractEvents<RawTransferEv>(data);
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
    title: `Wallet · ${display}`,
    description: `Public profile · FREELON holdings, civ alignment, rank.`,
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

// Show the holder's WHOLE fleet on-site (lazy-loaded), not a 24-tile teaser that
// punted the rest to OpenSea — a holder's home should keep their citizens here.
// Capped high only to bound pathological wallets (tokens are already ≤500).
const MAX_GALLERY = 200;

export default async function WalletPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const norm = normalizeAddress(address);
  if (!norm) notFound();

  const [tokensRes, holders, hexRec, artefacts] = await Promise.all([
    getWalletTokens(norm, 500),
    fetchAllHolders(),
    getWalletHex(norm).catch(() => null),
    getWalletArtefacts(norm).catch(() => []),
  ]);

  // Carrier Health: derived from lastActiveDay (claim/sweep/snipe/sale).
  // ACTIVE  = activity within ECONOMY.ACTIVITY_DECAY_DAYS - 4
  // COOLING = within 4 days of the cliff
  // COLD    = decayed; passive earnings paused until next active action
  const todayISO = new Date().toISOString().slice(0, 10);
  function daysBetween(from: string | null | undefined, to: string): number {
    if (!from) return Infinity;
    const f = Date.parse(from + "T00:00:00Z");
    const t = Date.parse(to + "T00:00:00Z");
    if (!isFinite(f) || !isFinite(t)) return Infinity;
    return Math.max(0, Math.round((t - f) / 86400000));
  }
  const daysSinceActive = hexRec?.lastActiveDay
    ? daysBetween(hexRec.lastActiveDay, todayISO)
    : null;
  const isCold = daysSinceActive !== null && daysSinceActive >= ECONOMY.ACTIVITY_DECAY_DAYS;
  const isCooling =
    daysSinceActive !== null &&
    !isCold &&
    daysSinceActive >= ECONOMY.ACTIVITY_DECAY_DAYS - 4;
  // Carrier health uses canon phrases as the pill label so the brand voice
  // stays consistent across every wallet view.
  const health: { state: string; color: string; msg: string } =
    daysSinceActive === null
      ? { state: CANON.IDENTITY, color: "var(--ink-dim)", msg: "Post to start earning." }
      : isCold
      ? { state: CANON.LOST, color: "#FF5A4D", msg: `Earnings paused · ${daysSinceActive}d inactive · post to restore` }
      : isCooling
      ? { state: "COOLING", color: "#E8B247", msg: `${ECONOMY.ACTIVITY_DECAY_DAYS - daysSinceActive}d until ${CANON.LOST.toLowerCase()} · post to reset` }
      : daysSinceActive <= 1
      ? { state: CANON.RESTORED, color: "var(--state-active)", msg: `Active today · meter flowing` }
      : { state: CANON.ONLINE, color: "var(--state-active)", msg: `${daysSinceActive}d since last action` };

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
    <div className="wallet-page">
      <StampViewerAddr addr={norm} />
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
        </div>
        <p style={{ marginTop: "var(--s-3)" }}>
          <Link href={`/passport/${norm}`} className="btn btn-primary">
            <span className="ttl">VIEW PASSPORT →</span>
          </Link>
        </p>
      </section>

      {/* Phase 3: STATS FIRST. The investor question — "what does this
          wallet own + what's it worth" — lands before any carrier-health
          state. Carrier health stays on the page but moves below as a
          smaller status strip. */}
      <section className="wallet-stats">
        {/* Citizens held — not a valuation. The old "NET WORTH · X ETH" figure
            (balance×floor) was a price/return claim on the most-shared surface;
            removed for copy-safety (upgrade audit). */}
        <div className="wallet-stat">
          <span className="ws-label">CITIZENS</span>
          <span className="ws-value">{balance}</span>
          <span className="ws-sub">
            FREELON{balance !== 1 ? "s" : ""} in this wallet
          </span>
        </div>
        <div className="wallet-stat">
          <span className="ws-label">RANK</span>
          <span className="ws-value">
            {rank !== null && totalHolders !== null
              ? `#${rank} / ${totalHolders}`
              : balance > 0
              ? "SYNCING"
              : "0 citizens"}
          </span>
          <span className="ws-sub">among all carriers</span>
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
              <span className="ws-sub">syncing work history</span>
            </>
          )}
        </div>
      </section>

      {/* Phase 3: carrier-health relocated here (below stats). Same data,
          less visual dominance — a quiet status strip rather than the
          loudest card on the page. */}
      <section
        className="wallet-health"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s-3)",
          padding: "10px var(--s-4)",
          margin: "var(--s-4) auto",
          border: `1px solid ${health.color}33`,
          background: `${health.color}08`,
          borderRadius: 999,
          maxWidth: 1100,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--mono2)",
            fontSize: 11,
            letterSpacing: "0.22em",
            color: health.color,
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: health.color,
              boxShadow: `0 0 8px ${health.color}`,
            }}
          />
          CARRIER · {health.state}
        </span>
        <span style={{ color: "var(--ink-2)", fontSize: 13, fontFamily: "var(--mono2)" }}>
          {health.msg}
        </span>
        {(health.state === CANON.IDENTITY || health.state === CANON.LOST || health.state === "COOLING") && (
          <CarrierHealthCta pageWallet={norm} baseColor={health.color} />
        )}
      </section>

      <NotificationInbox />

      {/* Featured citizen picker (Peterhawk71 spec 2026-05-25). Self-
          gates: only renders when the cookie-stored viewer address
          matches THIS wallet. Empty when wallet holds 0 citizens. */}
      <FeaturedCitizenPicker walletAddress={norm} ownedTokenIds={tokenIds} />

      <section className="wallet-hex-section" style={{ marginTop: "var(--s-6)" }}>
        <HexEarningsLog address={norm} />
      </section>

      <section className="wallet-tithe-section" style={{ marginTop: "var(--s-6)" }}>
        <TitheForm
          address={norm}
          civs={Object.entries(CIVILIZATIONS).map(([slug, c]) => ({ slug, name: c.name, color: c.color }))}
        />
      </section>

      <section className="wallet-civs">
        <h2 className="kicker">⬡ CIV ALIGNMENT</h2>
        {civBreakdown.length === 0 ? (
          <p className="wallet-empty">The wall is blank · No citizens on file.</p>
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

      <section className="wallet-gallery" id="citizens">
        <h2 className="kicker">
          ⬡ CITIZENS · RUN AN AGENT{" "}
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
                  {/* Deep-link straight to the agent workspace so a connected
                      holder is one click from running, not parked on a photo. */}
                  <Link href={`/agent/${tid}`}>
                    <span
                      className="wgi-frame"
                      style={{ borderColor: color }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`#${id4}`} loading="lazy" />
                    </span>
                    <span className="wgi-id">#{id4}</span>
                    <span className="wgi-run">RUN AGENT →</span>
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

      {/* The rest of the city this wallet carries — The Crypt, Crypt TCG, OOGIES,
          Emile, SMILES — as FREELON-grade cards (art + traits), not just a count. */}
      <ArtefactGallery groups={artefacts} />

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
      <section className="wallet-next" style={{ maxWidth: 1100, margin: "var(--s-7) auto 0", padding: "var(--s-5) var(--s-4) 0", textAlign: "center", borderTop: "1px solid var(--line)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          Your passport classifies this wallet by holdings, hex, streak, and rank.
        </p>
        <Link href={`/passport/${norm}`} className="btn btn-primary">
          <span className="ttl">VIEW PASSPORT →</span>
        </Link>
      </section>
    </div>
  );
}

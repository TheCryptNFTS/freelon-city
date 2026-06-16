import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CIVILIZATIONS,
  imageUrl,
  LOCAL_HEROES,
} from "@/lib/constants";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { getWalletTokens, normalizeAddress } from "@/lib/wallet-tokens";
import { getWalletHex, listWalletHexRecords } from "@/lib/wallet-hex-store";
import { getXVerification } from "@/lib/x-store";
import {
  classifyWallet,
  classFlavor,
  type WalletClass,
} from "@/lib/wallet-classification";
import { getWalletSet } from "@/lib/signal-set";
import { getWalletArtefacts } from "@/lib/wallet-artefacts";
import { ArtefactGallery } from "@/components/ArtefactGallery";

export const revalidate = 120;

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
  const ogUrl = `/api/og/passport/${norm ?? address}`;
  return {
    // The root layout already appends "· FREELON CITY" via title.template.
    // Do not include the suffix here or the title doubles.
    title: `Passport · ${display}`,
    description: `Citizen passport · classification, civ alignment, hex balance, signal streak, city rank.`,
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

const MAX_THUMBS = 12;

export default async function PassportPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const norm = normalizeAddress(address);
  if (!norm) notFound();

  const [tokensRes, hex, x, hexRecords, set, artefacts] = await Promise.all([
    getWalletTokens(norm, 500),
    getWalletHex(norm),
    getXVerification(norm),
    listWalletHexRecords(500),
    getWalletSet(norm),
    getWalletArtefacts(norm),
  ]);

  const tokenIds = tokensRes?.tokenIds ?? [];
  const balance = tokensRes?.balance ?? 0;

  // City rank by current hex balance
  const sortedByBalance = [...hexRecords].sort(
    (a, b) => b.balance - a.balance
  );
  const rankIdx = sortedByBalance.findIndex((r) => r.address === norm);
  const cityRank = rankIdx >= 0 ? rankIdx + 1 : null;
  const totalRanked = sortedByBalance.length;

  // Civ + caste breakdown
  const civCounts = new Map<string, number>();
  const casteCounts = new Map<string, number>();
  for (const tid of tokenIds) {
    const c = getCitizen(tid);
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
    casteCounts.set(c.caste, (casteCounts.get(c.caste) || 0) + 1);
  }
  let dominantCivSlug: string | null = null;
  let dominantCount = 0;
  for (const [slug, n] of civCounts) {
    if (n > dominantCount) {
      dominantCount = n;
      dominantCivSlug = slug;
    }
  }
  const dominantCiv = dominantCivSlug
    ? (CIVILIZATIONS as Record<string, { name: string; color: string }>)[
        dominantCivSlug
      ]
    : null;
  const civColor = dominantCiv?.color ?? "var(--gold)";

  let dominantCaste: string | null = null;
  let dominantCasteCount = 0;
  for (const [name, n] of casteCounts) {
    if (n > dominantCasteCount) {
      dominantCasteCount = n;
      dominantCaste = name;
    }
  }

  const klass: WalletClass = classifyWallet({
    balance,
    tokenIds,
    hexLifetime: hex.lifetimeEarned ?? 0,
    hexBalanceRank: cityRank,
  });
  const flavor = classFlavor(klass);

  const thumbIds = tokenIds.slice(0, MAX_THUMBS);

  const ogUrl = `/api/og/passport/${norm}`;
  const { tweetPassport, tweetIntent } = await import("@/lib/share");
  const tweetText = tweetPassport({ klass, address: norm, balance });
  const tweetUrl = tweetIntent(tweetText);

  return (
    <div
      className="passport"
      style={{ "--civ": civColor } as React.CSSProperties}
    >
      <header className="passport-header">
        <div className="passport-header-row">
          <span className="kicker">⬡ FREELON CITY PASSPORT</span>
          {x?.xHandle ? (
            <a
              href={`https://x.com/${x.xHandle}`}
              target="_blank"
              rel="noreferrer"
              className="kicker"
              style={{ color: "var(--gold)" }}
            >
              ✓ VERIFIED · @{x.xHandle}
            </a>
          ) : null}
        </div>
        <p className="passport-header-addr mono">
          {shortAddr(norm)} · <code>{norm}</code>
        </p>
      </header>

      <div className="passport-issued">
        <span>⬡ ISSUED · {new Date().toISOString().slice(0, 10).toUpperCase()}</span>
        <span>BEARER · {shortAddr(norm)}</span>
      </div>
      <h1 className="passport-class">{klass}</h1>
      <p className="passport-flavor">{flavor}</p>
      <div className="passport-rule" />

      {/* Class ladder — tells viewers what every class means and what's next */}
      <details style={{ margin: "var(--s-3) 0", border: "1px solid var(--line)", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
        <summary style={{ cursor: "pointer", padding: "12px 14px", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
            ⬡ HOW PASSPORTS ARE CLASSIFIED
          </span>
          <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.2em" }}>EXPAND ▾</span>
        </summary>
        <div style={{ padding: "0 14px 14px" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--mono2)", fontSize: 11, lineHeight: 1.6 }}>
            <li><strong style={{ color: "var(--gold)" }}>SIGNAL WHALE</strong> · top 25 by hex balance — the rarest tier</li>
            <li><strong style={{ color: "var(--gold)" }}>THE CULTIST</strong> · 5+ citizens, 90%+ in a single civilization</li>
            <li><strong style={{ color: "var(--gold)" }}>THE COLLECTOR</strong> · 10+ citizens across 5+ civilizations</li>
            <li><strong style={{ color: "var(--gold)" }}>FLOOR SIGNAL BEARER</strong> · 5+ citizens held 30+ days</li>
            <li><strong style={{ color: "var(--gold)" }}>RELIC HUNTER</strong> · holds at least 1 honorary or 1-of-1</li>
            <li><strong style={{ color: "var(--gold)" }}>SIGNAL CARRIER</strong> · 2–4 citizens</li>
            <li><strong style={{ color: "var(--gold)" }}>INITIATE</strong> · exactly 1 citizen</li>
            <li><strong style={{ color: "var(--ink-dim)" }}>WITNESS</strong> · no citizens — read-only</li>
          </ul>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.05em", lineHeight: 1.6 }}>
            Classes are evaluated in priority order — Signal Whale first, then Cultist, then Collector, etc.
            You hold the FIRST class your holdings qualify for.
          </p>
        </div>
      </details>


      <div className="passport-grid">
        <div className="passport-cell">
          <span className="lbl">Citizens held</span>
          <span className="val">{balance}</span>
        </div>
        <div className="passport-cell">
          <span className="lbl">Dominant civ</span>
          <span className="val" style={{ color: civColor }}>
            {dominantCiv?.name ?? "SYNCING"}
          </span>
        </div>
        <div className="passport-cell">
          <span className="lbl">Caste alignment</span>
          <span className="val">{dominantCaste ?? "SYNCING"}</span>
        </div>
        <div className="passport-cell">
          <span className="lbl">Hex balance</span>
          <span className="val">{(hex.balance ?? 0).toLocaleString()}</span>
        </div>
        <div className="passport-cell">
          <span className="lbl">Hex lifetime</span>
          <span className="val">
            {(hex.lifetimeEarned ?? 0).toLocaleString()}
          </span>
        </div>
        <div className="passport-cell">
          <span className="lbl">Signal streak</span>
          <span className="val">{hex.claimStreak ?? 0}d</span>
        </div>
        <div className="passport-cell">
          <span className="lbl">City rank</span>
          <span className="val">
            {cityRank !== null
              ? `#${cityRank}${totalRanked ? ` / ${totalRanked}` : ""}`
              : "SYNCING"}
          </span>
        </div>
      </div>

      {/* ── THE FULL SIGNAL — cross-collection set ─────────────────── */}
      <h2 className="kicker passport-section-kicker" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span>⬡ ARTEFACT ALIGNMENT</span>
        <span style={{ fontFamily: "var(--mono2)", color: set.full ? "var(--gold)" : "var(--ink-dim)" }}>
          {set.full ? "★ FULL SIGNAL" : `${set.tiersHeld} / ${set.entries.length}`}
        </span>
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 8,
          margin: "var(--s-2) 0 var(--s-4)",
        }}
      >
        {set.entries.map((e) => (
          <div
            key={e.slug}
            title={e.unknown ? "Holdings unavailable — syncing" : e.has ? `${e.count}${e.count >= 50 ? "+" : ""} held` : "Not held"}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${e.has ? e.color : "var(--line)"}`,
              background: e.has ? "rgba(255,255,255,0.03)" : "transparent",
              opacity: e.has ? 1 : 0.4,
            }}
          >
            <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: e.has ? e.color : "var(--ink-dim)" }}>
              {e.has ? "⬡" : e.unknown ? "…" : "○"} {e.role}
            </span>
            <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)" }}>
              {e.name}
              {e.has && !e.unknown ? (
                <span style={{ color: "var(--ink-dim)" }}>{` · ${e.count >= 50 ? "50+" : e.count}`}</span>
              ) : null}
            </span>
          </div>
        ))}
      </div>
      {set.full ? (
        <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--gold)", letterSpacing: "0.05em", margin: "0 0 var(--s-4)", lineHeight: 1.6 }}>
          This wallet carries the FULL SIGNAL — one artefact from every layer of the city. The complete set.
        </p>
      ) : set.partial ? (
        <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", margin: "0 0 var(--s-4)" }}>
          Some holdings are still syncing — alignment is provisional.
        </p>
      ) : null}

      {/* The actual owned tokens across the five sister collections — FREELON-grade
          cards (art + traits + lore) instead of the bare set chips above. FREELONS
          gets its own dedicated "CITIZENS OWNED" gallery below. */}
      <ArtefactGallery groups={artefacts} />

      {thumbIds.length > 0 ? (
        <>
          <h2 className="kicker passport-section-kicker">
            ⬡ CITIZENS OWNED
          </h2>
          <div className="passport-citizens">
            {thumbIds.map((tid) => {
              const c = getCitizen(tid);
              const color = c
                ? civilizationColor(c.civilization)
                : "var(--gold)";
              const id4 = tid.toString().padStart(4, "0");
              const src = LOCAL_HEROES.has(tid)
                ? `/heroes/${id4}.webp`
                : imageUrl(tid);
              return (
                <Link
                  key={tid}
                  href={`/citizens/${tid}`}
                  style={{ borderColor: color }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`#${id4}`} loading="lazy" />
                </Link>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="passport-share">
        <a
          href={tweetUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary"
        >
          <span className="ttl">GENERATE PASSPORT CARD ↗</span>
        </a>
        <a href={ogUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
          <span className="ttl">VIEW CARD IMAGE</span>
        </a>
        <Link href={`/wallet/${norm}`} className="btn btn-ghost">
          <span className="ttl">← Wallet</span>
        </Link>
      </div>
      <section className="passport-next" style={{ maxWidth: 1100, margin: "var(--s-7) auto 0", padding: "var(--s-5) var(--s-4) 0", textAlign: "center", borderTop: "1px solid var(--line)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          Share your card. Every passport posted strengthens the city.
        </p>
        <a className="btn btn-primary" href={tweetUrl} target="_blank" rel="noreferrer">
          <span className="ttl">POST PASSPORT TO X ↗</span>
        </a>
      </section>
    </div>
  );
}

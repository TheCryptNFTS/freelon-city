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
    title: `Passport · ${display} · FREELON CITY`,
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

  const [tokensRes, hex, x, hexRecords] = await Promise.all([
    getWalletTokens(norm, 500),
    getWalletHex(norm),
    getXVerification(norm),
    listWalletHexRecords(500),
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
  const civColor = dominantCiv?.color ?? "#c8aa64";

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
  const tweetText = `My FREELON CITY passport: ${klass}\n\nfreeloncity.com/passport/${norm}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    tweetText
  )}`;

  return (
    <main
      className="passport"
      style={{ "--civ": civColor } as React.CSSProperties}
    >
      <header style={{ marginBottom: "var(--s-4)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--s-3)",
          }}
        >
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
        <p
          className="mono"
          style={{
            fontFamily: "var(--mono)",
            color: "var(--ink-2)",
            marginTop: "var(--s-2)",
            wordBreak: "break-all",
          }}
        >
          {shortAddr(norm)} · <code style={{ fontSize: 12 }}>{norm}</code>
        </p>
      </header>

      <div className="passport-issued">
        <span>⬡ ISSUED · {new Date().toISOString().slice(0, 10).toUpperCase()}</span>
        <span>BEARER · {shortAddr(norm)}</span>
      </div>
      <h1
        className="passport-class"
        style={{ fontSize: "clamp(72px, 12vw, 160px)", lineHeight: 0.9, letterSpacing: "-0.04em" }}
      >
        {klass}
      </h1>
      <p className="passport-flavor">{flavor}</p>
      <div className="passport-rule" />

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

      {thumbIds.length > 0 ? (
        <>
          <h2 className="kicker" style={{ marginBottom: "var(--s-3)" }}>
            ⬡ CITIZENS OWNED
          </h2>
          <div className="passport-citizens">
            {thumbIds.map((tid) => {
              const c = getCitizen(tid);
              const color = c
                ? civilizationColor(c.civilization)
                : "#c8aa64";
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
      <section className="passport-next" style={{ maxWidth: 1100, margin: "var(--s-6) auto 0", padding: "0 var(--s-4)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          Share your card. Every passport posted strengthens the city.
        </p>
        <a className="btn btn-primary" href={tweetUrl} target="_blank" rel="noreferrer">
          <span className="ttl">POST PASSPORT TO X ↗</span>
        </a>
      </section>
    </main>
  );
}

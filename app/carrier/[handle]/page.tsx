import type { Metadata } from "next";
import Link from "next/link";
import { syncHandle, normalizeHandle } from "@/lib/sync";
import { getCarrier } from "@/lib/carrier-store";
import { tier } from "@/lib/carrier";
import { CIVILIZATIONS, imageUrl, LOCAL_HEROES } from "@/lib/constants";
import { getWalletByHandle } from "@/lib/x-store";
import { getWalletTokens } from "@/lib/wallet-tokens";
import { getWalletHex } from "@/lib/wallet-hex-store";
import { getCitizenMeta } from "@/lib/citizen-meta";
import { tweetCarrier, tweetIntent } from "@/lib/share";

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const h = normalizeHandle(handle);
  if (!h) return { title: "Carrier not found" };
  const r = syncHandle(h);
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[r.civilization];
  return {
    title: `@${h} → ${civ?.name} · CARRIER`,
    description: `@${h} carries the signal for ${civ?.name}. Patron citizen #${r.patron.id.toString().padStart(4,"0")}.`,
    openGraph: { images: [{ url: `/api/og/${r.patron.id}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [`/api/og/${r.patron.id}`] },
  };
}

export default async function CarrierPublicPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const h = normalizeHandle(handle);
  const r = syncHandle(h);
  const live = await getCarrier(h).catch(() => null);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string; color: string; population: number; chant: string }>)[r.civilization];
  const id4 = r.patron.id.toString().padStart(4, "0");
  const t = live ? tier(live.rank) : null;

  // Resolve X-verified wallet for this handle (if the user verified via wallet
  // bind). When found, enrich the public profile with real holdings / hex /
  // portfolio. Each step deadline-guarded so a slow upstream can't 502 the page.
  const wallet = await getWalletByHandle(h).catch(() => null);
  let verified: null | {
    wallet: string;
    balance: number;
    tokenIds: number[];
    hexBalance: number;
    citizens: number;
    topCitizens: Array<{ tokenId: number; lastSaleEth: number | null; daysHeld: number | null }>;
  } = null;
  if (wallet) {
    const [tokensRes, hexRec] = await Promise.all([
      getWalletTokens(wallet, 500).catch(() => null),
      getWalletHex(wallet).catch(() => null),
    ]);
    const tokenIds = tokensRes?.tokenIds ?? [];
    const balance = tokensRes?.balance ?? 0;
    const hexBalance = hexRec?.balance ?? 0;
    // Pull last-sale for top 6 owned citizens (parallel, 5s overall deadline).
    type CitRow = { tokenId: number; lastSaleEth: number | null; daysHeld: number | null };
    const sample: number[] = tokenIds.slice(0, 6);
    const fallback: CitRow[] = sample.map((tid) => ({ tokenId: tid, lastSaleEth: null, daysHeld: null }));
    const metaPromise: Promise<CitRow[]> = Promise.all(
      sample.map((tid): Promise<CitRow> =>
        getCitizenMeta(tid)
          .then((m): CitRow => ({ tokenId: tid, lastSaleEth: m.lastSaleEth, daysHeld: m.daysHeld }))
          .catch((): CitRow => ({ tokenId: tid, lastSaleEth: null, daysHeld: null })),
      ),
    );
    const deadlinePromise: Promise<CitRow[]> = new Promise((res) =>
      setTimeout(() => res(fallback), 5000),
    );
    const topCitizens: CitRow[] = await Promise.race([metaPromise, deadlinePromise]);
    verified = {
      wallet,
      balance,
      tokenIds,
      hexBalance,
      citizens: balance,
      topCitizens,
    };
  }

  const tweet = tweetCarrier({
    handle: h,
    civName: civ?.name ?? r.civilization,
    patronId: r.patron.id,
    doctrine: civ?.doctrine ?? "",
  });
  const intent = tweetIntent(tweet);

  return (
    <div className="carrier-public" style={{ "--civ": civ?.color } as React.CSSProperties}>
      <section className="cp-hero">
        <div className="cp-left">
          <span className="kicker">⬡ CARRIER · PUBLIC PROFILE</span>
          <h1>
            @{h} carries<br />
            for <em style={{ color: civ?.color }}>{civ?.name}</em>
          </h1>
          <div className="cp-doctrine">{civ?.doctrine?.toUpperCase()}</div>
          {live && t && (
            <div className="cp-rank" style={{ color: t.color, borderColor: t.color }}>
              {t.name} · RANK {live.rank} · {live.streak}d STREAK · {live.totalRelays} RELAYS
            </div>
          )}
          <div className="cp-chant" style={{ color: civ?.color }}>&ldquo;{civ?.chant}&rdquo;</div>
          <dl className="cp-stats">
            <div><dt>CASTE</dt><dd>{r.caste}</dd></div>
            <div><dt>CIV POPULATION</dt><dd>{civ?.population}</dd></div>
            <div><dt>SAME-CIV SPREAD</dt><dd>{r.spread}</dd></div>
          </dl>
        </div>
        <Link href={`/citizens/${r.patron.id}`} className="cp-patron">
          <div className="lbl">YOUR TRIBE&apos;S FACE · ALIGNED</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(r.patron.id)} alt={r.patron.name} />
          <div className="meta">
            <div className="id">#{id4}</div>
            <div className="name">{r.patron.name}</div>
          </div>
          {/* 2026-06-05 onboarding fix: holders were confused, thinking this
              X-handle-aligned citizen was THEIRS. Make alignment vs ownership
              explicit right under the image. */}
          <div className="cp-aligned-note">
            Aligned to your X handle — <strong>you don&apos;t own this one</strong>. Owning a FREELON means buying the NFT.
          </div>
        </Link>
      </section>
      {/* This is a public conversion page — BUY is the one primary action.
          Share (viral) is secondary; entering the civ + claiming a carrier are
          tertiary. One gold button per screen. */}
      <section className="cp-cta">
        <a className="btn btn-primary" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
          <span className="lbl">OWN ONE</span>
          <span className="ttl">BUY A FREELON ↗</span>
        </a>
        <a className="btn btn-secondary" href={intent} target="_blank" rel="noreferrer">
          <span className="lbl">RELAY</span>
          <span className="ttl">SHARE THIS PROFILE <span className="ar">→</span></span>
        </a>
        <Link className="btn btn-ghost" href={`/civilizations/${r.civilization}`}>
          <span className="lbl">ENTER</span>
          <span className="ttl">{civ?.name?.toUpperCase()} →</span>
        </Link>
        <Link className="btn btn-ghost" href="/sync#carrier">
          <span className="ttl">CLAIM YOUR OWN CARRIER →</span>
        </Link>
      </section>
      {verified && (
        <section className="cp-verified" style={{ maxWidth: 1100, margin: "var(--s-6) auto 0", padding: "var(--s-5) var(--s-4) 0", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s-2)", marginBottom: "var(--s-3)" }}>
            <span className="kicker" style={{ color: civ?.color }}>⬡ X-VERIFIED HOLDER</span>
            <span className="cp-verified-badge" style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)", textTransform: "uppercase" }}>
              · {shortAddr(verified.wallet)}
            </span>
          </div>
          <div className="cp-verified-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--s-3)", marginBottom: "var(--s-4)" }}>
            <div className="cm-cell">
              <span className="cm-lbl">CITIZENS HELD</span>
              <span className="cm-val">{verified.balance}</span>
            </div>
            <div className="cm-cell">
              <span className="cm-lbl">⬡ HEX BALANCE</span>
              <span className="cm-val">{verified.hexBalance.toLocaleString()}</span>
            </div>
          </div>
          {verified.topCitizens.length > 0 && (
            <>
              <div className="kicker" style={{ marginBottom: "var(--s-2)" }}>⬡ CITIZEN SAMPLE · LAST PAID</div>
              <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "var(--s-3)", listStyle: "none", padding: 0, marginBottom: "var(--s-4)" }}>
                {verified.topCitizens.map((c) => {
                  const cid4 = c.tokenId.toString().padStart(4, "0");
                  const src = LOCAL_HEROES.has(c.tokenId) ? `/heroes/${cid4}.webp` : imageUrl(c.tokenId);
                  return (
                    <li key={c.tokenId}>
                      <Link href={`/citizens/${c.tokenId}`} style={{ display: "block", textDecoration: "none" }}>
                        <span style={{ display: "block", aspectRatio: "1", overflow: "hidden", borderRadius: 10, border: `1px solid ${civ?.color || "var(--line)"}` }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt={`#${cid4}`} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </span>
                        <span style={{ display: "block", marginTop: 6, fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.12em", color: "var(--ink)" }}>#{cid4}</span>
                        <span style={{ display: "block", fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)" }}>
                          {c.lastSaleEth !== null ? `${c.lastSaleEth.toFixed(4)} ETH` : "—"}
                          {c.daysHeld !== null ? ` · ${c.daysHeld}d` : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <div style={{ display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
            <Link href={`/wallet/${verified.wallet}`} className="btn btn-secondary">
              <span className="ttl">FULL WALLET PROFILE →</span>
            </Link>
            <Link href={`/passport/${verified.wallet}`} className="btn btn-ghost">
              <span className="ttl">PASSPORT →</span>
            </Link>
          </div>
        </section>
      )}
      <section className="cp-next" style={{ maxWidth: 1100, margin: "var(--s-6) auto 0", padding: "0 var(--s-4)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          {verified
            ? `Verified holder. ${verified.balance} citizen${verified.balance !== 1 ? "s" : ""} · ${verified.hexBalance.toLocaleString()} ⬡.`
            : `This is @${h}. If it's you, your dashboard tracks streak, decay, and ⬡.`}
        </p>
        <Link className="btn btn-secondary" href="/sync#carrier">
          <span className="ttl">OPEN MY CARRIER DASH →</span>
        </Link>
      </section>
    </div>
  );
}

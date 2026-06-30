import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getHonoraries, getIdentity, civilizationColor } from "@/lib/citizens";
import { gridImageUrl, openseaUrl, CIVILIZATIONS } from "@/lib/constants";
import { HonoraryDisclaimer } from "@/components/HonoraryDisclaimer";

export const revalidate = 3600;

export function generateStaticParams() {
  return getHonoraries().map((h) => ({
    handle: (h.honoree_handle || String(h.id)).replace(/^@/, ""),
  }));
}

function findByHandle(handle: string) {
  const norm = handle.toLowerCase().replace(/^@/, "");
  return getHonoraries().find(
    (h) =>
      (h.honoree_handle || "").toLowerCase().replace(/^@/, "") === norm ||
      String(h.id) === norm,
  );
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const h = findByHandle(handle);
  if (!h) return { title: "Tribute not found" };
  const og = `/api/og/${h.id}`;
  return {
    title: `Tribute · ${h.honoree} · #${h.id.toString().padStart(4, "0")}`,
    description: `Citizen #${h.id.toString().padStart(4, "0")} of FREELON CITY is named in tribute to ${h.honoree} — homage, not affiliation.`,
    openGraph: { images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function TributePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const h = findByHandle(handle);
  if (!h) notFound();

  const id4 = h.id.toString().padStart(4, "0");
  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string; doctrine: string }>)[h.civilization];
  const color = civilizationColor(h.civilization);
  const identity = getIdentity(h.id);
  const cleanHandle = (h.honoree_handle || "").replace(/^@/, "");

  // Check if the honoree's X handle has been verified by signing in
  let xVerified = false;
  if (cleanHandle) {
    try {
      const { getByHandle } = await import("@/lib/x-store");
      const v = await getByHandle(cleanHandle);
      xVerified = !!v;
    } catch {
      /* non-fatal */
    }
  }

  // Look up current on-chain holder — 6s budget. 2s was too aggressive:
  // a single RPC call to a busy public node often takes 1-2s, and
  // owner-of uses the 4-RPC fallback chain which can serially try each.
  // Frequent timeouts here were the root of the "patron badge missing"
  // reports. If RPC truly fails, simply omit the badge (graceful).
  let currentPatron: string | null = null;
  try {
    const { ownerOf } = await import("@/lib/owner-of");
    currentPatron = await Promise.race<string | null>([
      ownerOf(h.id),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
  } catch {
    /* non-fatal */
  }

  // Lead with ⬡ — if honoree_handle starts with @ (common case), leading
  // with it would make X treat the tweet as a reply directed at that
  // account and suppress it for non-followers.
  // Tribute frame (legal 2026-06-11): the tweet must read as homage by a fan
  // project, never as a claim that the honoree IS a citizen or is affiliated.
  const tweet =
    `⬡ @4040hex · tribute · ${h.honoree_handle || h.honoree}\n\n` +
    `Citizen #${id4} of FREELON CITY is named in tribute to ${h.honoree_handle || h.honoree} (homage — not affiliated).\n` +
    `Civilization: ${civ?.name}.\n` +
    `Doctrine: ${civ?.doctrine}.\n` +
    `The signal remembers.\n\n` +
    `freeloncity.com/tribute/${cleanHandle || h.id}`;

  const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <div className="tribute-page">
      <section className="tribute-hero-single" style={{ "--civ": color } as React.CSSProperties}>
        <div className="img-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gridImageUrl(h.id, 640)} alt={h.honoree} />
        </div>
        <div className="body">
          <div className="stamp">⬡ TRIBUTE · CITIZEN #{id4}</div>
          <h1 className="name">{h.honoree}</h1>
          {h.honoree_handle && (
            <a
              className="handle"
              href={`https://twitter.com/${cleanHandle}`}
              target="_blank"
              rel="noreferrer"
            >
              {h.honoree_handle} {xVerified && <span className="x-verified-tick" title="Verified by X sign-in">⬡ VERIFIED</span>} ↗
            </a>
          )}
          <div className="civ-tag" style={{ color }}>
            {civ?.doctrine?.toUpperCase()} · {civ?.name?.toUpperCase()}
          </div>
          <div>
            <HonoraryDisclaimer name={h.honoree} />
          </div>
          {currentPatron && (
            <a
              className="current-patron"
              href={`/wallet/${currentPatron}`}
              style={{ borderColor: color }}
            >
              <span className="cp-kicker">⬡ CURRENT PATRON</span>
              <span className="cp-addr">{currentPatron.slice(0, 6)}…{currentPatron.slice(-4)}</span>
            </a>
          )}
          {identity && (
            <div className="bio">
              <div className="headline" style={{ color }}>{identity.headline}</div>
              <p>{identity.bio}</p>
            </div>
          )}
          <div className="tweet-block">
            <div className="lbl">PRE-LOADED TWEET</div>
            <pre className="tweet-body">{tweet}</pre>
            <div className="cta-row">
              <a
                className="btn btn-primary"
                href={twitterIntent}
                target="_blank"
                rel="noreferrer"
              >
                <span className="ttl">SEND THE TRIBUTE <span className="ar">→</span></span>
              </a>
              <a
                className="btn"
                href={openseaUrl(h.id)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="ttl">VIEW ON OPENSEA ↗</span>
              </a>
              <Link className="btn" href={`/citizens/${h.id}`}>
                <span className="ttl">CITIZEN PAGE →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="tribute-back">
        <Link href="/tribute">← ALL 35 TRIBUTES</Link>
      </section>

      <section style={{ marginTop: "var(--s-5)", maxWidth: "var(--maxw)", margin: "var(--s-5) auto 0", padding: "0 var(--pad)" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <div style={{ marginTop: "var(--s-3)", display: "flex", gap: "var(--s-3)", flexWrap: "wrap" }}>
          <a className="btn btn-primary" href={openseaUrl(h.id)} target="_blank" rel="noreferrer"><span className="ttl">VIEW ON OPENSEA ↗</span></a>
          <Link className="btn btn-secondary" href={`/civilizations/${h.civilization}`}><span className="ttl">EXPLORE {civ?.name?.toUpperCase()} →</span></Link>
          <Link className="btn btn-secondary" href="/tribute"><span className="ttl">ALL 35 TRIBUTES →</span></Link>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { syncHandle, normalizeHandle } from "@/lib/sync";
import { getCarrier } from "@/lib/carrier-store";
import { tier } from "@/lib/carrier";
import { CIVILIZATIONS, imageUrl, openseaUrl } from "@/lib/constants";

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
  const tweet =
    `@${h} carries the signal for ${civ?.name}.\n\n` +
    `Patron citizen #${id4} · ${civ?.doctrine.toUpperCase()}\n` +
    `Civ population: ${civ?.population} of 4040\n\n` +
    `Find your civ: freeloncity.com/sync?h=YOURHANDLE`;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <main className="carrier-public" style={{ "--civ": civ?.color } as React.CSSProperties}>
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
          <div className="lbl">PATRON CITIZEN</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(r.patron.id)} alt={r.patron.name} />
          <div className="meta">
            <div className="id">#{id4}</div>
            <div className="name">{r.patron.name}</div>
          </div>
        </Link>
      </section>
      <section className="cp-cta">
        <a className="btn btn-primary" href={intent} target="_blank" rel="noreferrer">
          <span className="lbl">RELAY</span>
          <span className="ttl">SHARE THIS PROFILE <span className="ar">→</span></span>
        </a>
        <Link className="btn btn-secondary" href={`/civilizations/${r.civilization}`}>
          <span className="lbl">ENTER</span>
          <span className="ttl">{civ?.name?.toUpperCase()} →</span>
        </Link>
        <a className="btn btn-ghost" href={openseaUrl(r.patron.id)} target="_blank" rel="noreferrer">
          <span className="ttl">VIEW PATRON ON OPENSEA ↗</span>
        </a>
        <Link className="btn btn-ghost" href="/carrier">
          <span className="ttl">CLAIM YOUR OWN CARRIER →</span>
        </Link>
      </section>
      <section className="cp-next" style={{ maxWidth: 1100, margin: "var(--s-6) auto 0", padding: "0 var(--s-4)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT SIGNAL</span>
        <p style={{ color: "var(--ink-2)", margin: "var(--s-2) 0 var(--s-3)" }}>
          This is @{h}. If it&rsquo;s you, your dashboard tracks streak, decay, and ⬡.
        </p>
        <Link className="btn btn-primary" href="/carrier">
          <span className="ttl">OPEN MY CARRIER DASH →</span>
        </Link>
      </section>
    </main>
  );
}

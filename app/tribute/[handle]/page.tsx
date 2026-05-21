import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getHonoraries, getIdentity, civilizationColor } from "@/lib/citizens";
import { imageUrl, openseaUrl, CIVILIZATIONS } from "@/lib/constants";

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
    description: `Citizen #${h.id.toString().padStart(4, "0")} of FREELON CITY carries the name of ${h.honoree}.`,
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

  const tweet =
    `${h.honoree_handle || h.honoree} — citizen #${id4} of FREELON CITY carries your name.\n\n` +
    `Civilization: ${civ?.name}.\n` +
    `Doctrine: ${civ?.doctrine}.\n` +
    `The signal remembers.\n\n` +
    `→ freeloncity.com/tribute/${cleanHandle || h.id}`;

  const twitterIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  return (
    <main className="tribute-page">
      <section className="tribute-hero-single" style={{ "--civ": color } as React.CSSProperties}>
        <div className="img-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(h.id)} alt={h.honoree} />
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
              {h.honoree_handle} ↗
            </a>
          )}
          <div className="civ-tag" style={{ color }}>
            {civ?.doctrine?.toUpperCase()} · {civ?.name?.toUpperCase()}
          </div>
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
                className="btn btn-gold"
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
    </main>
  );
}

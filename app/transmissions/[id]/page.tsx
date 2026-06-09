import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTransmission, toPublic } from "@/lib/transmissions-store";
import { CIVILIZATIONS } from "@/lib/constants";
import { TransmissionCard } from "@/components/TransmissionCard";
import { tweetTransmission, tweetIntent } from "@/lib/share";
import { RelayButton } from "./RelayButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const t = await getTransmission(id);
  if (!t || t.status !== "live") return { title: "Transmission not found" };
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[t.civ];
  return {
    title: `⬡ ${civ?.name ?? t.civ} TRANSMISSION · @${t.authorHandle}`,
    description: t.caption.slice(0, 160),
    openGraph: {
      title: `⬡ TRANSMISSION · ${civ?.name ?? t.civ}`,
      description: t.caption.slice(0, 160),
      images: [{ url: t.imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [t.imageUrl],
    },
  };
}

export default async function TransmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTransmission(id);
  if (!t || t.status !== "live") notFound();
  const pub = toPublic(t);
  const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[t.civ];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      <nav style={{ marginBottom: "var(--s-4)" }}>
        <Link href="/transmissions" style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.15em", color: "var(--ink-dim)", textDecoration: "none" }}>
          ← ALL TRANSMISSIONS
        </Link>
      </nav>

      <article>
        <div style={{ marginBottom: "var(--s-3)" }}>
          <span className="kicker" style={{ color: civ?.color || "var(--gold)" }}>
            ⬡ TRANSMISSION · {civ?.name?.toUpperCase() ?? t.civ.toUpperCase()}
          </span>
        </div>
        <TransmissionCard t={pub} />
      </article>

      <section style={{ marginTop: "var(--s-6)", padding: "var(--s-4)", border: "1px solid var(--line)", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
        <span className="kicker">⬡ HOW SCORING WORKS</span>
        <ul style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", marginTop: "var(--s-2)", paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Free SIGNAL — one ⬢ per carrier per transmission</li>
          <li>BOOST — burn 10–5,000 ⬡ to amplify. 10% goes to the author as royalty</li>
          <li>Score = signals × √(1 + boostHex/100) — neither pure votes nor pure hex dominates</li>
          <li>Top weekly transmission earns 5,000 ⬡ + 7 days featured on the city feed</li>
        </ul>
      </section>

      <section style={{ marginTop: "var(--s-5)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <RelayButton
            id={t.id}
            href={tweetIntent(tweetTransmission({
              id: t.id,
              caption: t.caption,
              civName: civ?.name ?? t.civ,
              authorHandle: t.authorHandle,
            }))}
          />
          <Link className="btn btn-secondary" href="/transmissions">
            <span className="ttl">TRANSMIT YOUR OWN →</span>
          </Link>
          <Link className="btn btn-secondary" href={`/civilizations/${t.civ}`}>
            <span className="ttl">ENTER {civ?.name?.toUpperCase()} →</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

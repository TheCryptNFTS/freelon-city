import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { imageUrl, openseaUrl, CIVILIZATIONS, CONTRACT } from "@/lib/constants";
import { getName } from "@/lib/name-store";
import { AskAndShare } from "./AskAndShare";

export const dynamicParams = true;
export const revalidate = 600;

async function getLastSale(tokenId: number): Promise<number | null> {
  if (!process.env.OPENSEA_API_KEY) return null;
  try {
    const url = `https://api.opensea.io/api/v2/events/chain/ethereum/contract/${CONTRACT}/nfts/${tokenId}?event_type=sale&limit=1`;
    const r = await fetch(url, {
      headers: { "X-API-KEY": process.env.OPENSEA_API_KEY },
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const event = d.asset_events?.[0];
    if (!event) return null;
    const { paymentToEth } = await import("@/lib/eth-math");
    return paymentToEth(event.payment);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return { title: "Not found" };
  const ogUrl = `/api/og/card/${tid}`;
  const id4 = tid.toString().padStart(4, "0");
  const displayName = c.transmission_name || c.honoree || `Citizen #${id4}`;
  const title = `Listing Card · #${id4} · ${displayName}`;
  return {
    title,
    description: `Shareable listing card for FREELON CITY #${id4} — ${displayName}`,
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

const FIELDS: Array<{ key: keyof CitizenLike; label: string }> = [
  { key: "caste", label: "Caste" },
  { key: "shape", label: "Shape" },
  { key: "hex_state", label: "Hex state" },
  { key: "signal_type", label: "Signal type" },
  { key: "sub_archetype", label: "Sub-archetype" },
];

type CitizenLike = {
  caste: string;
  shape: string;
  hex_state: string;
  signal_type: string;
  face_status: string;
  glow_level: string;
  sub_archetype: string;
  aura: string;
};

export default async function CardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) notFound();

  const id4 = tid.toString().padStart(4, "0");
  const color = civilizationColor(c.civilization);
  const civ = (
    CIVILIZATIONS as Record<
      string,
      { name: string; doctrine: string; population: number }
    >
  )[c.civilization];
  const customName = await getName(tid).catch(() => null);
  const lastSale = await getLastSale(tid);

  const displayName =
    customName?.name || c.transmission_name || c.honoree || `Citizen #${id4}`;
  const civilizationName = civ?.name ?? c.civilization;

  return (
    <main
      className="citizen-card-page"
      style={{ "--civ": color } as React.CSSProperties}
    >
      <span className="stamp">⬡ LISTING CARD · #{id4}</span>
      <h1>{displayName}</h1>

      <div className="civ-line" style={{ color }}>
        <span className="dot" />
        {civilizationName.toUpperCase()} · {c.doctrine?.toUpperCase()}
      </div>

      <div className="hex-frame-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl(tid)} alt={displayName} />
      </div>

      <dl className="card-stats">
        <div>
          <dt>CIVILIZATION</dt>
          <dd>{civilizationName}</dd>
        </div>
        {FIELDS.map((f) => (
          <div key={f.key}>
            <dt>{f.label.toUpperCase()}</dt>
            <dd>{(c as unknown as CitizenLike)[f.key]}</dd>
          </div>
        ))}
        <div>
          <dt>TIER</dt>
          <dd>{c.tier}</dd>
        </div>
      </dl>

      <AskAndShare
        tokenId={tid}
        id4={id4}
        displayName={displayName}
        civilizationName={civilizationName}
        shape={c.shape}
        lastSale={lastSale}
        openseaUrl={openseaUrl(tid)}
      />

      <div className="card-actions" style={{ marginTop: "var(--s-5)" }}>
        <Link className="btn" href={`/citizens/${tid}`}>
          <span className="ttl">← BACK TO CITIZEN</span>
        </Link>
      </div>
    </main>
  );
}

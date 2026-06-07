import { notFound } from "next/navigation";
import Link from "next/link";
import {
  COLLECTION_META,
  COLLECTION_SLUGS,
  loadCollection,
  buildFacets,
} from "@/lib/collections-data";
import { getFloors, formatFloor } from "@/lib/floor-prices";
import { isAgenticCollection } from "@/lib/agent-subject";
import { CollectionBrowser } from "@/components/CollectionBrowser";

// Static params for the five connected collections. Their token data is
// pre-ingested into data/collections/<slug>.json, so these pages are fully
// static (no runtime OpenSea calls except the cached floor price).
export function generateStaticParams() {
  return COLLECTION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = COLLECTION_META[slug];
  if (!meta) return { title: "Collection" };
  return { title: `${meta.title} · Archive`, description: meta.blurb };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = COLLECTION_META[slug];
  if (!meta) notFound();

  const data = loadCollection(slug);
  const facets = buildFacets(data.tokens);
  const floors = await getFloors([slug]);
  const floor = formatFloor(floors[slug]);
  // Every connected collection EXCEPT the trading-card game is agentic — its
  // tokens open an AI agent workspace. The TCG keeps the plain OpenSea link.
  const agentSlug = isAgenticCollection(slug) ? slug : null;

  return (
    <div className="citizens-page">
      <section className="citizens-hero">
        <span className="kicker" style={{ color: meta.statusColor }}>
          ● {meta.status} · {meta.kicker}
        </span>
        <h1>{meta.title}</h1>
        <p className="lead">{meta.blurb}</p>
        <p className="lead" style={{ fontFamily: "var(--mono2)", fontSize: 13, letterSpacing: "0.04em" }}>
          {data.total.toLocaleString()} records on {data.chain === "ape_chain" ? "ApeChain" : "Ethereum"}
          {floor ? ` · floor ${floor}` : ""}. {agentSlug
            ? "Own one? Open it to talk to its agent — every record is an AI character you can chat with."
            : "Browse the full set below, or open any record on OpenSea to trade."}
        </p>
        <div className="ui-cta-row" style={{ marginTop: "var(--s-3)" }}>
          <a
            className="btn btn-primary"
            href={`https://opensea.io/collection/${data.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            <span className="ttl">VIEW ON OPENSEA ↗</span>
          </a>
          <Link className="btn btn-secondary" href="/archive">
            <span className="ttl">← BACK TO ARCHIVE</span>
          </Link>
        </div>
      </section>

      <section className="citizens-section" id="browse">
        <header className="sec-head">
          <span className="kicker">SEARCH · FILTER · {data.total.toLocaleString()} TOTAL</span>
          <h2>Browse all <em>{data.total.toLocaleString()}</em></h2>
        </header>
        <CollectionBrowser
          tokens={data.tokens}
          facets={facets}
          chain={data.chain}
          contract={data.contract}
          accent={meta.statusColor}
          agentSlug={agentSlug}
        />
      </section>
    </div>
  );
}

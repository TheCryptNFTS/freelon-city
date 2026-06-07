import { notFound } from "next/navigation";
import { Metadata } from "next";
import { AgentWorkspace } from "@/components/AgentWorkspace";
import { getCollectionToken } from "@/lib/collection-persona";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const tok = getCollectionToken(slug, parseInt(id, 10));
  if (!tok) return { title: "Not found" };
  return {
    title: `${tok.name} · Workspace`,
    description: `Your private workspace with ${tok.name} — an AI agent you own from ${tok.collectionName}.`,
  };
}

export default async function CollectionAgentPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const tid = parseInt(id, 10);
  const tok = getCollectionToken(slug, tid);
  if (!tok) notFound();

  return (
    <AgentWorkspace
      slug={tok.slug}
      tokenId={tok.id}
      name={tok.name}
      art={tok.img}
      tier={tok.collectionName}
      civName={tok.collectionName}
      doctrine={tok.kicker}
      color={tok.color}
      headline={tok.blurb}
    />
  );
}

import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getCitizen, civilizationColor, getIdentity } from "@/lib/citizens";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { AgentWorkspace } from "@/components/AgentWorkspace";

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) return { title: "Not found" };
  const name = c.transmission_name || c.honoree || `Citizen #${tid.toString().padStart(4, "0")}`;
  return {
    title: `${name} · Workspace`,
    description: `Your private workspace with ${name} — an AI agent you own.`,
    openGraph: { images: [{ url: `/api/og/${tid}`, width: 1200, height: 630 }] },
  };
}

export default async function AgentWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tid = parseInt(id, 10);
  const c = getCitizen(tid);
  if (!c) notFound();

  const color = civilizationColor(c.civilization);
  const civ = (CIVILIZATIONS as Record<string, { name: string; doctrine: string }>)[c.civilization];
  const identity = getIdentity(tid);
  const name = c.transmission_name || c.honoree || `Citizen #${tid.toString().padStart(4, "0")}`;

  return (
    <AgentWorkspace
      tokenId={tid}
      name={name}
      art={imageUrl(tid)}
      tier={c.tier}
      civName={civ?.name ?? c.civilization}
      civSlug={c.civilization}
      doctrine={c.doctrine}
      color={color}
      headline={identity?.headline ?? null}
    />
  );
}

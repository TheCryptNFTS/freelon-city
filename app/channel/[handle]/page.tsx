import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHonoraries } from "@/lib/citizens";
import { ChannelClient } from "./ChannelClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getHonoraries()
    .filter((h) => !!h.honoree_handle)
    .map((h) => ({ handle: h.honoree_handle.replace(/^@/, "").toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `Channel · @${handle} · gated`,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const honor = getHonoraries().find(
    (h) => h.honoree_handle && h.honoree_handle.replace(/^@/, "").toLowerCase() === handle.toLowerCase(),
  );
  if (!honor) notFound();
  return <ChannelClient citizenId={honor.id} honoree={honor.honoree} handle={handle} civSlug={honor.civilization} />;
}

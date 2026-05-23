/**
 * Bulk ghost lookup — returns the set of currently-ghosted token ids past
 * their grace period. Used by grid pages (CitizensBrowser, /civilizations,
 * /wallet) to avoid N+1 per-card lookups.
 */
import { NextResponse } from "next/server";
import { listGhostedIds, getGhost } from "@/lib/ghost-store";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  const ids = await listGhostedIds(400);
  if (ids.length === 0) return NextResponse.json({ ids: [] });
  // Filter to those past grace period
  const now = Date.now();
  const out: number[] = [];
  // Cheap parallel reads — the index can include pending ones too
  const records = await Promise.all(ids.map((id) => getGhost(id)));
  for (let i = 0; i < ids.length; i++) {
    const g = records[i];
    if (g && g.status === "ghosted" && now >= g.ghostedAt) out.push(ids[i]);
  }
  return NextResponse.json({ ids: out });
}

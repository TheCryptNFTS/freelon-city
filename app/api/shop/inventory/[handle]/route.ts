import { NextResponse } from "next/server";
import { getOwned } from "@/lib/shop-store";
import { normalizeHandle } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const h = normalizeHandle(handle);
  if (!h) return NextResponse.json({ owned: [] });
  const owned = await getOwned(h);
  return NextResponse.json({ owned });
}

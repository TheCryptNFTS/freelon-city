import { NextResponse } from "next/server";
import { computeAnchor } from "@/lib/onchain/anchor-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * READ-ONLY — compute the current Merkle root over all citizens with history.
 * The anchoring script calls this, then the founder sends the root on-chain.
 * Writes nothing. Gated by ADMIN_SEED_KEY (404 when unset).
 */
export async function GET(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const given = new URL(req.url).searchParams.get("key") || req.headers.get("x-admin-key") || "";
  if (given !== key) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { root, count } = await computeAnchor();
  return NextResponse.json({ ok: true, root, count });
}

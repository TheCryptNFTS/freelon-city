import { NextResponse } from "next/server";
import { computeAnchor, saveSnapshot } from "@/lib/onchain/anchor-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Persist the snapshot AFTER the founder has anchored its root on-chain, so the
 * public "verify" badge can regenerate proofs. Pass the on-chain epoch (the
 * anchor index returned by the contract). Recomputes the root server-side and
 * refuses to save if it doesn't match what was anchored (guards against drift).
 * Gated by ADMIN_SEED_KEY.
 */
export async function POST(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const url = new URL(req.url);
  const given = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  if (given !== key) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { epoch?: number; root?: string };
  const epoch = typeof body.epoch === "number" ? body.epoch : 0;

  const { root, count, leaves } = await computeAnchor();
  // Safety: if the caller passed the anchored root, it must match the freshly
  // computed one — otherwise the histories changed between anchor and save.
  if (body.root && body.root.toLowerCase() !== root.toLowerCase()) {
    return NextResponse.json(
      { error: "root_mismatch", message: "Histories changed since the anchor tx. Re-anchor, then save.", computed: root },
      { status: 409 },
    );
  }

  await saveSnapshot({ epoch, root, count, timestamp: Date.now(), leaves });
  return NextResponse.json({ ok: true, epoch, root, count });
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { reportTransmission } from "@/lib/transmissions-store";
import { isSameOrigin, requireSessionBound } from "@/lib/x-session";
import { isValidAddress } from "@/lib/wallet-tokens";

export const dynamic = "force-dynamic";

/**
 * POST /api/transmissions/[id]/report
 * Body: { addr }
 * Soft-moderation: 3 unique-wallet reports auto-hide the transmission
 * pending review. One report per wallet.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await limit(req, "tx:report", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  let body: { addr?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!requireSessionBound(req, addr)) {
    return NextResponse.json({ error: "session_required" }, { status: 401 });
  }

  const { id } = await params;
  const r = await reportTransmission(id, addr);
  if (!r.ok) {
    if (r.alreadyReported) return NextResponse.json({ error: "already_reported" }, { status: 409 });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, hidden: !!r.hidden });
}

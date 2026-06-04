import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getCheckIn, getOrGenerateCheckIn } from "@/lib/daily-checkin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validId(raw: string): number | null {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1 || n > 4040 || !getCitizen(n)) return null;
  return n;
}

// GET — today's check-in if it already exists. Public, free, no generation.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:checkin:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = validId(id);
  if (!cid) return NextResponse.json({ error: "invalid id" }, { status: 400 });
  const checkin = await getCheckIn(cid);
  return NextResponse.json({ checkin });
}

// POST — generate today's check-in (free). Same-origin only; no payment, no
// ownership requirement (the line is public and free — anyone visiting the
// citizen can surface today's transmission). Generation is idempotent per
// citizen per UTC day, so this can't be farmed or run up cost.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Tighter cap on the GENERATION trigger (each first-gen is a paid LLM call).
  // Reading an already-generated line is cheap and short-circuits below the cap.
  const rl = await limit(req, "citizen:checkin:gen", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { isSameOrigin } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  const { id } = await params;
  const cid = validId(id);
  if (!cid) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  // Fast path: if today's line already exists, return it WITHOUT touching the
  // generator (no model call, no lock). This means the only way to cause real
  // cost is the FIRST request per citizen per UTC day — capped at one by the
  // SET-NX lock inside getOrGenerateCheckIn. An enumeration attack across all
  // 4040 citizens therefore costs at most ~one cheap line each, once per day.
  const existing = await getCheckIn(cid);
  if (existing) return NextResponse.json({ checkin: existing });

  const checkin = await getOrGenerateCheckIn(cid);
  if (!checkin) {
    return NextResponse.json(
      { error: "The citizen is silent right now — try again shortly." },
      { status: 503 },
    );
  }
  return NextResponse.json({ checkin });
}

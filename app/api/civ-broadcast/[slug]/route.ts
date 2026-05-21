import { NextResponse } from "next/server";
import { CIVILIZATIONS } from "@/lib/constants";
import { getBroadcast, setBroadcast } from "@/lib/civ-broadcast-store";
import { getMayor } from "@/lib/civ-mayor";
import { requireXSession } from "@/lib/require-x";
import { isValidAddress } from "@/lib/wallet-tokens";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CIVS = new Set(Object.keys(CIVILIZATIONS));

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!VALID_CIVS.has(slug)) {
    return NextResponse.json({ error: "invalid_civ" }, { status: 400 });
  }
  const broadcast = await getBroadcast(slug);
  return NextResponse.json({ broadcast });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!VALID_CIVS.has(slug)) {
    return NextResponse.json({ error: "invalid_civ" }, { status: 400 });
  }

  const rl = await limit(req, "broadcast:post", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // Require verified X session (any session, gating spam)
  const session = await requireXSession(req, {});
  if (session instanceof NextResponse) return session;

  let body: { text?: string; address?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const address = (body.address || "").toLowerCase();
  if (!isValidAddress(address)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  if (text.length < 5 || text.length > 140) {
    return NextResponse.json(
      { error: "invalid_text", hint: "5-140 chars" },
      { status: 400 },
    );
  }
  if (/<[^>]+>/.test(text)) {
    return NextResponse.json(
      { error: "html_not_allowed" },
      { status: 400 },
    );
  }

  // Verify caller is actually the Mayor of this civ
  const mayor = await getMayor(slug);
  if (!mayor) {
    return NextResponse.json({ error: "no_mayor_for_civ" }, { status: 403 });
  }
  if (mayor.address.toLowerCase() !== address) {
    return NextResponse.json(
      { error: "not_mayor", hint: "Only the civ Mayor may broadcast." },
      { status: 403 },
    );
  }

  await setBroadcast(slug, text, address);
  const broadcast = await getBroadcast(slug);
  return NextResponse.json({ ok: true, broadcast });
}

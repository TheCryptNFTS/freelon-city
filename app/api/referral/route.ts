import { NextResponse } from "next/server";
import { normalizeHandle } from "@/lib/sync";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/x-session";
import { requireXSession } from "@/lib/require-x";
import {
  setReferrer,
  listInvitedBy,
  getReferral,
} from "@/lib/referral-store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const state = await limit(req, "referral:post", { max: 10, windowSec: 60 });
  if (!state.ok) return tooManyResponse(state);

  let body: { joinerHandle?: string; referrerHandle?: string } = {};
  try {
    body = (await req.json()) as {
      joinerHandle?: string;
      referrerHandle?: string;
    };
  } catch {
    return NextResponse.json(
      { ok: false, reason: "bad_json" },
      { status: 400 },
    );
  }

  const joiner = normalizeHandle(body.joinerHandle ?? "");
  const referrer = normalizeHandle(body.referrerHandle ?? "");
  if (!joiner || !referrer) {
    return NextResponse.json(
      { ok: false, reason: "bad_handles" },
      { status: 400 },
    );
  }

  // 2026-05-29 security fix: this route previously had no auth → any caller
  // could bind an arbitrary joiner to an arbitrary referrer and hijack
  // referral attribution. Mirror the other mutating routes: same-origin CSRF
  // guard + a verified X session bound to the JOINER (the identity that gets
  // bound, so it's the one that must be proven). The referrer is just data.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }
  const session = await requireXSession(req, { handle: joiner });
  if (session instanceof NextResponse) return session;

  if (joiner === referrer) {
    return NextResponse.json(
      { ok: false, reason: "self_referral" },
      { status: 400 },
    );
  }

  const existing = await getReferral(joiner);
  if (existing) {
    return NextResponse.json({ ok: false, reason: "already_referred" });
  }

  const row = await setReferrer(joiner, referrer);
  if (!row) {
    return NextResponse.json({ ok: false, reason: "already_referred" });
  }
  return NextResponse.json({ ok: true, referral: row });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = normalizeHandle(url.searchParams.get("key") ?? "");
  if (!key) {
    return NextResponse.json(
      { ok: false, reason: "bad_key" },
      { status: 400 },
    );
  }
  const all = await listInvitedBy(key);
  return NextResponse.json({
    ok: true,
    count: all.length,
    entries: all.slice(0, 20),
  });
}

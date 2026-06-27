/**
 * FREELON WORLD route — the server-authoritative seam for the open-world sim
 * slice (/world/city). Mirrors the existing lib/*-store.ts → route.ts shape used
 * everywhere else in this app (play-event, progression).
 *
 *   GET  /api/world?owner=<key>     → { ok, state }   load + register a visit
 *   POST /api/world  { owner, action:"build", idx }   server-validated mutation
 *
 * AUTHORITY (docs/WORLD_BUILD_PLAN.md): the 3D client is an OPTIMISTIC view. It
 * may show the tower the instant you click, but the TRUTH is decided here —
 * lib/world-store validates range/ownership/balance and SINKS the HEX. A client
 * that lies (build a plot it can't afford, or one out of range) is rejected and
 * the route returns the real server state for the client to reconcile against.
 *
 * Same-origin in prod (freeloncity.com/world/city → /api/world). The static dev
 * copy (port 8868) has no /api, so the client degrades to its localStorage
 * ledger — the route is an UPGRADE to server-of-record, not a hard dependency.
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { normalizeOwner, getWorld, registerVisit, buildPlot } from "@/lib/world-store";

export const dynamic = "force-dynamic";

/** GET ?owner= → load the player's world and count the visit. */
export async function GET(req: Request) {
  const rl = await limit(req, "world-get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const url = new URL(req.url);
  const owner = normalizeOwner(url.searchParams.get("owner") || "");
  if (!owner) return NextResponse.json({ ok: false, error: "bad_owner" }, { status: 400 });

  // A GET on boot is a "visit" — bump the greeter's memory denominator, then
  // return the (now-current) state.
  const state = await registerVisit(owner);
  return NextResponse.json({ ok: true, state });
}

type InBody = { owner?: string; action?: string; idx?: number };

/** POST { owner, action:"build", idx } → server-authoritative mutation. */
export async function POST(req: Request) {
  const rl = await limit(req, "world-build", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  let body: InBody;
  try {
    body = (await req.json()) as InBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const owner = normalizeOwner(body.owner || "");
  if (!owner) return NextResponse.json({ ok: false, error: "bad_owner" }, { status: 400 });

  if (body.action === "build") {
    const idx = Number(body.idx);
    const res = await buildPlot(owner, idx);
    // Always 200 with the authoritative state attached: a rejected build is a
    // normal optimistic-reconcile event for the client, not an HTTP error.
    return NextResponse.json(
      res.ok
        ? { ok: true, state: res.state }
        : { ok: false, reason: res.reason, state: res.state },
    );
  }

  // Unknown action — return current state so the client can still reconcile.
  const state = await getWorld(owner);
  return NextResponse.json({ ok: false, error: "bad_action", state }, { status: 400 });
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getInbox, clearInbox, getPrefs, setPrefs, type NotifPrefs, type NotifKind } from "@/lib/notifications-store";
import { isValidAddress } from "@/lib/wallet-tokens";
import { isSameOrigin, requireSessionBound } from "@/lib/x-session";

export const dynamic = "force-dynamic";

/** GET ?addr=0x... — returns the wallet's notification inbox + prefs.
 *  No auth required for reads — these are just user-facing UI cards. */
export async function GET(req: Request) {
  const rl = await limit(req, "notif:get", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const addr = (new URL(req.url).searchParams.get("addr") || "").toLowerCase();
  if (!isValidAddress(addr)) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  const [items, prefs] = await Promise.all([getInbox(addr, 30), getPrefs(addr)]);
  return NextResponse.json({ items, prefs });
}

/** POST { addr, action: "clear" | "prefs", prefs?: ... }
 *  Auth: session bound to addr — same pattern as other state writes. */
export async function POST(req: Request) {
  const rl = await limit(req, "notif:post", { max: 6, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  let body: { addr?: string; action?: string; prefs?: NotifPrefs } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  if (!isValidAddress(addr)) return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  if (!requireSessionBound(req, addr)) return NextResponse.json({ error: "session_required" }, { status: 401 });

  if (body.action === "clear") {
    await clearInbox(addr);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "prefs" && body.prefs) {
    const validKinds: NotifKind[] = ["decay-warning", "streak-milestone-soon", "watchlist-flag", "transmission-boosted", "civ-wars-monday", "civ-wars-mid-week", "snipe-matured", "fresh-citizen"];
    const cleanPrefs: NotifPrefs = {
      dmEnabled: !!body.prefs.dmEnabled,
      optOut: (body.prefs.optOut || []).filter((k): k is NotifKind => validKinds.includes(k as NotifKind)),
    };
    await setPrefs(addr, cleanPrefs);
    return NextResponse.json({ ok: true, prefs: cleanPrefs });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

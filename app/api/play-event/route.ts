/**
 * Play-event telemetry sink — the wallet-keyed measurement the game's analytics
 * beacon (VITE_ANALYTICS_URL) posts to. This is the ONE permanent telemetry
 * tier the Book sanctions beyond Vercel Web Analytics: it answers the questions
 * the v2 gate asks and nothing else could ("how many DISTINCT WALLETS played
 * with their own cards", "owned vs demo deck starts", daily play sessions).
 *
 * Storage (Upstash, no PII — wallet addresses only):
 *   INCR  play:ev:<YYYY-MM-DD>:<event>            daily count per event
 *   SADD  play:w:<YYYY-MM-DD>:<event>  <wallet>   distinct wallets per event/day (SCARD = the gate number)
 *   LPUSH play:log  <json>  + LTRIM 0 499         recent tail for eyeballing
 * Keys expire after 90 days. Project/test wallets are excluded so N≈10 isn't noise.
 *
 * POST is cross-origin (the game's sendBeacon from play.freeloncity.com) so it
 * carries game CORS, incl. on the 429. GET is a header-authed read for the
 * weekly numbers — no secret in the query string (Book engineering law).
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { gameCorsHeaders, gameOptions } from "@/lib/game-cors";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const dynamic = "force-dynamic";

const DAY_TTL = 60 * 60 * 24 * 90;
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

// Wallets whose events we DON'T count (project/dev/test) so a base of ~10 real
// holders isn't drowned. Comma-list override via env; the project wallet is the
// known default.
function excludedWallets(): Set<string> {
  const env = (process.env.PLAY_EVENT_EXCLUDE_WALLETS || "0x3303c4350259c2b8f3c560b2ec70ad3ed87a5e72")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return new Set(env);
}

function today(): string {
  // YYYY-MM-DD in UTC — matches the Sunday-report / quest day boundary.
  return new Date().toISOString().slice(0, 10);
}

type InEvent = { name?: string; type?: string; props?: Record<string, unknown>; ts?: number };

export async function OPTIONS(req: Request) {
  return gameOptions(req);
}

export async function POST(req: Request) {
  const cors = gameCorsHeaders(req);
  const rl = await limit(req, "play-event", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl, cors);

  let events: InEvent[] = [];
  try {
    const body = (await req.json()) as { events?: InEvent[] } | InEvent;
    events = Array.isArray((body as { events?: InEvent[] }).events)
      ? (body as { events: InEvent[] }).events
      : [body as InEvent];
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400, headers: cors });
  }

  if (!hasUpstash) {
    // Dev / unconfigured — accept and drop, never error the beacon.
    return NextResponse.json({ ok: true, stored: 0 }, { headers: cors });
  }

  const excluded = excludedWallets();
  const day = today();
  let stored = 0;

  for (const e of events.slice(0, 50)) {
    const name = String(e.name || e.type || "").slice(0, 64).replace(/[^a-zA-Z0-9_.-]/g, "");
    if (!name) continue;
    const walletRaw = String((e.props?.wallet ?? e.props?.address ?? "") as string).toLowerCase();
    const wallet = ADDR_RE.test(walletRaw) ? walletRaw : null;
    if (wallet && excluded.has(wallet)) continue; // skip project/test wallets entirely

    try {
      await upstash(["INCR", `play:ev:${day}:${name}`]);
      await upstash(["EXPIRE", `play:ev:${day}:${name}`, String(DAY_TTL)]);
      if (wallet) {
        await upstash(["SADD", `play:w:${day}:${name}`, wallet]);
        await upstash(["EXPIRE", `play:w:${day}:${name}`, String(DAY_TTL)]);
      }
      const logLine = JSON.stringify({ name, wallet, source: e.props?.source ?? null, day, ts: e.ts ?? null });
      await upstash(["LPUSH", "play:log", logLine]);
      stored++;
    } catch {
      /* one bad write must not fail the batch */
    }
  }
  try { await upstash(["LTRIM", "play:log", "0", "499"]); } catch {}

  return NextResponse.json({ ok: true, stored }, { headers: cors });
}

/** Header-authed read: GET /api/play-event with `x-admin-key`. Returns today's
 *  + last-7-days counts and distinct-wallet counts for the events we care about. */
export async function GET(req: Request) {
  const key = process.env.ADMIN_KEY || process.env.CRON_SECRET || "";
  const given = req.headers.get("x-admin-key") || "";
  if (!key || given !== key) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!hasUpstash) return NextResponse.json({ ok: true, configured: false });

  // 2026-06-16: was "first_win_of_day" — but the game renamed that stage to
  // "first_match_result" (funnel.ts), so this aggregate read zero forever. Match
  // the event the game actually emits.
  const EVENTS = ["play_started", "play_started_own_cards", "play_session", "match_completed", "first_match_result"];
  const days: string[] = [];
  const base = Date.parse(today() + "T00:00:00Z");
  for (let i = 0; i < 7; i++) days.push(new Date(base - i * 86400000).toISOString().slice(0, 10));

  const out: Record<string, { today: number; week: number; walletsToday: number; walletsWeek: number }> = {};
  for (const ev of EVENTS) {
    let week = 0;
    const weekWallets = new Set<string>();
    let todayCount = 0;
    const todayWallets = new Set<string>();
    for (let i = 0; i < days.length; i++) {
      const d = days[i];
      const c = Number((await upstash(["GET", `play:ev:${d}:${ev}`]).catch(() => 0)) ?? 0);
      week += c;
      const ws = (await upstash(["SMEMBERS", `play:w:${d}:${ev}`]).catch(() => [])) as string[];
      ws.forEach((w) => weekWallets.add(w));
      if (i === 0) { todayCount = c; ws.forEach((w) => todayWallets.add(w)); }
    }
    out[ev] = { today: todayCount, week, walletsToday: todayWallets.size, walletsWeek: weekWallets.size };
  }
  return NextResponse.json({ ok: true, day: today(), events: out });
}

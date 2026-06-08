/**
 * FREELON RESERVATION capture — the on-site "Claim this FREELON" lead form that
 * replaces the invisible external OpenSea hand-off at the demo wall. A visitor
 * leaves an email (+ optional wallet) to reserve interest; we store it so the
 * funnel is VISIBLE (we can see and follow up) instead of bouncing a stranger to
 * OpenSea where conversion dies and we learn nothing.
 *
 * Privacy/security posture (see app/legal/privacy §3a):
 *   - Non-binding: no payment, no lockup, no allocation guarantee, no seed phrase.
 *   - PII (email/wallet) is stored in Upstash and NEVER reflected in the response,
 *     put in any URL, or written to a log line.
 *   - The referral code is sanitized to a strict charset (it arrives from a
 *     shareable ?ref= link, so it's attacker-controlled) and is opaque.
 *   - Fail-CLOSED in prod: if Upstash throws we refuse (503) rather than silently
 *     drop the lead or fall back to a per-instance memory map.
 */
import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { upstash, hasUpstash } from "@/lib/upstash-client";
import { isSameOrigin } from "@/lib/x-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const REF_RE = /^[A-Za-z0-9_-]{1,40}$/;
const SLUG_RE = /^[a-z0-9-]{1,40}$/;

// Dev-only fallback store (no Upstash locally). Prod fails closed instead.
const memReservations: string[] = [];

type Reservation = {
  email: string;
  wallet: string | null;
  tokenId: number | null;
  slug: string | null;
  ref: string | null;
  ts: number;
};

export async function POST(req: Request) {
  // 1. Burst throttle (per IP/min via lib/rate-limit).
  const rl = await limit(req, "reserve", { max: 5, windowSec: 300 });
  if (!rl.ok) return tooManyResponse(rl);

  // 2. Same-origin only (browser CSRF surface).
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    wallet?: string;
    tokenId?: number | string;
    slug?: string;
    ref?: string;
  };

  // 3. Validate. Email required; everything else optional + strictly shaped.
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "invalid_email", message: "Enter a valid email." }, { status: 400 });
  }
  const walletRaw = String(body.wallet ?? "").trim();
  if (walletRaw && !WALLET_RE.test(walletRaw)) {
    return NextResponse.json({ error: "invalid_wallet", message: "That doesn't look like a wallet address." }, { status: 400 });
  }
  const wallet = walletRaw || null;
  const tidNum = Number(body.tokenId);
  const tokenId = Number.isFinite(tidNum) && tidNum > 0 ? Math.floor(tidNum) : null;
  const slugRaw = String(body.slug ?? "").trim();
  const slug = SLUG_RE.test(slugRaw) ? slugRaw : null;
  const refRaw = String(body.ref ?? "").trim();
  const ref = REF_RE.test(refRaw) ? refRaw : null;

  const rec: Reservation = { email, wallet, tokenId, slug, ref, ts: Date.now() };

  // 4. Store. Fail CLOSED in prod (don't lose the lead silently, don't fall back
  //    to a per-instance map). Email is also added to a SET for cheap dedupe/counts.
  if (hasUpstash) {
    try {
      await upstash(["LPUSH", "freelon:reservations", JSON.stringify(rec)]);
      await upstash(["SADD", "freelon:reservations:emails", email]);
      if (ref) await upstash(["HINCRBY", "freelon:reservations:byref", ref, "1"]).catch(() => {});
    } catch {
      return NextResponse.json(
        { error: "unavailable", message: "The city's busy right now — try again in a moment." },
        { status: 503 },
      );
    }
  } else {
    memReservations.push(JSON.stringify(rec));
  }

  // Never reflect the stored PII back.
  return NextResponse.json({ ok: true });
}

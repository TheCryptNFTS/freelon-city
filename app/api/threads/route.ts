/**
 * WORKSPACE THREAD SYNC — durable, cross-device backup of a holder's agent
 * conversations. Private to the WALLET that wrote them (chat content is
 * personal and must not leak to the next owner on resale), so every call is
 * wallet-signature-gated; there is no token-ownership check because the blob
 * lives under the caller's own wallet key.
 *
 *   GET  ?subject=&address=&signature=&ts=  → the wallet's saved blob (or null)
 *   POST { subject, address, signature, ts, threads, activeId } → save the blob
 *
 * The signed message is timestamp-bound (30-min window) so a captured signature
 * can't be replayed indefinitely. Same-origin + rate-limited + size-capped.
 */
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/x-session";
import { getThreadBlob, setThreadBlob } from "@/lib/thread-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIG_WINDOW_MS = 30 * 60 * 1000;
const MAX_BLOB_BYTES = 256 * 1024; // generous for text chats; blocks abuse
const SUBJECT_RE = /^[a-z0-9-]{0,40}:?\d{1,7}$/; // "freelons-ish-slug:123" or "123"

function checkAuth(subject: string, address: string, signature: string, ts: number) {
  if (!/^0x[a-f0-9]{40}$/.test(address)) return "invalid address";
  if (!SUBJECT_RE.test(subject)) return "invalid subject";
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIG_WINDOW_MS) return "stale";
  if (!/^0x[a-f0-9]+$/i.test(signature)) return "invalid signature";
  return null;
}
const messageFor = (subject: string, ts: number) =>
  `Sync my FREELON workspace threads for ${subject} at ${ts}.`;

export async function GET(req: Request) {
  const rl = await limit(req, "threads:get", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const u = new URL(req.url);
  const subject = (u.searchParams.get("subject") ?? "").toLowerCase();
  const address = (u.searchParams.get("address") ?? "").toLowerCase();
  const signature = u.searchParams.get("signature") ?? "";
  const ts = Number(u.searchParams.get("ts"));
  const bad = checkAuth(subject, address, signature, ts);
  if (bad) return NextResponse.json({ error: bad }, { status: bad === "stale" ? 401 : 400 });

  let ok = false;
  try {
    ok = await verifyMessage({ address: address as `0x${string}`, message: messageFor(subject, ts), signature: signature as `0x${string}` });
  } catch { ok = false; }
  if (!ok) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  const blob = await getThreadBlob(address, subject).catch(() => null);
  return NextResponse.json({ ok: true, blob });
}

export async function POST(req: Request) {
  const rl = await limit(req, "threads:set", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  if (!isSameOrigin(req)) return NextResponse.json({ error: "bad_origin" }, { status: 403 });

  const raw = await req.text();
  if (raw.length > MAX_BLOB_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const body = (() => { try { return JSON.parse(raw); } catch { return {}; } })() as {
    subject?: string; address?: string; signature?: string; ts?: number;
    threads?: unknown[]; activeId?: string;
  };

  const subject = (body.subject ?? "").toLowerCase();
  const address = (body.address ?? "").toLowerCase();
  const signature = body.signature ?? "";
  const ts = Number(body.ts);
  const bad = checkAuth(subject, address, signature, ts);
  if (bad) return NextResponse.json({ error: bad }, { status: bad === "stale" ? 401 : 400 });
  if (!Array.isArray(body.threads)) return NextResponse.json({ error: "no_threads" }, { status: 400 });

  let ok = false;
  try {
    ok = await verifyMessage({ address: address as `0x${string}`, message: messageFor(subject, ts), signature: signature as `0x${string}` });
  } catch { ok = false; }
  if (!ok) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  await setThreadBlob(address, subject, body.threads, String(body.activeId ?? ""));
  return NextResponse.json({ ok: true });
}

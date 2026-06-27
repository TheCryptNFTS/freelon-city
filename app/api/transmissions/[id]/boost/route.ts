import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { boostTransmission, getTransmission } from "@/lib/transmissions-store";
import { isSameOriginStrict, requireProvenWallet } from "@/lib/x-session";
import { isValidAddress } from "@/lib/wallet-tokens";
import { debitWalletHex, creditWalletHex, getWalletHex } from "@/lib/wallet-hex-store";

export const dynamic = "force-dynamic";

const MIN_BOOST = 10;
const MAX_BOOST = 5_000;

/**
 * POST /api/transmissions/[id]/boost
 * Body: { addr, hex }
 * Burns `hex` from the booster wallet, adds to the transmission's boostHex.
 * 90% of the burn is permanent (sink), 10% is credited to the author as
 * a "transmission royalty" — gives content creators a direct revenue line.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await limit(req, "tx:boost", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  // Strict: this POST spends ⬡ and is reached only from the browser behind a
  // proven-wallet session, so a request with neither Origin nor Referer is
  // anomalous and rejected (defense-in-depth on the HEX-spend surface).
  if (!isSameOriginStrict(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  let body: { addr?: string; hex?: number; idemKey?: string } = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const addr = (body.addr || "").toLowerCase();
  const hex = Math.floor(Number(body.hex || 0));
  // Optional client-supplied idempotency key. The client should generate
  // a fresh nonce (UUID/crypto.randomUUID) per boost intent; if the user
  // double-clicks or the network retries, the second call returns the
  // first result instead of double-debiting. Sanitized to [a-z0-9-]{8,64}.
  const rawIdem = (body.idemKey || "").trim().toLowerCase().slice(0, 64);
  const idemKey = /^[a-z0-9-]{8,64}$/.test(rawIdem) ? rawIdem : "";
  if (!isValidAddress(addr)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }
  if (!Number.isFinite(hex) || hex < MIN_BOOST || hex > MAX_BOOST) {
    return NextResponse.json({ error: "invalid_amount", min: MIN_BOOST, max: MAX_BOOST }, { status: 400 });
  }
  // This boost SPENDS ⬡, so the spending wallet must be CRYPTOGRAPHICALLY PROVEN
  // by the session (walletProof), not the forgeable `bind`.
  if (!requireProvenWallet(req, addr)) {
    return NextResponse.json(
      { error: "wallet_proof_required", message: "Sign with your wallet once to spend ⬡." },
      { status: 401 },
    );
  }

  // Idempotency check: if a previous identical boost succeeded with
  // this key, replay the result without re-debiting. 24h TTL covers
  // any reasonable retry window.
  const idemStorageKey = idemKey ? `freelon:boost:idem:${addr}:${idemKey}` : "";
  const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (idemStorageKey && hasUpstash) {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL!;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
      const cached = await fetch(`${url}/GET/${encodeURIComponent(idemStorageKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }).then((r) => r.ok ? r.json() : null) as { result: string | null } | null;
      if (cached?.result) {
        return new NextResponse(cached.result, {
          status: 200,
          headers: { "content-type": "application/json", "x-idempotent-replay": "1" },
        });
      }
    } catch {/* non-fatal — fall through to fresh debit */}
  }

  const { id } = await params;
  const t = await getTransmission(id);
  if (!t || t.status !== "live") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Don't allow self-boosting (creates a wash-trade hex laundromat)
  if (t.author === addr) {
    return NextResponse.json({ error: "cannot_boost_own" }, { status: 403 });
  }

  // Balance check
  const rec = await getWalletHex(addr);
  if (rec.balance < hex) {
    return NextResponse.json(
      { error: "insufficient_hex", required: hex, balance: rec.balance },
      { status: 402 },
    );
  }

  // Debit booster
  try {
    await debitWalletHex(addr, hex, {
      kind: "manual",
      note: `Boost · transmission ${id.slice(0, 8)} · +${hex}⬡`,
    });
  } catch {
    return NextResponse.json({ error: "debit_failed" }, { status: 402 });
  }

  // Credit 10% to author as royalty
  const royalty = Math.floor(hex * 0.1);
  if (royalty > 0) {
    try {
      await creditWalletHex(t.author, royalty, {
        kind: "manual",
        note: `Transmission royalty · ${id.slice(0, 8)} · +${royalty}⬡`,
      });
      // Fire-and-forget notification so the author sees the boost next
      // visit (and gets a DM if they opted in). Dedupe per boost event.
      const { notify } = await import("@/lib/notify");
      void notify({
        wallet: t.author,
        eventKey: `transmission-boost:${id}:${addr}`,
        kind: "transmission-boosted",
        body: `⬢ Your transmission got boosted +${hex} ⬡ · you earned +${royalty} ⬡ royalty.`,
        href: `/transmissions/${id}`,
      }).catch(() => {});
    } catch {/* non-fatal; the boost still counts toward score */}
  }

  // Bump score
  const r = await boostTransmission(id, addr, hex);
  const payload = {
    ok: true,
    burned: hex,
    royaltyToAuthor: royalty,
    boostHex: r.t?.boostHex ?? 0,
    signals: r.t?.signals ?? 0,
  };
  // Cache the response under the idempotency key for 24h so retries
  // replay instead of re-debiting.
  if (idemStorageKey && hasUpstash) {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL!;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
      await fetch(`${url}/SETEX/${encodeURIComponent(idemStorageKey)}/86400/${encodeURIComponent(JSON.stringify(payload))}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {/* non-fatal */}
  }
  return NextResponse.json(payload);
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { ownerOf } from "@/lib/owner-of";
import { getCitizenMeta } from "@/lib/citizen-meta";
import { getWalletTokens } from "@/lib/wallet-tokens";
import { getProgress, getRankByLevel } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ──────────────────────────────────────────────────────────────────────────
 * THE LANDING PAD — owner-scoped, read-only on-chain grounding for session 1.
 *
 * When a holder opens their owned agent for the FIRST time, the workspace asks
 * this for the handful of facts a generic chatbot structurally cannot know:
 * how long they've held THIS citizen, how many OTHER citizens they hold, this
 * citizen's last on-chain sale, its trained level/class/rank. The client
 * already has the civilization (a static prop), so it composes the greeting.
 *
 * Strictly additive and OUTSIDE the money-path: no walletProof, no signature,
 * no ledger mutation — it only READS. It does confirm the supplied address
 * actually owns this citizen (cheap ownerOf) before returning holder-specific
 * facts, so a non-owner can never pull someone else's wallet shape. Every datum
 * is assembled fail-quiet under a hard timeout: a slow RPC/OpenSea/Redis yields
 * a missing field (the client omits that clause), never a blocked workspace and
 * never a fabricated "—". Determinism: if a fact isn't confirmed, it's absent.
 * ────────────────────────────────────────────────────────────────────────── */

/** Resolve a promise, or `null` if it rejects or doesn't settle in `ms`. Keeps
 *  one slow upstream from holding the whole landing payload hostage. */
function withCap<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race<T | null>([
    p.catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:landing:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const raw = new URL(req.url).searchParams.get("address") || "";
  const address = /^0x[a-fA-F0-9]{40}$/.test(raw) ? raw.toLowerCase() : null;

  // Citizen-scoped facts don't need a wallet (sale history / age of the current
  // hold / trained state are public on the citizen). Holder-scoped facts (how
  // many OTHERS this wallet holds) require confirming the wallet owns THIS
  // citizen, so we never leak one wallet's shape to another address.
  const [meta, progress, rank, ownerAddr] = await Promise.all([
    withCap(getCitizenMeta(cid), 4500),
    withCap(getProgress(cid), 2500),
    withCap(getRankByLevel(cid), 2500),
    address ? withCap(ownerOf(cid), 4000) : Promise.resolve(null),
  ]);

  const isOwner = !!(address && ownerAddr && ownerAddr === address);

  // OTHER citizens this wallet holds — only when ownership is confirmed. The
  // enumerator is fail-quiet; if it can't fully enumerate (truncated) we still
  // report a floor, never a wrong "0".
  let otherHeld: number | null = null;
  if (isOwner) {
    const tokens = await withCap(getWalletTokens(address!, 200), 5000);
    if (tokens && typeof tokens.balance === "number" && tokens.balance > 0) {
      otherHeld = Math.max(0, tokens.balance - 1);
    }
  }

  const spec = progress ? deriveSpec(progress) : null;
  // Only surface trained state once the citizen has actually moved past the
  // untrained baseline — a level-1 Trainee with no rank is not a flex.
  const level = progress && progress.level > 1 ? progress.level : null;
  const className = progress && progress.level > 1 ? spec?.className ?? null : null;
  const jobsDone = progress && progress.jobsCompleted > 0 ? progress.jobsCompleted : null;
  const levelRank = typeof rank === "number" ? rank : null;

  return NextResponse.json({
    isOwner,
    // citizen-scoped (public)
    daysHeld: meta?.daysHeld ?? null,
    lastSaleEth: meta?.lastSaleEth ?? null,
    lastSaleTs: meta?.lastSaleTs ?? null,
    level,
    className,
    jobsDone,
    rank: levelRank,
    // holder-scoped (owner-confirmed only)
    otherHeld,
  });
}

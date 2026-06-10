import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { verifyOwnership } from "@/lib/owner-of";
import { getCitizen } from "@/lib/citizens";
import { getJob } from "@/lib/jobs-catalog";
import { applyJob, getProgress, levelProgress } from "@/lib/progression-store";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Atomic single-claim guard (mirrors app/api/mission/claim). Returns true only
// for the FIRST caller for this key within the TTL — concurrent rifle-clicks
// all lose the SET NX race. Jobs are XP-only now, so this guards against
// XP/level FARMING (spamming one job), not ⬡ double-credit.
const claimMemory = new Map<string, number>();
async function claimOnce(key: string, ttlSec: number): Promise<boolean> {
  if (hasUpstash) {
    try {
      const res = await upstash(["SET", key, "1", "NX", "EX", String(ttlSec)]);
      return res === "OK";
    } catch {
      /* fall through to memory */
    }
  }
  const exp = claimMemory.get(key);
  if (exp && exp > Date.now()) return false;
  claimMemory.set(key, Date.now() + ttlSec * 1000);
  return true;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1. Rate limit (per-IP coarse, like mission/claim).
  const rl = await limit(req, "citizen:job", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // 2. CSRF: same-origin only.
  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  // 3. Validate citizen id.
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // 4. Validate jobId against the server-side allowlist (the catalog).
  const body = (await req.json().catch(() => ({}))) as {
    jobId?: string;
    address?: string;
    signature?: string;
  };
  const job = getJob((body.jobId ?? "").trim());
  if (!job) return NextResponse.json({ error: "unknown_job" }, { status: 400 });

  // 5. Auth — prefer a bound X-session (no signature needed); fall back to a
  //    wallet signature (the naming-endpoint pattern) so wallet-only holders
  //    who never did X-OAuth can still work jobs. Either way the payee is the
  //    AUTHENTICATED wallet, never an unverified body field.
  let wallet: string | null = null;
  const session = getSessionFromRequest(req);
  if (session && /^0x[a-f0-9]{40}$/.test((session.bind || "").toLowerCase())) {
    wallet = session.bind.toLowerCase();
  } else if (body.address && body.signature) {
    const address = body.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "invalid address" }, { status: 400 });
    }
    const message = `I am working FREELON CITY citizen #${cid}'s job "${job.id}".`;
    let sigOk = false;
    try {
      sigOk = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: body.signature as `0x${string}`,
      });
    } catch {
      sigOk = false;
    }
    if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    wallet = address;
  }
  if (!wallet) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  // 6. Ownership — unknown → 503 retry (matches name/realign precedent); never
  //    mint on uncertainty. not-owner → 403.
  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL WEAK · couldn't reach the chain just now · wait a moment and retry. Your ownership is safe on-chain." },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // 7. Atomic per-citizen-per-job-per-day claim. Keyed on the CITIZEN, not the
  //    wallet — one completion per job per citizen per UTC day. This still
  //    matters even though jobs no longer pay ⬡: it stops XP rifle-clicking
  //    (farming levels by spamming the same job). TTL 24h, self-expires.
  const day = utcDay();
  const claimKey = `freelon:job:claimed:${cid}:${job.id}:${day}`;
  if (!(await claimOnce(claimKey, 24 * 60 * 60))) {
    return NextResponse.json({ already: true, xpGained: 0 });
  }

  // 8. Apply the citizen-state mutation: XP / level / skill / reputation /
  //    memory + leaderboard sorted sets. NOTE: jobs are XP-ONLY — they do NOT
  //    credit ⬡ (2026-06-02 decision: a farmable currency kills play; revenue
  //    comes only from paid missions, ⬡ is out of the v1 loop entirely).
  const citizen = getCitizen(cid)!;
  const result = await applyJob({
    tokenId: cid,
    jobTitle: job.title,
    requiredSkill: job.requiredSkill,
    rewardXp: job.rewardXp,
    difficulty: job.difficulty,
    signalReward: 0, // no ⬡ — jobs grant XP/skill/reputation only
    civSlug: citizen.civilization,
  });

  // Bust the dossier's ISR (revalidate 3600): this is the one place the public
  // Level / Work-log counts change, and an owner who just did a job otherwise
  // sees an hour-stale meta strip next to a live DispatchPanel (red-team
  // 2026-06-10). One line beats dropping the whole page to a shorter window.
  revalidatePath(`/citizens/${cid}`);

  const lp = levelProgress(result.progress.xp);
  return NextResponse.json({
    ok: true,
    xpGained: result.xpGained,
    leveledUp: result.leveledUp,
    level: result.progress.level,
    xp: result.progress.xp,
    xpToNext: lp.toNext,
    fraction: lp.fraction,
    reputation: result.progress.reputation,
    jobsCompleted: result.progress.jobsCompleted,
    skills: result.progress.skills,
  });
}

// Public read of a citizen's progression (no auth) — used by the profile panel
// to refresh after a completion without a full page reload.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:job:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const progress = await getProgress(cid);
  const lp = levelProgress(progress.xp);
  return NextResponse.json({ progress, levelProgress: lp });
}

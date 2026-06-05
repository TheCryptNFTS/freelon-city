import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { debitWalletHex, creditWalletHex, getWalletHex, InsufficientHexError } from "@/lib/wallet-hex-store";
import { verifyOwnership } from "@/lib/owner-of";
import { getCitizen } from "@/lib/citizens";
import { applyMission, getProgress, levelProgress } from "@/lib/progression-store";
import { getMission, isUnlocked, listMissions, recordRun } from "@/lib/missions";
import type { MissionContext } from "@/lib/missions";
import { upstash, hasUpstash } from "@/lib/upstash-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INPUT = 600;

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

// Atomic per-citizen-per-mission-per-day claim, as a CAPPED COUNTER. Strict
// default max=1 (one run per citizen per mission per UTC day). The test-phase
// ramp (runsPerCitizenPerDay) can raise the max so citizens specialize faster —
// atomic INCR means concurrent calls can't slip past the cap. Each claimed run
// is still a real mission, so the résumé pace is honest, just less throttled.
const dayCountMem = new Map<string, number>();
async function claimDay(key: string, max: number): Promise<boolean> {
  const ttl = 24 * 60 * 60;
  if (hasUpstash) {
    try {
      const n = Number(await upstash(["INCR", key]));
      if (n === 1) await upstash(["EXPIRE", key, String(ttl)]).catch(() => {});
      if (n > max) {
        await upstash(["DECR", key]).catch(() => {});
        return false;
      }
      return true;
    } catch {
      /* fall through to in-memory */
    }
  }
  const cur = dayCountMem.get(key) ?? 0;
  if (cur >= max) return false;
  dayCountMem.set(key, cur + 1);
  return true;
}
async function releaseDay(key: string): Promise<void> {
  if (hasUpstash) {
    try {
      await upstash(["DECR", key]);
      return;
    } catch {
      /* fall through */
    }
  }
  const cur = dayCountMem.get(key) ?? 0;
  if (cur > 0) dayCountMem.set(key, cur - 1);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // 1. Rate limit.
  const rl = await limit(req, "citizen:mission", { max: 12, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  // 2. CSRF: same-origin only.
  const { isSameOrigin, getSessionFromRequest } = await import("@/lib/x-session");
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad_origin" }, { status: 403 });
  }

  // 3. Validate citizen id.
  const { id } = await params;
  const cid = parseInt(id, 10);
  const citizen = getCitizen(cid);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !citizen) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  // 4. Validate missionId against the registry allowlist.
  const body = (await req.json().catch(() => ({}))) as {
    missionId?: string;
    input?: string;
    address?: string;
    signature?: string;
    txHash?: string;
    priorOutput?: string;
  };
  // Multi-turn follow-up: the prior output the holder is refining (capped).
  const priorOutput = typeof body.priorOutput === "string" ? body.priorOutput.slice(0, 4000) : undefined;
  const mission = getMission((body.missionId ?? "").trim());
  if (!mission) return NextResponse.json({ error: "unknown_mission" }, { status: 400 });

  // 5. Auth — bound x-session OR wallet signature (the naming pattern). The
  //    payee/debited wallet is the AUTHENTICATED wallet, never a body field.
  let wallet: string | null = null;
  const session = getSessionFromRequest(req);
  if (session && /^0x[a-f0-9]{40}$/.test((session.bind || "").toLowerCase())) {
    wallet = session.bind.toLowerCase();
  } else if (body.address && body.signature) {
    const address = body.address.toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: "invalid address" }, { status: 400 });
    }
    const message = `I am deploying FREELON CITY citizen #${cid} on mission "${mission.id}".`;
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
  if (!wallet) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  // 6. Ownership — unknown → 503 retry, not-owner → 403.
  const verdict = await verifyOwnership(cid, wallet);
  if (verdict.status === "unknown") {
    return NextResponse.json(
      { error: "⬡ SIGNAL DISRUPTED · the city couldn't read your chain credentials · retry" },
      { status: 503 },
    );
  }
  if (verdict.status === "not-owner") {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  // 7. Progression gate — the citizen must have leveled enough to deploy this.
  const progress = await getProgress(cid);
  if (!isUnlocked(mission, progress)) {
    return NextResponse.json(
      {
        error: "locked",
        message: `Requires Level ${mission.gate.minLevel} (${mission.gate.skill}). This citizen is Level ${progress.level}.`,
        minLevel: mission.gate.minLevel,
        level: progress.level,
      },
      { status: 403 },
    );
  }

  // 8. Input handling.
  const input = mission.inputMode === "prompt" ? (body.input ?? "").trim().slice(0, MAX_INPUT) : "";
  if (mission.inputMode === "prompt" && !input) {
    return NextResponse.json({ error: "input_required" }, { status: 400 });
  }

  // 8a-pre. KILL-SWITCH — engine off (env) refuses every run up front, BEFORE
  // any payment prompt, so a paying holder is never told to send ETH while the
  // agents are down.
  const { agentsKilled, consumeFreeRun, refundFreeRun, runsPerCitizenPerDay } = await import("@/lib/missions/budget");
  if (agentsKilled()) {
    return NextResponse.json(
      { error: "agents_offline", message: "The agents are briefly offline for maintenance. Back shortly." },
      { status: 503 },
    );
  }

  // 8a-unlock. UNLOCK GATE — when PAYMENTS_LIVE, premium/image abilities require
  // the citizen to be UNLOCKED and spend ONE signal credit (finite pool → a
  // holder can never outspend their unlock). Replaces per-mission payment for
  // these. Free commodity abilities are unaffected. While PAYMENTS_LIVE is off,
  // requiresUnlock-gated missions just run free (test mode).
  const { PAYMENTS_LIVE } = await import("@/lib/missions/pricing");
  const { requiresUnlock } = await import("@/lib/missions/unlock");
  const unlockGated = PAYMENTS_LIVE && requiresUnlock(mission.id);
  // HEX is the single usage currency (2026-06-04). A premium ability still needs
  // the citizen UNLOCKED (the one-time ETH gate, which dropped bonus HEX in the
  // wallet) — but the run itself is now paid in HEX, not a separate credit pool.
  let premiumHexSpent = 0; // HEX charged for this premium run (refunded on failure)
  let premiumBudgetCents = 0; // premium $-pool charge for this run (refunded on failure)
  if (unlockGated) {
    // PROVIDER GUARD — never debit HEX for a render we can't actually perform
    // (image needs OpenAI, video needs Replicate). Checked BEFORE any charge, like
    // the kill-switch — avoids the debit-then-refund dance the red-team flagged.
    if (mission.id === "deploy-citizen" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "image_unavailable", message: "Image generation is briefly unavailable — nothing was charged." }, { status: 503 });
    }
    if (mission.id === "deploy-video" && !process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "video_unavailable", message: "Video is coming soon — not switched on yet. Nothing was charged." }, { status: 503 });
    }
    const { isUnlocked } = await import("@/lib/missions/unlock-store");
    if (!(await isUnlocked(cid))) {
      return NextResponse.json(
        { error: "unlock_required", message: "Unlock this FREELON to use its premium abilities." },
        { status: 402 },
      );
    }
    // PREMIUM $-BUDGET BACKSTOP — premium runs are HEX-paid, but HEX is faucet-fed,
    // so bound the founder's daily premium COGS up front. Consumed before the model
    // call; refunded if the run fails. (Economy red-team C1/C2: premium had no $ cap.)
    const { consumePremiumRun, refundPremiumRun, PREMIUM_COST_CENTS } = await import("@/lib/missions/budget");
    const premCents = mission.id === "deploy-video" ? PREMIUM_COST_CENTS.video : mission.id === "deploy-citizen" ? PREMIUM_COST_CENTS.image : PREMIUM_COST_CENTS.text;
    const pbud = await consumePremiumRun(premCents);
    if (!pbud.ok) {
      return NextResponse.json(
        { error: "premium_capacity", message: pbud.reason === "killed" ? "The agents are briefly offline. Back shortly." : "Premium agents hit today's capacity — back at UTC midnight. Your ⬡ was not spent." },
        { status: 503 },
      );
    }
    premiumBudgetCents = premCents;
    const { premiumHexFor } = await import("@/lib/economy-constants");
    const cost = premiumHexFor(mission.id);
    if (cost > 0) {
      const rec = await getWalletHex(wallet);
      if (rec.balance < cost) {
        await refundPremiumRun(premiumBudgetCents); premiumBudgetCents = 0;
        return NextResponse.json(
          { error: "insufficient_hex", required: cost, balance: rec.balance, message: `This run costs ${cost}⬡. Earn more ⬡, or unlock to top up.` },
          { status: 402 },
        );
      }
      try {
        await debitWalletHex(wallet, cost, {
          kind: "manual",
          note: `Premium: ${mission.title} on #${String(cid).padStart(4, "0")} (-${cost}⬡)`,
        });
      } catch (e) {
        await refundPremiumRun(premiumBudgetCents); premiumBudgetCents = 0;
        if (e instanceof InsufficientHexError) {
          return NextResponse.json({ error: "insufficient_hex", required: cost }, { status: 402 });
        }
        return NextResponse.json({ error: "debit_failed" }, { status: 402 });
      }
      premiumHexSpent = cost;
    }
  }

  // 8a. PAYMENT GATE — when PAYMENTS_LIVE and this mission has a USD price (and
  // it is NOT unlock-gated), the holder must have PAID and pass the tx hash.
  // Unlock-gated abilities use the credit system above, not per-mission payment.
  const { isPaid } = await import("@/lib/missions/pricing");
  const paid = isPaid(mission.id) && !requiresUnlock(mission.id);
  // The txHash that settled this paid run — kept so we can RELEASE it if the
  // resolver fails (the holder already sent ETH; they must be able to retry).
  let paidTxHash: string | null = null;
  if (paid) {
    const txHash = typeof body.txHash === "string" ? body.txHash : "";
    if (!txHash) {
      return NextResponse.json(
        { error: "payment_required", message: "Get a quote and send the ETH first, then submit the tx hash." },
        { status: 402 },
      );
    }
    const { verifyPayment } = await import("@/lib/payments/orders");
    const v = await verifyPayment({ wallet, citizenId: cid, missionId: mission.id, txHash });
    if (!v.ok) {
      // awaiting_confirmations / tx_not_found_yet are retryable → 425; the rest 402.
      const retry = v.error === "awaiting_confirmations" || v.error === "tx_not_found_yet";
      return NextResponse.json({ error: v.error }, { status: retry ? 425 : 402 });
    }
    paidTxHash = txHash;
  }

  // 8b. FREE missions (no payment) are capped to one run per citizen per UTC day
  // via an atomic day-claim, so a free run can't be spammed against API cost.
  // Paid (verified) missions skip this — payment is their throttle.
  // Unlock-gated runs are NOT "free-tier" — the signal credit is their throttle,
  // so they skip the 1-per-day free cap + the global free budget (an unlocked
  // holder can run as many premium jobs as they have credits).
  const isFree = !paid && !unlockGated && mission.cost <= 0;
  const dayKey = `freelon:mission:day:${cid}:${mission.id}:${utcDay()}`;
  const perDayMax = runsPerCitizenPerDay();
  // Cents charged against the daily $ budget for THIS free run (refunded if it
  // fails). Set inside the free branch; 0 for paid runs (they don't draw the pool).
  let runCostCents = 0;
  if (isFree) {
    if (!(await claimDay(dayKey, perDayMax))) {
      return NextResponse.json(
        {
          already: true,
          message:
            perDayMax > 1
              ? `"${mission.title}" hit today's training limit (${perDayMax}×) for this citizen. Resets at UTC midnight.`
              : `"${mission.title}" already run for this citizen today. Resets at UTC midnight.`,
        },
      );
    }
    // GLOBAL DAILY $ BUDGET — charge this run's estimated cost against the
    // collection-wide daily pool (image runs cost ~5× a text run). Consume after
    // the per-citizen day-claim so only genuine new runs count.
    const { RUN_COST_CENTS } = await import("@/lib/missions/budget");
    runCostCents = mission.id === "deploy-video"
      ? RUN_COST_CENTS.video
      : mission.id === "deploy-citizen"
      ? RUN_COST_CENTS.image
      : RUN_COST_CENTS.text;
    const budget = await consumeFreeRun(runCostCents);
    if (!budget.ok) {
      await releaseDay(dayKey); // let this citizen try again once budget resets
      return NextResponse.json(
        {
          capacity: true,
          message:
            budget.reason === "killed"
              ? "The agents are briefly offline for maintenance. Back shortly."
              : "The city's agents have hit today's free capacity. Back at UTC midnight.",
        },
        { status: 503 },
      );
    }
  }

  // 9. Balance check, then DEBIT the ⬡ sink — ONLY for ⬡-cost missions. Free
  // missions never touch the ledger; UNLOCK-GATED missions are paid via the
  // premium-run credit (already spent above), so they must NOT also debit ⬡ —
  // otherwise a non-zero-cost unlock mission would double-charge, and an infra
  // throw here would burn the spent credit with no refund. (Bug fix 2026-06-04.)
  if (!isFree && !unlockGated && mission.cost > 0) {
    const rec = await getWalletHex(wallet);
    if (rec.balance < mission.cost) {
      return NextResponse.json(
        { error: "insufficient_hex", required: mission.cost, balance: rec.balance },
        { status: 402 },
      );
    }
    try {
      await debitWalletHex(wallet, mission.cost, {
        kind: "manual",
        note: `Mission: ${mission.title} on #${String(cid).padStart(4, "0")} (-${mission.cost}⬡)`,
      });
    } catch (e) {
      if (e instanceof InsufficientHexError) {
        return NextResponse.json({ error: "insufficient_hex", required: mission.cost }, { status: 402 });
      }
      return NextResponse.json({ error: "debit_failed" }, { status: 402 });
    }
  }

  // 10. Run the resolver. If it throws OR returns ok:false, REFUND the burn —
  //     never charge for undelivered output.
  // PREMIUM = a genuinely PAID run → deep model + oracle depth (persona/llm read
  // ctx.paid). A premium ability is unlock-gated, so the ETH-`paid` flag above is
  // false for it (paid = isPaid && !requiresUnlock); the real signal is that we
  // charged HEX for it. Without this, a holder who PAID (unlock + HEX) would get
  // the cheap, shallow model. (Bug found in debug pass 2026-06-04.)
  const isPaidRun = paid || premiumHexSpent > 0;
  const ctx: MissionContext = { citizen, progress, input, walletAddress: wallet, paid: isPaidRun, priorOutput };
  let output;
  try {
    output = await mission.resolve(ctx);
  } catch (e) {
    output = { ok: false, title: "Mission failed", body: "", error: "resolver_error" };
    // OPS: record the crash so failures are visible, not silent.
    import("@/lib/missions/ops-log").then((m) => m.recordError(`resolve:${mission.id}`, e, { tokenId: cid, wallet })).catch(() => {});
  }
  // OPS: record real LLM token spend (best-effort) so cost is observable.
  if (output.ok) {
    const pt = typeof output.meta?.promptTokens === "number" ? output.meta.promptTokens : 0;
    const ojt = typeof output.meta?.completionTokens === "number" ? output.meta.completionTokens : 0;
    const isImg = output.meta?.kind === "image";
    const isVid = output.meta?.kind === "video";
    import("@/lib/missions/ops-log").then((m) => {
      if (isVid) return m.recordVideo();
      if (isImg) return m.recordImage();
      return m.recordRunCost({ tier: isPaidRun ? "premium" : "cheap", promptTokens: pt, completionTokens: ojt });
    }).catch(() => {});
    // Feed the public transforms wall (fire-and-forget; recordTransform never
    // throws and silently drops anything that isn't a clean https image URL).
    if (isImg && typeof output.body === "string") {
      const styleLabel =
        (typeof body.input === "string" ? body.input : "")
          .replace(/^style:/, "")
          .replace(/[-_]+/g, " ")
          .trim()
          .slice(0, 40) || "scene";
      import("@/lib/transforms-feed")
        .then((m) => m.recordTransform({ tokenId: cid, url: output.body as string, style: styleLabel }))
        .catch(() => {});
    }
  }
  if (!output.ok) {
    // A failed premium run never happened → give the premium $-pool charge back so
    // a no-output run doesn't eat the daily premium budget.
    if (premiumBudgetCents > 0) {
      const { refundPremiumRun } = await import("@/lib/missions/budget");
      await refundPremiumRun(premiumBudgetCents).catch(() => {});
    }
    // Premium mission failed → give the spent HEX back (no output, no charge).
    // The holder can just run again. A FAILED refund is logged (red-team: a silently
    // lost refund on the priciest lever is the worst holder-trust bug).
    if (premiumHexSpent > 0) {
      await creditWalletHex(wallet, premiumHexSpent, {
        kind: "manual",
        note: `Refund: ${mission.title} on #${String(cid).padStart(4, "0")} (+${premiumHexSpent}⬡)`,
      }).catch((e) =>
        import("@/lib/missions/ops-log").then((m) => m.recordError(`refund:${mission.id}`, e, { tokenId: cid, wallet })).catch(() => {}),
      );
      return NextResponse.json(
        { error: "mission_failed", message: output.error || "No output — your ⬡ was refunded. Try again.", retryable: true },
        { status: 502 },
      );
    }
    if (isFree) {
      // Free mission failed → release the day-claim AND give back the budget
      // charge so a no-output run costs neither the holder's day nor the pool.
      await releaseDay(dayKey);
      await refundFreeRun(runCostCents);
      return NextResponse.json(
        { error: "mission_failed", message: output.error || "The mission produced no output. Try again." },
        { status: 502 },
      );
    }
    // PAID mission failed → the holder already sent ETH (which we can't auto-
    // refund). Release the tx-used mark so they can RE-RUN with the same payment
    // (their quote is still valid for its TTL). Never burn paid-for output.
    if (paidTxHash) {
      const { releaseTx } = await import("@/lib/payments/orders");
      await releaseTx(paidTxHash);
    }
    await creditWalletHex(wallet, mission.cost, {
      kind: "manual",
      note: `Refund: ${mission.title} on #${String(cid).padStart(4, "0")} (+${mission.cost}⬡)`,
    }).catch(() => {});
    return NextResponse.json(
      {
        error: "mission_failed",
        message:
          output.error ||
          "The mission produced no output. Your payment is still valid — press run again to retry at no extra cost.",
        retryable: true,
      },
      { status: 502 },
    );
  }

  // 11. Apply progression (XP + skill + memory) and record telemetry.
  // RÉSUMÉ RULE: only PROFESSIONAL missions set the durable "tuned for X" focus.
  // Cosmetic (Deploy → an image) and social (Feud) must NOT make the citizen
  // "tuned for neon rooftops" — they get gallery/XP only, no professional-brain
  // pollution. (category defaults to "professional" when unset.)
  const category = mission.category ?? "professional";
  const focusHint =
    category === "professional" && typeof output.meta?.focus === "string"
      ? output.meta.focus
      : undefined;
  // The holder is ALREADY charged at this point. If progression persistence throws
  // (e.g. Upstash blip), we must STILL deliver the output they paid for — never
  // charge-without-delivery. Fall back to the pre-run progress and log it. (H2 fix)
  let result: Awaited<ReturnType<typeof applyMission>>;
  try {
    result = await applyMission({
      tokenId: cid,
      missionTitle: mission.title,
      outputTitle: output.title,
      skill: mission.gate.skill,
      rewardXp: mission.rewardXp,
      costBurned: mission.cost,
      civSlug: citizen.civilization,
      focusHint,
      // Only professional work advances the class/track-record (same gate as focus).
      countsTowardClass: category === "professional",
    });
  } catch (e) {
    import("@/lib/missions/ops-log").then((m) => m.recordError(`applyMission:${mission.id}`, e, { tokenId: cid, wallet })).catch(() => {});
    result = { xpGained: 0, leveledUp: false, progress } as Awaited<ReturnType<typeof applyMission>>;
  }
  await recordRun(mission.id, mission.cost).catch(() => {});

  // AGENT NOTIFICATIONS (best-effort, deduped, never block the response):
  // level-up, and a "runs low" nudge when a premium run dropped to/under the
  // threshold. Fully wrapped — a failed import here must NEVER 500 a run that
  // already succeeded + (for premium) already spent a credit. (Hardened 2026-06-04.)
  try {
    const { notifyAgentLevelUp } = await import("@/lib/missions/agent-notify");
    if (result.leveledUp) {
      const { deriveSpec } = await import("@/lib/specialization");
      const spec = deriveSpec(result.progress);
      await notifyAgentLevelUp({
        wallet, tokenId: cid, level: result.progress.level,
        rankLabel: spec.cls !== "drifter" ? spec.rank.label : undefined,
      }).catch(() => {});
    }
  } catch { /* notifications are non-critical — never block the response */ }

  // Paid run delivered → retire the order so it can't linger (the tx-used mark
  // already blocks any replay; this is hygiene).
  if (paidTxHash) {
    const { consumeOrder } = await import("@/lib/payments/orders");
    await consumeOrder(wallet, mission.id, cid).catch(() => {});
  }

  // Record the actual output into the citizen's body of work (agent history),
  // for ability/deploy missions that produced something the holder keeps —
  // BUT only if the brief was storable (memory hygiene: unsafe briefs don't
  // get saved/showcased on the citizen). Images (allowlisted scenes) always pass.
  const metaAbility = typeof output.meta?.ability === "string" ? output.meta.ability : null;
  const isImage = output.meta?.kind === "image";
  const { briefIsStorable } = await import("@/lib/missions/memory-filter");
  if ((metaAbility || isImage) && (isImage || briefIsStorable(input))) {
    const { addAgentWork } = await import("@/lib/agent-history");
    await addAgentWork(cid, {
      ability: metaAbility ?? "deploy",
      abilityLabel: metaAbility ?? "Deploy",
      task: typeof output.meta?.task === "string" ? output.meta.task : (typeof output.meta?.scene === "string" ? output.meta.scene : ""),
      brief: input,
      kind: isImage ? "image" : "text",
      body: output.body,
      level: result.progress.level,
    }).catch(() => {});
  }

  const lp = levelProgress(result.progress.xp);
  return NextResponse.json({
    ok: true,
    output,
    costBurned: mission.cost,
    xpGained: result.xpGained,
    leveledUp: result.leveledUp,
    level: result.progress.level,
    xp: result.progress.xp,
    xpToNext: lp.toNext,
    fraction: lp.fraction,
    skills: result.progress.skills,
  });
}

// Public: the mission catalog + this citizen's unlocked state, for the board.
// Never exposes resolve(); only the display + gating fields.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:mission:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const progress = await getProgress(cid);
  const missions = listMissions().map((m) => ({
    id: m.id,
    title: m.title,
    tagline: m.tagline,
    description: m.description,
    cost: m.cost,
    rewardXp: m.rewardXp,
    outputKind: m.outputKind,
    inputMode: m.inputMode,
    gate: m.gate,
    unlocked: isUnlocked(m, progress),
  }));
  return NextResponse.json({ level: progress.level, missions });
}

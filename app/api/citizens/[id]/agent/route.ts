import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { listAbilityViews } from "@/lib/missions/abilities";
import { getAgentHistory } from "@/lib/agent-history";
import { PAYMENTS_LIVE } from "@/lib/missions/pricing";
import { requiresUnlock } from "@/lib/missions/unlock";
import { unlockStatus } from "@/lib/missions/unlock-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only: the citizen's six abilities (display-only — no resolvers or
// internal instructions), its derived class/level, and its body of work. Feeds
// the agent dashboard.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "citizen:agent:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040 || !getCitizen(cid)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const progress = await getProgress(cid);
  const spec = deriveSpec(progress);
  const { premiumHexFor } = await import("@/lib/economy-constants");
  const abilities = listAbilityViews().map((a) => ({
    ...a,
    // every ability is available from level 1 in the free internal build;
    // the dominant-skill ability is the citizen's "primary".
    primary: spec.dominantSkill === a.skill,
    // Whether this ability needs the citizen unlocked (premium). Display-only —
    // the server re-checks on run, so a tampered client can't skip the gate.
    premium: requiresUnlock(a.id),
    // HEX charged per run for premium abilities (0 = free). Single-currency model.
    hexCost: premiumHexFor(a.id),
  }));
  // PUBLIC PORTFOLIO: expose the body of work (outputs are the citizen's
  // showcase), but STRIP the holder's raw `brief` — that's their private input
  // (project details, numbers, launch plans) and must never be readable by a
  // non-owner. The brief is not rendered anywhere; only the output is.
  const history = (await getAgentHistory(cid)).map(({ brief: _brief, ...rest }) => rest);
  const unlock = await unlockStatus(cid);
  // Image scenes + character-transform STYLES (for the dashboard picker) + price.
  const { SCENES, STYLES } = await import("@/lib/missions/image-gen");
  const scenes = Object.entries(SCENES).map(([key, s]) => ({ key, label: s.label }));
  const styles = Object.entries(STYLES).map(([key, s]) => ({ key, label: s.label, category: s.category }));
  const imageHexCost = premiumHexFor("deploy-citizen");
  return NextResponse.json({
    level: progress.level,
    className: spec.className,
    classCapability: spec.capability,
    paymentsLive: PAYMENTS_LIVE,
    unlock, // { unlocked, credits, tier, priceEth, grantPerUnlock }
    abilities,
    scenes,
    styles,
    imageHexCost,
    history,
  });
}

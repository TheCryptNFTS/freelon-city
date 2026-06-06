import { limit, tooManyResponse } from "@/lib/rate-limit";
import { publicJson, publicOptions, publicCors, parseTokenId } from "@/lib/public-api";
import { getProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { getCitizen } from "@/lib/citizens";
import { ownerOf } from "@/lib/owner-of";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/citizens/:id
 * Public agent profile: identity (name/civ/tier), live progression, derived
 * class/spec/résumé, and current on-chain owner. Read-only public data.
 */
export async function OPTIONS() {
  return publicOptions();
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "v1-citizen", { max: 120, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await ctx.params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return NextResponse.json({ error: "tokenId must be 1..4040" }, { status: 400, headers: publicCors() });
  }

  const meta = getCitizen(tokenId);
  const progress = await getProgress(tokenId);
  const spec = deriveSpec(progress);
  const owner = await ownerOf(tokenId).catch(() => null);

  return publicJson({
    tokenId,
    name: meta?.name ?? null,
    civilization: meta?.civilization ?? null,
    tier: meta?.tier ?? null,
    shape: meta?.shape ?? null,
    owner,
    demo: progress.demo ?? false,
    level: progress.level,
    xp: progress.xp,
    reputation: progress.reputation,
    jobsCompleted: progress.jobsCompleted,
    skills: progress.skills,
    spec: {
      className: spec.className,
      capability: spec.capability,
      rank: spec.rank.label,
      dominantSkill: spec.dominantSkill,
      title: spec.title(progress.level),
      tunedFor: spec.tuning.tunedFor,
      resume: spec.resume,
    },
  });
}

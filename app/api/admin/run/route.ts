import { NextResponse } from "next/server";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
// Barrel import so the catalog's registerMission() side effects run (same reason
// the HTTP route + train tool import "@/lib/missions" and not the registry).
import { getMission } from "@/lib/missions";
import type { MissionContext } from "@/lib/missions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // a real LLM call — allow time

/**
 * FOUNDER DRY-RUN — run ONE real agent job and return the FULL output, WITHOUT
 * persisting anything: no XP, no level change, no public work-log entry. Lets the
 * operator eyeball the exact quality a paying buyer would get before going live.
 *
 * SAFE ON PROD by construction: it only calls the resolver (read-only + the LLM)
 * and never touches applyMission / addAgentWork, so there are NO writes — hence no
 * Upstash guard is needed (unlike /api/admin/train, which does persist).
 *
 * Gated by ADMIN_SEED_KEY (404 unset, 403 wrong key).
 * Body: { tokenId, missionId, brief }
 */
export async function POST(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const url = new URL(req.url);
  const given = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  if (given !== key) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    tokenId?: number;
    missionId?: string;
    brief?: string;
  };

  const tokenId = Number(body.tokenId);
  if (!Number.isFinite(tokenId) || tokenId < 1 || tokenId > 4040) {
    return NextResponse.json({ error: "bad_token", message: "Enter a token # from 1–4040." }, { status: 400 });
  }
  const mission = getMission(String(body.missionId || ""));
  if (!mission) {
    return NextResponse.json({ error: "bad_mission", message: "Pick an ability." }, { status: 400 });
  }
  const brief = String(body.brief || "").trim();
  if (!brief) {
    return NextResponse.json({ error: "no_brief", message: "Type a brief for the agent." }, { status: 400 });
  }

  const citizen = getCitizen(tokenId);
  if (!citizen) {
    return NextResponse.json({ error: "unknown_citizen", message: `No citizen #${tokenId}.` }, { status: 404 });
  }

  const progress = await getProgress(tokenId);
  const input = mission.inputMode === "prompt" ? brief.slice(0, 600) : "";

  // paid:true → full paid depth, so the founder sees the quality a BUYER gets
  // (free runs would use the cheap, shallower model). This is a dry-run, so the
  // small LLM cost is the only side effect.
  const ctx: MissionContext = { citizen, progress, input, walletAddress: "admin-dryrun", paid: true };

  try {
    const output = await mission.resolve(ctx);
    if (!output.ok) {
      return NextResponse.json({ error: "resolver_failed", message: output.error || "no output" }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      dryRun: true,
      tokenId,
      missionId: mission.id,
      title: output.title,
      body: output.body,
      kind: output.meta?.kind === "image" ? "image" : "text",
    });
  } catch (e) {
    return NextResponse.json({ error: "resolver_threw", message: (e as Error).message }, { status: 500 });
  }
}

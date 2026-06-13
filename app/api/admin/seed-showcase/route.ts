import { NextResponse } from "next/server";
import { adminKeyAuthed } from "@/lib/admin-auth";
import { getAllCitizens, getCitizen } from "@/lib/citizens";
import { seedProgress, type SkillKey } from "@/lib/progression-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FOUNDER TOOL — seed the showcase with trained "display model" citizens so the
 * Top Agents wall + hero pages aren't empty before real holders train theirs.
 * Seeds the 4 one-of-ones (top-ranked, distinct classes) + the 35 honoraries
 * (spread across all six classes / ranks). Direct progression seed — no LLM, no
 * cost. These are citizens the FOUNDER controls; real holders still earn their
 * résumés the hard way (unfakeable).
 *
 * Guarded by ADMIN_SEED_KEY: returns 404 when the env var is unset (disabled),
 * 403 on a wrong key. Run once:
 *   curl -X POST "https://www.freeloncity.com/api/admin/seed-showcase" -H "x-admin-key: YOUR_KEY"
 * Remove the env var (or this file) afterwards to re-lock it.
 */

const SKILLS: SkillKey[] = ["content", "strategy", "sales", "research", "design", "risk"];
const FOCUS: Record<SkillKey, string> = {
  content: "threads",
  strategy: "launches",
  sales: "closing",
  research: "markets",
  design: "brand",
  risk: "mint-risks",
};

// The four heroes — most-trained, hand-assigned classes that fit their lore.
const HEROES: Record<number, { skill: SkillKey; points: number; focus: string }> = {
  1: { skill: "strategy", points: 44, focus: "launches" },      // Origin Signal → Mastermind
  404: { skill: "research", points: 40, focus: "signal-recovery" }, // Patient Zero → Oracle-tier
  1337: { skill: "risk", points: 46, focus: "exploits" },        // Genesis Hex → Adversary
  4040: { skill: "sales", points: 38, focus: "closing" },        // The Final Signal → Rainmaker
};

export async function POST(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  if (!adminKeyAuthed(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const seeded: { id: number; skill: SkillKey; points: number }[] = [];

  // Heroes.
  for (const [idStr, plan] of Object.entries(HEROES)) {
    const id = parseInt(idStr, 10);
    if (!getCitizen(id)) continue;
    await seedProgress({ tokenId: id, skill: plan.skill, points: plan.points, focus: plan.focus });
    seeded.push({ id, skill: plan.skill, points: plan.points });
  }

  // Honoraries — spread across all six classes, ranks Adept → Specialist (12,20,28,36).
  const honoraries = getAllCitizens().filter((c) => c.tier === "Honorary");
  for (let i = 0; i < honoraries.length; i++) {
    const id = honoraries[i].id;
    const skill = SKILLS[i % SKILLS.length];
    const points = 12 + (i % 4) * 8;
    await seedProgress({ tokenId: id, skill, points, focus: FOCUS[skill] });
    seeded.push({ id, skill, points });
  }

  return NextResponse.json({ ok: true, seeded: seeded.length, citizens: seeded });
}

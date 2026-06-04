import { NextResponse } from "next/server";
import { getCitizen } from "@/lib/citizens";
import { seedProgress, type SkillKey } from "@/lib/progression-store";
import { setCitizenHex } from "@/lib/citizen-value-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEMO SEED — five fully-trained "display model" FREELONS, one per role, with
 * named work history + HEX, so the agent résumé / Top Agents UI can be screened
 * and judged with real-looking data.
 *
 * SAFETY: gated by ADMIN_SEED_KEY (404 when unset, 403 on wrong key). Intended
 * to be run ONLY on a LOCAL, in-memory instance (no Upstash) — DO NOT run it
 * against the production Redis. The endpoint refuses to run unless
 * SEED_DEMO_ALLOW_UPSTASH=1 is ALSO set, so a stray curl against a server wired
 * to prod Redis can't silently pollute live data.
 *
 *   UPSTASH_REDIS_REST_URL="" UPSTASH_REDIS_REST_TOKEN="" \
 *   ADMIN_SEED_KEY=demo next dev -p 3001
 *   curl -X POST "http://localhost:3001/api/admin/seed-demo?key=demo"
 */

type Persona = {
  skill: SkillKey;
  focus: string;
  targetLevel: number;
  jobsCompleted: number;
  reputation: number;
  hex: number;
  workHistory: string[];
};

// Mapped onto the four 1/1s + one Legendary so they headline the showcase.
const DEMO: Record<number, Persona> = {
  1: { // Origin Signal → Strategist / Mastermind
    skill: "strategy", focus: "launches", targetLevel: 32, jobsCompleted: 61, reputation: 94, hex: 1240,
    workHistory: ["Red-teamed launch plan", "Built mint strategy", "Reviewed holder announcement", "Created rollout plan"],
  },
  4040: { // The Final Signal → Writer / Campaign Builder
    skill: "content", focus: "campaigns", targetLevel: 24, jobsCompleted: 38, reputation: 87, hex: 820,
    workHistory: ["Wrote X thread", "Rewrote Discord announcement", "Created holder FAQ", "Built launch copy"],
  },
  1337: { // Genesis Hex → Red Team / Risk Finder
    skill: "risk", focus: "risk-review", targetLevel: 19, jobsCompleted: 29, reputation: 91, hex: 760,
    workHistory: ["Found weak pitch points", "Flagged overclaim risk", "Tested buy-flow confusion", "Reviewed website funnel"],
  },
  404: { // Patient Zero → Researcher / Signal Analyst
    skill: "research", focus: "market-research", targetLevel: 15, jobsCompleted: 21, reputation: 78, hex: 540,
    workHistory: ["Researched AI NFT comparisons", "Summarised project branches", "Built holder clarity notes", "Mapped ecosystem structure"],
  },
  4039: { // a Legendary → Designer / Visual Fixer
    skill: "design", focus: "ui-review", targetLevel: 13, jobsCompleted: 17, reputation: 74, hex: 430,
    workHistory: ["Reviewed page hierarchy", "Suggested hero copy", "Improved agent résumé layout", "Checked mobile readability"],
  },
};

export async function POST(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const url = new URL(req.url);
  const given = url.searchParams.get("key") || req.headers.get("x-admin-key") || "";
  if (given !== key) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // PROD-REDIS GUARD: refuse to write demo data to a real Upstash unless the
  // operator explicitly opts in. Keeps "run it locally" from contaminating prod.
  const { hasUpstash } = await import("@/lib/upstash-client");
  if (hasUpstash && process.env.SEED_DEMO_ALLOW_UPSTASH !== "1") {
    return NextResponse.json(
      { error: "refused_upstash", message: "This instance is wired to Upstash. Run it on a no-Upstash local instance, or set SEED_DEMO_ALLOW_UPSTASH=1 to override." },
      { status: 409 },
    );
  }

  const seeded: { id: number; role: SkillKey; level: number; hex: number }[] = [];
  for (const [idStr, p] of Object.entries(DEMO)) {
    const id = parseInt(idStr, 10);
    if (!getCitizen(id)) continue;
    const rec = await seedProgress({
      tokenId: id, skill: p.skill, points: p.jobsCompleted, focus: p.focus,
      targetLevel: p.targetLevel, reputation: p.reputation, jobsCompleted: p.jobsCompleted,
      workHistory: p.workHistory,
    });
    await setCitizenHex(id, p.hex);
    seeded.push({ id, role: p.skill, level: rec.level, hex: p.hex });
  }

  return NextResponse.json({ ok: true, seeded: seeded.length, citizens: seeded });
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { isValidAddress, getWalletTokens } from "@/lib/wallet-tokens";
import { getCitizen } from "@/lib/citizens";
import { getProgress } from "@/lib/progression-store";
import { deriveSpec } from "@/lib/specialization";
import { CLASS_META, CLASS_BY_SKILL } from "@/lib/specialization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Your stable" — the wallet's owned citizens grouped by the CLASS each has
// specialized into, plus the role gaps. This is the merchandising for "hold more
// than one": each FREELON specializes into ONE class, so covering more roles
// means holding more citizens (and, with crew jobs, a team that works together).
const ROLE_ORDER = Object.values(CLASS_BY_SKILL); // the 6 real classes, skill order

export async function GET(req: Request, { params }: { params: Promise<{ address: string }> }) {
  const rl = await limit(req, "wallet:stable", { max: 30, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { address } = await params;
  if (!isValidAddress(address)) {
    return NextResponse.json({ balance: 0, citizens: [], covered: [], gaps: [] });
  }
  const tokens = await getWalletTokens(address, 48);
  if (!tokens) {
    return NextResponse.json({ balance: 0, citizens: [], covered: [], gaps: [] });
  }
  const ids = tokens.tokenIds.slice(0, 24); // bound the per-citizen progression reads
  const citizens: { tokenId: number; name: string; cls: string; className: string; level: number }[] = [];
  for (const tid of ids) {
    const c = getCitizen(tid);
    if (!c) continue;
    let cls = "drifter";
    let className = CLASS_META.drifter.name;
    let level = 1;
    try {
      const prog = await getProgress(tid);
      const spec = deriveSpec(prog);
      cls = spec.cls;
      className = spec.className;
      level = prog.level;
    } catch {
      /* default to untrained */
    }
    citizens.push({
      tokenId: tid,
      name: c.transmission_name || c.honoree || `Citizen #${tid.toString().padStart(4, "0")}`,
      cls,
      className,
      level,
    });
  }

  const have = new Set(citizens.map((c) => c.cls).filter((c) => c !== "drifter"));
  const covered = ROLE_ORDER.filter((r) => have.has(r)).map((r) => ({ cls: r, name: CLASS_META[r].name }));
  const gaps = ROLE_ORDER.filter((r) => !have.has(r)).map((r) => ({ cls: r, name: CLASS_META[r].name, capability: CLASS_META[r].capability }));

  return NextResponse.json({ balance: tokens.balance, citizens, covered, gaps });
}

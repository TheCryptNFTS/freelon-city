import { NextResponse } from "next/server";
import { isValidAddress, getWalletTokens } from "@/lib/wallet-tokens";
import { getCitizen } from "@/lib/citizens";
import { getReckoning, getGeneral, listGenerals } from "@/lib/reckoning-store";
import { musterMultiplier } from "@/lib/reckoning-config";
import { CIVILIZATIONS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CIV_SLUGS = Object.keys(CIVILIZATIONS);

/**
 * GET /api/reckoning/state[?address=0x..]
 *
 * The live weekly war board + crowned archive + this week's top generals.
 * If `address` is supplied (and resolves on-chain), also returns that wallet's
 * per-civ muster preview (held citizens per civ → multiplier) and their own
 * weekly contribution — read-only, mints nothing.
 */
export async function GET(req: Request) {
  const view = await getReckoning();
  const generals = await listGenerals(view.week, 20);

  const url = new URL(req.url);
  const address = (url.searchParams.get("address") || "").toLowerCase();

  let wallet:
    | {
        address: string;
        score: number;
        rawHex: number;
        heldByCiv: Record<string, number>;
        musterByCiv: Record<string, number>;
        rawByCiv: Record<string, number>;
      }
    | null = null;

  if (isValidAddress(address)) {
    const heldByCiv: Record<string, number> = {};
    const musterByCiv: Record<string, number> = {};
    for (const s of CIV_SLUGS) {
      heldByCiv[s] = 0;
      musterByCiv[s] = 1;
    }
    try {
      const tokens = await getWalletTokens(address, 500);
      if (tokens) {
        for (const id of tokens.tokenIds) {
          const civ = getCitizen(id)?.civilization;
          if (civ && civ in heldByCiv) heldByCiv[civ] += 1;
        }
        for (const s of CIV_SLUGS) musterByCiv[s] = musterMultiplier(heldByCiv[s]);
      }
    } catch {
      /* treat as non-holder if ownership lookup fails — all 1x */
    }
    const gen = await getGeneral(view.week, address);
    wallet = {
      address,
      score: gen.score,
      rawHex: gen.rawHex,
      heldByCiv,
      musterByCiv,
      rawByCiv: gen.rawByCiv ?? {},
    };
  }

  return NextResponse.json({ ...view, generals, wallet });
}

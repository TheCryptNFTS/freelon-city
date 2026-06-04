import { NextResponse } from "next/server";
import { getCitizen } from "@/lib/citizens";
import { ownerOf } from "@/lib/owner-of";
import { PAYMENTS_LIVE, PAYMENT_WALLET } from "@/lib/missions/pricing";
import { unlockTierFor } from "@/lib/missions/unlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GO-LIVE PREFLIGHT — READ-ONLY. Checks steps 1–5 of the private activation
 * rehearsal against the REAL config, so the operator isn't debugging blind when
 * they flip PAYMENTS_LIVE. Writes nothing, sends no payment. Gated by
 * ADMIN_SEED_KEY (404 when unset). Pass ?tokenId=<a FREELON you own>&wallet=<your
 * wallet> to check ownership + the exact activation price for that token.
 *
 *   curl "http://localhost:3000/api/admin/golive-preflight?key=KEY&tokenId=1&wallet=0x..."
 */
export async function GET(req: Request) {
  const key = process.env.ADMIN_SEED_KEY;
  if (!key) return NextResponse.json({ error: "disabled" }, { status: 404 });
  const url = new URL(req.url);
  if ((url.searchParams.get("key") || "") !== key) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const tokenId = parseInt(url.searchParams.get("tokenId") || "", 10);
  const wallet = (url.searchParams.get("wallet") || "").toLowerCase();

  const checks: { step: string; ok: boolean; detail: string }[] = [];
  const add = (step: string, ok: boolean, detail: string) => checks.push({ step, ok, detail });

  // 5. PAYMENTS_LIVE switch — for the REAL test this must become true; preflight
  // just reports its current value (don't assert, the operator flips it last).
  add("5 · PAYMENTS_LIVE", true, PAYMENTS_LIVE ? "true (LIVE — real ETH will be charged)" : "false (free/test mode — flip to 'true' to run the paid test)");

  // 4. PAYMENT_WALLET — must be set and a valid address. WARN loudly if it's the
  // hardcoded code default (operator should set it explicitly in env + verify on
  // Etherscan that they control it).
  const isDefault = PAYMENT_WALLET === "0x3303c4350259c2b8f3c560b2ec70ad3ed87a5e72";
  const walletValid = /^0x[a-f0-9]{40}$/.test(PAYMENT_WALLET);
  add("4 · PAYMENT_WALLET", walletValid, `${PAYMENT_WALLET}${isDefault ? " ⚠ CODE DEFAULT — set PAYMENT_WALLET in env + confirm on Etherscan you control it" : " (from env)"}`);

  // ETH_RPC_URL — payment verification reads chain; flaky public fallbacks risk
  // false 'tx_not_found_yet'. Recommend a real RPC.
  const rpcSet = !!(process.env.ETH_RPC_URL || process.env.NEXT_PUBLIC_ETH_RPC_URL);
  add("· ETH_RPC_URL", rpcSet, rpcSet ? "set (good)" : "NOT set — uses flaky public fallbacks; set Alchemy/Infura before the live test");

  // LLM key — premium runs spend it.
  const llm = !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
  add("· LLM key", llm, llm ? "set" : "MISSING — premium runs will fail");

  // 1–3 require a tokenId (+ wallet for ownership).
  if (Number.isFinite(tokenId) && tokenId >= 1 && tokenId <= 4040) {
    const citizen = getCitizen(tokenId);
    add("1 · citizen exists", !!citizen, citizen ? `#${tokenId} ${citizen.tier}` : "not found");

    if (citizen) {
      // 3. activation price for this token's rarity.
      const tier = unlockTierFor(citizen.tier);
      add("3 · activation price", true, `${tier.tier}: ACTIVATE ${tier.priceEth} ETH → ${tier.runs} premium runs · RECHARGE ${tier.rechargeEth} ETH`);

      // 2. ownership — only if a wallet was supplied (a real on-chain read).
      if (/^0x[a-f0-9]{40}$/.test(wallet)) {
        const owner = await ownerOf(tokenId).catch(() => null);
        const owns = owner === wallet;
        add("2 · ownership", owns, owner ? (owns ? `confirmed: ${wallet} owns #${tokenId}` : `MISMATCH: #${tokenId} is owned by ${owner}, not ${wallet}`) : "could not read owner (RPC) — retry");
      } else {
        add("2 · ownership", false, "pass &wallet=0x… (the wallet you'll activate from) to verify on-chain ownership");
      }
    }
  } else {
    add("1–3 · token checks", false, "pass &tokenId=<a FREELON you own> to check existence, price, and ownership");
  }

  const ready = checks.filter((c) => c.step.startsWith("1") || c.step.startsWith("2") || c.step.startsWith("3") || c.step.startsWith("4")).every((c) => c.ok)
    && llm;

  return NextResponse.json({
    ready,
    note: ready
      ? "Config checks pass. Final step: set PAYMENTS_LIVE=true, then run the paid Red Team test from your wallet. Rollback: PAYMENTS_LIVE=false."
      : "One or more checks failed — fix before flipping PAYMENTS_LIVE.",
    checks,
  });
}

# WORLD HEX reward — locked design + blockers (2026-06-27)

Decision record for paying **capped HEX** for FREELON WORLD (/world/city) skill
objectives — the **signal run** (DISPATCH) and the **time-trial lap** (MARSHAL).
Both loops currently mint **ZERO HEX** (recognition only). This doc captures the
finance-blessed + legal-cleared design so it can ship the instant the blockers
clear, and records exactly why it has NOT shipped yet.

Pressure-tested by the finance-treasury and legal-compliance seats, 2026-06-27.
They converged. Verdict: **design is sound; the live faucet is BLOCKED on two
prerequisites, one of which is human/legal sign-off.**

## The blessed design (do NOT deviate without re-review)

- **Route through the existing faucet primitive:** `creditWalletHex(addr, amount,
  ev, { farmable: true })` (lib/wallet-hex-store.ts). It already clamps the
  per-wallet/UTC-day total to `ECONOMY.FARMABLE_DAILY_CAP = 250` under the wallet
  lock with lazy day-rollover. WORLD rewards **share** that 250 bucket — they do
  not stack a new faucet on top.
- **New named guardrail the docs owe:** add `ECONOMY.SIM_YIELD_DAILY_CAP = 50`
  (per wallet, WORLD-specific) AND keep `{farmable:true}` so the tighter of the
  two caps binds. (`SIM_YIELD_DAILY_CAP` is referenced as "owed" in
  WORLD_BUILD_PLAN.md and world-store.ts but does not exist yet.)
- **Rewards (sweep/quest tier, below the 100⬡ build cost so the loop is a net
  sink):** `SIM_RUN_REWARD = 10`, `SIM_LAP_PR_REWARD = 15`. Pay the lap reward
  **only on a personal-best improvement**, never every lap (idle-timer farming).
- **Cooldown:** max 1 paid signal-run + 1 paid lap-PR per wallet per UTC day.
- **Net effect:** ≤25⬡/day/wallet from WORLD (~$0.87 at peg) vs 100⬡ to build one
  parcel → provably net-deflationary, capped twice, sybil-bounded by the
  proven-wallet gate. Spendable HEX is fine (no separate locked tier needed — the
  cap binds and HEX is already non-cashable/non-transferable).
- **kind:** `"quest"` (already an ACTIVE_KIND).

## Legal guardrails (all six are hard controls, not style)

1. Skill-only, **deterministic, fixed** payout. No randomized reward (= gambling).
2. **Free entry.** Never charge HEX to enter a HEX-paying loop (= wager).
3. Daily per-wallet ceiling; the reward must count against it.
4. **Server-authoritative + idempotent** crediting inside `withWalletLock`, behind
   a proven wallet. Never credit from a client-reported win.
5. **Copy bans:** no "play to earn / earn rewards / win / payout / yield / income /
   grind for HEX." Approved: "complete the signal run to earn HEX inside the city,"
   "HEX is an in-city reward layer, not money — non-cashable, non-transferable, no
   cash value."
6. **Non-cashable disclaimer shown at the reward moment**, not just in /legal.

## BLOCKERS — why it is not live (both must clear)

1. **Server-authoritative completion (engineering).** The loops complete in the
   browser (`public/world/city/index.html` hitGate/clearCheckpoint hooks; runs and
   bestLap are localStorage stats). Crediting HEX off a client-trusted completion
   is a forgeable faucet — the exact "where does the currency come from / can it be
   farmed" failure. A `complete_run` / `complete_lap` action must be added to
   `app/api/world/route.ts` that VALIDATES the objective server-side (run token +
   in-order checkpoint hits + position/timing plausibility + cooldown) before any
   credit. Only then attach the `creditWalletHex(..., {farmable:true})` call.
2. **Legal sign-off (Billy / counsel).** The live `app/legal/terms/page.tsx` does
   NOT contain an explicit HEX non-cashable / non-transferable / no-cash-value
   clause. That clause must exist BEFORE HEX is paid for gameplay (the disclaimer
   is a legal control we rely on), and crypto-aware counsel should sign off on the
   Terms clause + reward copy — as COPY_LEGAL_CHECKLIST already requires for the
   paid path. This is the first time HEX would be MINTED as a gameplay reward in a
   real-money-adjacent product.

## Until both clear

The signal run and time trial stay **recognition-only** (zero HEX) and correct.
DISPATCH remembers your run count; MARSHAL remembers your best lap. No code path
mints HEX for gameplay. Do not add `SIM_*` reward constants as live faucets until
blocker (1) is built and blocker (2) is signed off.

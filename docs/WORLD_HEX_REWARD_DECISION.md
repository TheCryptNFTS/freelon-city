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

1. **Server-authoritative completion (engineering). — PARTIALLY CLEARED 2026-06-27
   (commit de99639).** The server-of-record now exists: `complete_run` /
   `complete_lap` actions on `app/api/world/route.ts` + `recordRun` / `recordLap`
   in `lib/world-store.ts` persist run-count and best-lap authoritatively (keyed on
   the proven wallet, behind the demo↔wallet key-collision guard), with MIN/MAX lap
   plausibility bounds. These are the seam where `creditWalletHex(..., {farmable:
   true})` attaches. **STILL OWED before crediting:** the per-objective ANTI-FORGERY
   validation (a server-issued run token + in-order checkpoint hits + position/
   timing plausibility + the 1-per-UTC-day cooldown). Today's recordRun/recordLap
   trust the client's "I finished" — fine for recognition-only (worst case: a
   vanity stat), NOT fine for a faucet. Build the token+checkpoint validation on
   top of this seam, THEN attach the credit.
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

## APPENDIX A — ready-to-paste Terms clause (DRAFT, for counsel review)

Blocker (2) says the Terms must carry an explicit HEX non-cashable clause BEFORE
any HEX is paid for gameplay. The live `app/legal/terms/page.tsx` has none. Below
is a drafted clause to add as a new section (suggested §14, before Governing law),
written to match the existing terse house voice. **DO NOT PUBLISH until crypto-
aware counsel has reviewed it** — it is a legal control we rely on, not marketing
copy, and this is the first time HEX would be minted as a gameplay reward.

> **14. HEX is an in-city reward layer, not money.**
> HEX (⬡) is a non-cashable, non-transferable, in-application reward unit with no
> cash value. It cannot be withdrawn, redeemed for money or any asset, transferred
> between wallets, sold, or traded. It exists only to be earned and spent inside
> FREELON CITY's features (for example, building in the city world). HEX is not a
> currency, security, deposit, e-money, or financial instrument; earning or holding
> HEX confers no financial right or expectation of profit. The project may adjust,
> cap, expire, or discontinue HEX, its earning, and its uses at any time. Where HEX
> is earned by completing in-city skill objectives, payouts are fixed, deterministic
> (never randomized), free to attempt, and daily-capped per wallet.

## APPENDIX B — reward-moment disclaimer + approved copy (DRAFT)

Legal guardrail 6 requires the non-cashable disclaimer **at the reward moment**,
not only in /legal. When a paid objective credits HEX, the toast/character line
must carry, verbatim or close:

> "+10 ⬡ earned in the city. HEX is an in-city reward — non-cashable, non-
> transferable, no cash value."

Approved earn-copy (guardrail 5 — these are the ONLY framings counsel pre-cleared
in this doc; still re-confirm with counsel before shipping):
- "Complete the signal run to earn HEX inside the city."
- "HEX is an in-city reward layer, not money — non-cashable, non-transferable, no
  cash value."

BANNED (do not use anywhere near the paid loop): "play to earn / earn rewards /
win / payout / yield / income / grind for HEX."

## What is DONE vs OWED (2026-06-27)

- [x] Finance + legal design locked (numbers, six guardrails) — this doc.
- [x] Blocker (1a): server-of-record for runs/laps shipped (de99639).
- [ ] Blocker (1b): anti-forgery objective validation (run token + checkpoint
      order + plausibility + 1/day cooldown) on top of the recordRun/recordLap seam.
- [ ] Blocker (2a): publish the Appendix A Terms clause (Billy's call to ship).
- [ ] Blocker (2b): crypto-aware counsel signs off on the Terms clause + reward
      copy (Billy / counsel).
- [ ] ONLY AFTER all four: add `ECONOMY.SIM_YIELD_DAILY_CAP=50` + `SIM_RUN_REWARD=
      10` / `SIM_LAP_PR_REWARD=15`, attach `creditWalletHex(..., {farmable:true})`
      in recordRun/recordLap behind the validation, wire the reward-moment disclaimer.

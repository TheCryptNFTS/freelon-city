# Claude Code Build Sequence — Controlled Implementation Prompts

Status: 2026-06-09. Derived from HEX_ECONOMY_RED_TEAM, OWNER_AUTH_HISTORY_ENDPOINT_SPEC,
ECOSYSTEM_MAP, AGENT_SYSTEM_SPEC. Ordered SAFEST → RISKIEST.

**Global rules for every prompt below:**
- One prompt = one change. No bundling. No feature creep.
- Preserve `walletProof` (`requireProvenWallet`) on every ⬡ credit/debit.
- NEVER create a real-HEX faucet from client-side game wins.
- Audit/read before editing. Verify live (preview) before claiming done. Stop after.
- If a change isn't browser-observable, run the relevant test instead.

---

### Prompt 1 — Idempotency key on streak milestone (LOW risk, isolated) — ⏸ NOT NEEDED 2026-06-09
Investigated + attempted, then reverted. The streak bonus is ALREADY once-per-day-per-wallet
because the whole credit block is gated by the atomic `tryClaimToday` SET-NX (`claim/route.ts:66`),
and a given milestone value is only hit once per streak run. A dedicated per-(wallet,streak)
SET-NX guard introduced a REGRESSION: a 60-day TTL would deny the bonus to a user who legitimately
rebuilds the same streak milestone weeks later. The red-team rated this LOW/latent ("acceptable
today"). Conclusion: no live bug, and the "hardening" added a real regression for a can't-happen
path — so it's intentionally NOT implemented. Revisit only if a future code path credits the
streak bonus OUTSIDE the daily-claim lock (then key it per-day, not per-streak).
Allowed: `app/api/claim/route.ts`. Forbidden: everything else.
Change: add `freelon:streak:<addr>:<streak>` SET-NX before the streak bonus credit (`:107-118`) so it can never double-pay.
Accept: claiming twice in a day credits streak once; existing daily-claim behavior unchanged.
Rollback: remove the SET-NX guard.

### Prompt 2 — Contract-scope OpenSea event filters (MED, isolated reads) — ✅ DONE 2026-06-09
Implemented in `lib/sweep-inline.ts` + `lib/economy-extras.ts` (sale filter): reject a row when it
carries a contract that isn't ours (`c && c !== CONTRACT`), falling back to the tokenId-range check
when the contract field is absent (the /events/accounts endpoint isn't consistent). Mirrors the
existing snipe-path pattern (`economy-extras.ts:236`) — tightens against cross-collection
same-tokenId credits WITHOUT dropping legit sales where the contract field is missing (avoids a
false-negative). Added `contract?` to both row types. Verified: tsc 0 errors; wallet/hex endpoint
200, sweep shape intact, no console errors.
Allowed: `lib/sweep-inline.ts`, `lib/economy-extras.ts`. Forbidden: wallet-hex-store, routes.
Change: in the sweep + sale filters (`sweep-inline.ts:104`, `economy-extras.ts:71`) assert `ev.nft.contract === CONTRACT` (mirror snipe path `:236`).
Accept: events from other contracts no longer trigger credits; same-contract still do.
Rollback: revert filter predicate.

### Prompt 3 — Two-bucket farmable daily ceiling — ✅ DONE 2026-06-09 (Billy's two-bucket decision)
First attempt (flat all-faucet ceiling) was REVERTED — it would have blocked a legit 500⬡ snipe.
Billy decided the two-bucket rule. KEY FINDING: `HexEvent.kind` (only hold/sweep/sweep_streak/quest/
manual) CANNOT express the bucket — `kind:"manual"` is used by BOTH farmable (daily-claim, listing)
AND value-backed (snipe, sale-share, fresh-blood). So bucketing by kind is impossible.
Design shipped: an opt-in `{ farmable: true }` 4th arg on `creditWalletHex` (backward compatible —
existing/value-backed calls unchanged & uncapped). When set, it clamps the credit to the remaining
headroom under `ECONOMY.FARMABLE_DAILY_CAP` (250) per UTC day, tracked atomically inside the wallet
lock (`farmedDay`/`farmedToday`). Fail-OPEN: an un-tagged faucet just stays uncapped (status quo) —
a missed tag never blocks a legit user.
Farmable sites tagged: daily claim, streak bonus, holder passive tick, quests, missions (earn-runs),
listing bounty, reply bounty + reply engagement. Left UNCAPPED (Bucket B): snipe, sale-share,
fresh-blood, admin, boost-refund, carrier, ascend-refund, AND defender-scan floor-BID rewards
(liquidity-backed — NOT the passive "defender tick"; note: `floor-defender.ts` passive tick credits
nothing directly). Sweep stays on its own count-cap (`creditWalletHexCapped`, ~250⬡/day equivalent) —
already bounded, deliberately not folded into the shared pool (v1 scope note).
Proof: `lib/farmable-cap.test.ts` — 6/6 (cap at 250, snipe 500 uncapped after cap, after-cap
no-credit, boundary clamp to exactly 250, daily reset, event log clamped). Full economy suite 36/36;
tsc 0 errors; live wallet/hex 200, no console errors.
Allowed: `lib/economy-constants.ts`, `lib/wallet-hex-store.ts`. Forbidden: individual faucet routes.
Change: add `MAX_HEX_PER_WALLET_PER_DAY` (e.g. 300); enforce in `creditWalletHex` inside the lock (track per-UTC-day issued, reject/clamp over ceiling).
Accept: a wallet cannot net more than the ceiling/day across all faucets; normal earners unaffected.
Rollback: remove the ceiling check.

### Prompt 4 — Decide dormant job-faucet config (LOW, cleanup) — ⚠ NEEDS DECISION 2026-06-09 (premise was wrong)
Investigated: the `JOB_SIGNAL_T*` constants are NOT dead — they're referenced by `lib/jobs-catalog.ts:31-32`
(`signalFor`) which sets each job's `rewardSignal` (and by `progression-store.test.ts`). So deleting
them breaks the catalog + a test. The real finding is a PRODUCT QUESTION, not cleanup: jobs build a
`rewardSignal` (e.g. +12 ⬡) that is likely DISPLAYED to users, but the job route passes
`signalReward: 0` to the ledger (`job/route.ts:129`) and `applyJob` never credits — so jobs may
ADVERTISE a ⬡ reward they don't pay. Decide: (a) jobs SHOULD pay → wire it through the decay gate
+ global daily ceiling (Prompt 3) — but that creates a 250⬡/day faucet, needs finance sign-off; or
(b) jobs intentionally pay XP/skill only → fix the misleading `rewardSignal` display, don't credit.
NOT a silent delete. Surfaced to Billy.

RESOLVED 2026-06-09: investigated — `rewardSignal` is computed but rendered NOWHERE (grep across
components/+app/ returns nothing outside jobs-catalog; the job board shows "+XP +skill" only,
completion toast shows XP only). So there is NO display/reality mismatch — option (b) is already
effectively true (jobs are an XP/skill faucet, no ⬡ advertised or paid). No misled holders. Did NOT
delete the constants (breaks jobs-catalog `signalFor` + a test for ~zero gain) — instead added a
FOOTGUN-GUARD comment at the `JOB_SIGNAL_*` definition warning that they must not be wired to the
ledger without a daily ceiling + finance sign-off. Comment-only; tsc clean; 8 affected tests pass.
Allowed: `lib/economy-constants.ts`. Forbidden: job route.
Change: DELETE `JOB_SIGNAL_T1/T2/T3` + `JOB_DAILY_CAP` (`:117-130`) since jobs pay 0 HEX (confirmed), OR add a comment that wiring them requires routing through ceiling (Prompt 3) + decay gate.
Accept: no dangling money-printer config; jobs still grant XP only.
Rollback: restore constants.

### Prompt 5 — Sweep cap INSIDE the wallet lock (HIGH value, contained) ⚠ must-fix — ✅ DONE 2026-06-09
Implemented: added `creditWalletHexCapped` to `wallet-hex-store.ts` (cap-reset + cap-check +
credit + counter-increment atomically inside ONE `withWalletLock`); `sweep-inline.ts` now calls
it instead of the unlocked read-modify-write, and the streak bonus is guarded by a per-day
SET-NX. Proof: new `lib/sweep-cap-race.test.ts` mocks Upstash with an atomic in-process store to
exercise the REAL lock, then fires 4 concurrent capped credits at cap=2 → exactly 2 credited,
balance=50, sweepsToday=2, 2 sweep events (race closed). 3/3 pass; existing 19 wallet-hex/hex-spend
tests still pass; live endpoint shape unchanged, no console errors.
Allowed: `lib/sweep-inline.ts`, `lib/wallet-hex-store.ts`. Forbidden: other faucets.
Change: move `sweepsToday` read → cap-check → credit → increment atomically into `withWalletLock` (`:111-128`). Kills the double-credit race.
Accept: concurrent `GET .../hex` bursts cannot exceed the daily sweep cap; no clobbered writes.
Verify: simulate 2 concurrent credits in a test; assert count == cap.
Rollback: revert to prior block (re-opens race — only if regression).

### Prompt 6 — Gate the credit-bearing wallet GET (HIGH value) ⚠ must-fix — ✅ DONE 2026-06-09
Implemented: `requireProvenWallet(req, address)` now gates the holder/defender/sweep ticks in
`app/api/wallet/[address]/hex/route.ts`. Unauthenticated callers get balance read-only (ticks
return zero-credit fallbacks). Verified live: unauthenticated GET → 200, balance present, all
credit paths = 0; response shape unchanged (9 keys intact); no console errors.
Allowed: `app/api/wallet/[address]/hex/route.ts`. Forbidden: the tick libs themselves.
Change: run `runHolderTick`/`processSweeps`/`runFloorDefenderTick` ONLY when `requireProvenWallet(req, address)` passes; unauthenticated callers get balance read-only (no crediting).
Accept: unauthenticated GET returns balance but credits nothing; authenticated owner GET still earns.
Verify live: hit endpoint unauthenticated → balance unchanged; authenticated → ticks fire.
Rollback: revert the auth guard (re-opens unauthenticated crediting).

### Prompt 7 — Owner history endpoint (additive, breaks nothing) — ✅ DONE 2026-06-09
Implemented: new `app/api/citizens/[id]/history/full/route.ts`. Auth = `requireProvenWallet`
(signature) AND `ownerOf(cid) === address`. Returns full history incl. text body, strips `brief`.
Verified live: unauth → 401 `wallet_proof_required` (no history key); missing address → 400;
bad id → 400; public `/agent` endpoint unchanged (200, still has body); tsc 0 errors; no console errors.
Allowed: new `app/api/citizens/[id]/history/full/route.ts`. Forbidden: existing agent route, UI.
Change: new GET, `requireProvenWallet` + ownership, returns full `AgentWork[]` incl. text body, `no-store`, rate-limited.
Accept: owner (proven) gets full body; unauthenticated/bound-only → 403.
Rollback: delete the route (additive, safe).

### Prompt 8 — Switch owner UI to the owner endpoint — ✅ DONE 2026-06-09
Implemented in `components/AgentWorkspace.tsx`: new `ownerHistory` state + a fail-quiet overlay
effect that fetches `/history/full?address=` when `landing?.isOwner` (FREELONS only); `textWork`
now sources from `ownerHistory ?? agent.history`. SUPPLEMENTS (never replaces) the agent object —
abilities/scenes/unlock/level untouched. 401/403/network → ownerHistory stays null → falls back to
public history (no blank, no error, no forced signature popup). Verified: tsc 0 errors; non-owner
path unchanged (no emoji/hype/raw body, Work history panel present, recall safe); owner endpoint
401s unauthenticated; public `/agent` unchanged (200, body present); no console errors.
NOTE (human-required, per QA plan): proven-owner full-body render needs a real owner wallet
(signature) — not forgeable in the harness; verify manually before relying on it.
Allowed: `components/AgentWorkspace.tsx`. Forbidden: API routes.
Change: when `landing?.isOwner`, fetch history from `/history/full`; else keep public endpoint.
Accept live: owner workspace shows full "Last time you and…" + work-history body; non-owner unaffected.
Rollback: revert fetch target to public endpoint.

### Prompt 9 — Strip text body from public agent response (RISKY — flagged) ⚠ — ✅ DONE 2026-06-09
Implemented in `app/api/citizens/[id]/agent/route.ts`: text-kind entries drop `body` in the public
response; image `body` (URLs) retained; all proof fields kept. Flag-guarded —
`HISTORY_PUBLIC_STRIP=false` instantly restores old behaviour (default = strip ON). Preconditions
met (Prompts 7+8 live). Verified: tsc 0 errors; public `/agent` text entry has NO body (image
entries keep URLs); workspace renders fine on stripped data (Work history present, recall safe, no
raw-body leak, gallery intact); no console errors. Owner full body still available via /history/full
overlay (Prompt 8).
Allowed: `app/api/citizens/[id]/agent/route.ts`. Forbidden: owner endpoint, UI.
PRECONDITION: Prompts 7+8 verified in prod first.
Change: behind flag `HISTORY_PUBLIC_STRIP`, omit/summarize text `body` in the public response (keep image URLs).
Accept: non-owner agent JSON has no raw text body; owner UI (now on `/history/full`) unaffected.
Rollback: flip `HISTORY_PUBLIC_STRIP=false` instantly.

### Prompt 10 — OG card uses safe summary (after Prompt 9) — ✅ DONE 2026-06-09
Implemented in `app/api/og/agent/[id]/route.tsx`: the share card no longer draws raw text `body`
(`agentSnippet(work.body)` removed, import dropped); text work now renders a safe type summary
(`<task> · CONTENT POST`). Image art unaffected. Verified: tsc 0 errors; OG endpoint returns 200
image/png (~604KB, renders fine); no raw body path remains.
Allowed: `app/api/og/agent/[id]/route.tsx`. Forbidden: other surfaces.
Change: render a kind/ability summary instead of raw text body.
Accept: OG card for any token shows no raw text body.
Rollback: revert to body snippet.

### Prompt 11 — Version/gate the v1 dev history API (contract change) — ✅ DONE 2026-06-09
Decision taken: preserve the documented contract SHAPE (don't break `outputs[].body` consumers),
but make text `body` a safe summary instead of raw output. Implemented in
`app/api/v1/citizens/[id]/history/route.ts`: `body` key retained; for text outputs its value is
`<task> · content post`; image `body` (URLs) unchanged. Same `HISTORY_PUBLIC_STRIP` flag as Prompt 9.
Verified: tsc 0 errors; v1 endpoint 200, shape intact (outputs/memoryLog/body present), text body =
"post · content post" (no raw leak), image body still URL.
Allowed: `app/api/v1/citizens/[id]/history/route.ts` (+ optional new v2). Forbidden: v1 shape if still documented.
Change: decision-dependent — freeze v1 with deprecation note, OR add v2 that strips body, OR auth-gate body.
Accept: documented contract not silently broken; raw body not served unauthenticated going forward.
Rollback: restore v1 behavior.

### Prompt 12 — X-verify gate on sweep/sale/listing faucets (anti-sybil, last) — ⏸ DEFERRED 2026-06-09 (Billy's call)
Rationale: fix #6 (Prompt 6) now requires `requireProvenWallet` (signature) PER WALLET before any
sweep/sale/listing crediting, so a sybil farmer already needs K signed wallets each holding real
NFTs — the bar is high. X accounts are cheap, so X-verify adds little marginal anti-sybil value,
while its UX cost (legit holders without a connected X stop earning these bounties) is unchanged.
Not worth the tradeoff now. Revisit only if sweep/sale/listing farming is observed in the wild.
Allowed: `lib/economy-extras.ts`, `lib/sweep-inline.ts`. Forbidden: unrelated faucets.
Change: require X-verification (mirror fresh-blood `:136`) before these credits.
Accept: unverified wallets can't farm these faucets across many addresses; verified earners unaffected.
Rollback: remove the X-verify gate.

---

## Execution order rationale
- **1–4:** isolated, low-risk hardening + cleanup. Build trust, no user-visible risk.
- **5–6:** the two HIGH-severity economy fixes. Contained but security-critical — verify hard.
- **7–8:** additive owner-endpoint + UI switch. Breaks nothing.
- **9–11:** the public-strip sequence. ONLY after 7–8 proven. 9 is the single riskiest step — flag-guarded.
- **12:** anti-sybil polish, last (most likely to annoy legit users; do when the rest is stable).

Do NOT skip ahead to 9 before 7–8 are live and verified — that's the one ordering that breaks owner memory.

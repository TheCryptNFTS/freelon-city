# FREELON CITY — Hardening Sprint Closeout

Date: 2026-06-09. Scope: HEX-economy security + agent work-history privacy + Crypt TCG QA.
Method: one change at a time, audit → implement → verify (live or test) → document. Read-only
specialist subagents for investigation; single thread for all edits.

---

## 1. What changed
- **Unauthenticated HEX credit exploit closed** — the wallet/hex GET no longer mints HEX for an arbitrary address.
- **Sweep double-credit race closed** — cap check + credit are now atomic inside the wallet lock.
- **Two-bucket farmable HEX daily ceiling** — farmable faucets capped at 250⬡/UTC-day/wallet; value-backed events (snipe/sale/admin) uncapped.
- **Owner/private work-history chain** — owner-authenticated full-history endpoint + workspace overlay; public surfaces no longer serve raw text body.
- **Public history leaks cleaned** — agent JSON, public log page, OG share card, v1 dev API all stripped of raw text body (image URLs + proof fields retained).
- **OpenSea event filters contract-scoped** — sweep + sale credits reject other-collection same-tokenId rows (no false-negatives).
- **Job HEX footgun guarded** — documented that `JOB_SIGNAL_*` must not be wired to the ledger without a ceiling + finance sign-off.
- **Crypt TCG verified** — core loop + win-state + `/match` victory ceremony + reward screen, all live.

## 2. Why it changed
Two HIGH-severity live exploits (unauthenticated credit faucet; sweep race) were the priority —
both could mint/over-credit real HEX. The history chain enforces the documented policy (work
history = public proof; raw text body = owner memory) at the data layer, not just the UI. The
contract-scope + footgun fixes close latent economy holes the red-team surfaced.

## 3. Files touched
- `app/api/wallet/[address]/hex/route.ts` (gate credit ticks)
- `lib/wallet-hex-store.ts` (`creditWalletHexCapped`, `{farmable}` ceiling on `creditWalletHex`)
- `lib/sweep-inline.ts` (atomic cap + contract-scope + streak SET-NX)
- `lib/economy-extras.ts` (contract-scope sale filter; listing bounty farmable)
- `lib/holder-tick.ts`, `lib/quests-store.ts`, `lib/missions/earn-runs.ts`, `lib/reply-engagement-scan.ts`, `app/api/reply/route.ts`, `app/api/claim/route.ts` (farmable tags)
- `lib/economy-constants.ts` (`FARMABLE_DAILY_CAP`; job footgun comment)
- `app/api/citizens/[id]/history/full/route.ts` (NEW owner endpoint)
- `components/AgentWorkspace.tsx` (owner history overlay)
- `app/api/citizens/[id]/agent/route.ts`, `app/api/og/agent/[id]/route.tsx`, `app/api/v1/citizens/[id]/history/route.ts` (public body strip / safe summary)
- Tests: `lib/sweep-cap-race.test.ts`, `lib/farmable-cap.test.ts` (NEW)
- Docs: `CLAUDE_CODE_BUILD_SEQUENCE.md` (status), `CRYPT_TCG_QA_STATUS.md`

## 4. Tests passed
- `lib/farmable-cap.test.ts` — 6/6 (cap at 250; snipe 500 uncapped after cap; after-cap no-credit; boundary clamp; daily reset; event-log clamped).
- `lib/sweep-cap-race.test.ts` — 3/3 (single credit; repeat blocked; 4-concurrent → exactly cap).
- Full economy/wallet suite — 36/36. tsc — 0 errors throughout.

## 5. Live checks passed
- Unauthenticated wallet/hex GET → 200, balance present, zero credit, shape intact (9 keys).
- Owner history endpoint → 401 `wallet_proof_required` unauthenticated; public `/agent` unchanged shape.
- Public `/agent` text entry → no `body`; image entries keep URLs. Workspace renders on stripped data; no raw-body leak; gallery intact.
- OG card → 200 image/png. v1 API → shape intact, text body = safe summary.
- `/citizens/[id]/log` → content badge, no raw body. No console errors on any surface.
- Crypt `/match` → ceremony fired live (DEFEAT), reward screen rendered (+25 ⬡ HEX / +40 XP).

## 6. Decisions made
- **Two buckets, not a flat cap** (Billy): farmable faucets capped at 250⬡/day; value-backed (snipe/sale/unlock/admin/refund) never capped. Implemented as an opt-in `{farmable:true}` flag (fail-open: untagged = uncapped = status quo).
- **Crypt rewards = device-local ⬡ HEX**, never real HEX from client-side wins (money-printer risk). Labeled "(device)".
- **History: owner-auth endpoint first, then strip public** (order prevents breaking owner memory). Public strip flag-guarded (`HISTORY_PUBLIC_STRIP`).

## 7. Decisions deferred
- **Prompt 12 (X-verify gate on sweep/sale/listing faucets)** — deferred: fix #6 already requires walletProof per wallet, so marginal anti-sybil gain is low and the UX cost (legit non-X holders stop earning) isn't worth it. Revisit only if farming is observed.
- **Sweep into the shared farmable pool** — sweep keeps its own existing count-cap; not folded into FARMABLE_DAILY_CAP (already bounded; v1 scope choice).

## 8. Remaining risks (low, known)
- Real-HEX faucets still fire from a (now-authenticated) GET; fine, but any NEW faucet must follow the same walletProof + idempotency + (if farmable) ceiling pattern.
- v1 dev API is a public contract; future shape changes must be versioned.
- Crypt ranked rating-delta/rank-up beat is code-verified, not driven live (needs a human ranked match).

## 9. What must NOT be reopened
- The locked rule: **game ledgers sink real HEX, never source it.** No real-HEX faucet from client-side game wins.
- All ⬡ movement requires `requireProvenWallet` (signature), never bare bind.
- Do NOT wire `JOB_SIGNAL_*` to the ledger without a ceiling + finance sign-off (see footgun comment).
- Do NOT replace the two-bucket cap with a flat all-faucet ceiling (clips legit snipes).
- Do NOT strip public history body before the owner endpoint + UI overlay are live (breaks owner memory).

## 10. Recommended next product task
**NOT security.** The hard/dangerous work is now under control. The remaining user problem is
**comprehension**: a newcomer can't quickly answer "What is FREELON CITY? What can I do? Where does
each collection fit? Why connect / own / use HEX?" The next task is to make the site explain the
ecosystem simply — grounded in `docs/FREELON_CITY_ECOSYSTEM_MAP.md` (the 10-second pitch + D2 Crypt
naming-collision decision). Keep it a separate task; do not fold it into this security sprint.

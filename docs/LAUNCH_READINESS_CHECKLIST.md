# FREELON CITY + Crypt TCG — Launch-Readiness Checklist

Date: 2026-06-09. Final QA gate after the hardening + comprehension sprint. NOT a feature list —
this is the ship/hold decision aid. Read alongside `FREELON_CITY_FINAL_BUILD_BLUEPRINT.md`,
`HEX_ECONOMY_RED_TEAM.md`, `CRYPT_TCG_QA_STATUS.md`, `SPRINT_CLOSEOUT.md`.

---

## 1. What IS verified (live or by test, this sprint)
- **FREELON CITY funnel:** home → /demo (live agent reply) → /citizens → /agent/[id]. Verified live.
- **Owner/public language:** non-owners see neutral copy; owner-voice gated on `landing?.isOwner`. Verified.
- **History privacy:** public surfaces (agent JSON, /log page, OG card, v1 API) serve NO raw text body; owner full body via `/history/full` (walletProof + ownerOf). Verified live + 401 on unauth.
- **HEX exploits:** unauthenticated credit GET gated; sweep double-credit race fixed (atomic, concurrent test). Verified.
- **Farmable HEX cap:** 250⬡/UTC-day on farmable faucets; value-backed (snipe/sale/admin) uncapped. 6/6 test, 36/36 suite.
- **OpenSea filters contract-scoped** (no false-negatives). Verified.
- **/sync wallet anxiety:** "Read-only · no transaction" reassurance. Verified.
- **Crypt TCG:** core loop, win-state, in-board ceremony, AND ceremony → /match-results reward handoff (+⬡ HEX device / +XP). Verified live.
- **tsc 0 errors** across both repos after every change.

## Manual-gate scorecard (run 2026-06-09 via browser MCP where honestly possible)
- **Gate 1 — Owner full-history view: 🔴 BLOCKED (human required).** Needs a real wallet SIGNATURE (walletProof). I won't drive a wallet signature (authentication on your behalf) or forge a session — that proves nothing real. YOU must verify: own a FREELON, sign, run a text job, confirm the Work-history panel shows the real output text. This is a §7 launch blocker until you confirm.
- **Gate 2 — Crypt rewards: 🟡 PARTIAL.** Drove a full `/match` live → ceremony → "View rewards" → `/match-results` showing verdict + ⬡ HEX (device) + XP. PASS for the reward flow. The ranked **rating/rank-up delta** does NOT render in solo `/match` (the "ELO" hit was inside "deVELOpment" footer) — verifying it needs a real ranked/PvP match. Still human-required for that specific beat.
- **Gate 3 — Mobile layout: 🟢 PASS (layout).** At 375px: homepage funnel (hero, stacked CTAs, MENU, "TRY A CITIZEN FREE" pill) and Crypt mulligan board (2-col card grid, legible stats, tappable KEEP, tab-bar) both render with ZERO horizontal overflow. Real-device touch + wallet deep-link feel still needs your phone.
- **Gate 4 — Real ETH unlock: 🔴 BLOCKED (human required).** Payment / fund transfer — I do not execute transactions. YOU must run one real unlock on the live contract.
- **Gate 5 — OG/social previews: 🟢 PASS (inputs).** `/api/og/universe` (821KB) + `/api/og/1450` (750KB) render as valid PNGs; meta tags correct (og:image→universe card, summary_large_image, product-first description, "Crypt TCG" naming live). Actual X/Discord render still needs you to paste a live link (their crawlers cache/clip).

## 2. What still needs MANUAL QA (human, can't be harness-automated)
- **Owner full-history view** — needs a real owner wallet (walletProof signature) to confirm the owner sees full text body in the workspace. Harness can't forge a signed session.
- **Ranked Crypt match rating delta / rank-up beat** — code-verified, not driven live (needs a human ranked match to completion).
- **Real ETH unlock/activation flow** — needs a funded wallet on the live contract; can't fabricate against mainnet.
- **Mobile** — verify the funnel, /sync connect, and Crypt board on a real phone (drawer nav, wallet deep-link).
- **OG/social previews** — paste the homepage + an /agent URL into X/Discord and eyeball the actual card render.

## 3. What to test ON PRODUCTION (post-deploy smoke, before announcing)
- Confirm `HISTORY_PUBLIC_STRIP` is on (default) → `GET /api/citizens/<id>/agent` text entries have no `body`.
- Confirm the React dev warning is ABSENT in the prod build (it's dev-only; this is a formality — see CRYPT_TCG_QA_STATUS.md).
- Hit `/`, `/demo` (send one message), `/citizens`, `/agent/<id>`, `/sync`, `/collections`, `/crypt-tcg` → all 200, no console errors.
- Confirm payment/agent budget flags are set as intended (PAYMENTS_LIVE, AGENT_DAILY_BUDGET_USD, AGENT_MODEL_CHEAP for free tier) BEFORE traffic.
- One live `/demo` turn confirms the agent model + budget guard are wired in prod.

## 4. What to ANNOUNCE to holders
- Your FREELON's work history is now **private to you** — the public sees proof you trained it, not the raw outputs. (Owner = full memory; public = track record.)
- Crypt TCG: finishing a match now shows your **rewards screen** (⬡ HEX + XP).
- "Try a citizen free" — the demo path, no wallet needed.
- Frame as **safety + clarity improvements**, not "we fixed exploits" (see §5).

## 5. What NOT to mention publicly
- **Do not** publicize the specific HEX exploits, the unauthenticated-credit path, or the sweep race (responsible disclosure — they're fixed; naming them invites probing of older snapshots/forks).
- **Do not** make any financial/return/"value will increase" claim (copy-safety + legal).
- **Do not** call device-local ⬡ HEX spendable or on-chain — it's labeled "(device)" for a reason.
- **Do not** imply sister collections are full trainable agents — they're "talk to," FREELONS are "train."

## 6. Risks that remain (known, low)
- The React dev warning (dev-only, documented, harmless) — confirm gone in prod.
- Any NEW HEX faucet MUST follow the pattern: walletProof + idempotency + (if farmable) the 250 cap. Easy to forget.
- `JOB_SIGNAL_*` footgun — guarded by comment; do not wire to ledger without a ceiling + finance sign-off.
- v1 dev API is a public contract — future shape changes must be versioned.
- Ranked ceremony rating beat unproven live (see §2).

## 7. What would BLOCK launch (fix before public push)
- `HISTORY_PUBLIC_STRIP` accidentally off in prod (would re-leak raw body).
- Free agent tier NOT on the cheap model / no budget guard (cost blowout).
- Owner full-history view broken for a real owner (would mean owners lost their memory view) — MUST manual-QA with a real wallet.
- Any 500/crash on the core funnel routes in prod smoke (§3).
- A real ETH unlock failing on the live contract.

## 8. What can WAIT (post-launch)
- Prompt 12 (X-verify faucet gate) — deferred; only if farming is observed.
- Folding sweep into the shared farmable pool.
- Deep sister-collection agent features.
- The `JOB_SIGNAL_*` "should jobs pay HEX" product decision.
- Cosmetic React-warning silencing (wait for a React point release).

---

## Bottom line
Building is done. Remaining work is **verification + the ship decision**, not features. The blockers
in §7 are the gate; everything in §8 is post-launch. Do the §3 prod smoke + §2 manual QA (especially
the owner full-history view with a real wallet), confirm §7 is clear, then ship.

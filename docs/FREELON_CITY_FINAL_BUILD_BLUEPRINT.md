# FREELON CITY — Final Build Blueprint (Master Control Pack)

Date: 2026-06-09. The single source of truth for what to build, what not to touch, the risks,
and how to verify. Synthesizes: ECOSYSTEM_MAP, HEX_ECONOMY_RED_TEAM, OWNER_AUTH_HISTORY_ENDPOINT_SPEC,
AGENT_SYSTEM_SPEC, HISTORY_VISIBILITY_POLICY, CLAUDE_CODE_BUILD_SEQUENCE, CRYPT_TCG_QA_STATUS,
SPRINT_CLOSEOUT. Brutal, executable, no fluff.

**STATE CORRECTION (read first):** much of the "remaining serious work" is already DONE + verified
this sprint — owner-auth history endpoint (`/history/full`), public/owner history split, both HIGH
HEX exploits, contract-scoping, two-bucket HEX cap. See §5 for what's actually left (it's mostly
product/clarity, not security). Don't re-build shipped work.

---

## 1. PRODUCT TRUTH

**What FREELON CITY IS:** a multi-collection Web3 world built around a missing signal (the HEX).
Its product is **ownable AI agents** — FREELONS — that you train, that remember your work, and whose
history travels with the NFT.

**What it is NOT:** not one collection; not a financial product; not a generic chatbot; not a
"value will go up" play. Never frame any collection as an investment.

| Layer | Contributes | User can do today |
|---|---|---|
| **FREELONS / Citizens** (4,040, 10 civs) | THE PRODUCT — the agent spearhead | own → unlock (ETH) → chat/train/jobs/render; history travels w/ NFT |
| **The Crypt** (RECOVERED) | sister agent collection, "dead ones" lore | demo chat; agent path via shared system |
| **Crypt TCG** | THE GAME (separate repo) | full matches live; device-local ⬡ HEX |
| **OOGIES** (FRAGMENT) | sister agent, "wild ones" | demo chat |
| **Emile** (DECAYING) | sister agent, "memory fragments" | demo chat |
| **SMILES Collapse** (SEALED) | sister agent, "failed control system" | demo chat |
| **HEX (⬡)** | the connective credit | earn (gated) / spend on runs, art-evolution, tribute. NOT cashable to ETH |
| **Passport / Sync** | cross-collection wallet identity | connect read-only, see holdings/civ, claim daily ⬡ |

- **FREELONS do:** chat, jobs (XP/skill, free), premium missions (HEX), image render, powers, persistent memory.
- **The Crypt / OOGIES / Emile / SMILES do:** chat-demo agents (Tier 2) — keep free chat, DEFER deep per-collection features until FREELONS retention is proven.
- **Crypt TCG does:** the card game; device-local ⬡ HEX rewards (never real HEX).
- **HEX does:** earned in-app, spent on agent training/art/tribute; ETH-in only, no withdrawal.
- **Passport does:** ties holdings together; read-only identity, no money movement.

## 2. MAIN USER JOURNEYS

- **Cold visitor:** Home (FREELONS pitch) → `/demo` (try free agent, no wallet) → OWN a FREELON (OpenSea).
- **Holder:** Sync (connect, read-only) → see holdings → open `/agent/[id]` → unlock (ETH) → train (HEX).
- **Agent user:** `/agent/[id]` → brief/render → work logged → memory recalled next session → history travels w/ NFT.
- **HEX earner/spender:** earn via daily claim/sweep/quests (farmable, capped 250/day) → spend on missions/art/tribute (sinks 800–30,000⬡).
- **TCG player:** open Crypt → mulligan → deploy → turn cycle vs AI → win/lose ceremony → device-local ⬡ HEX reward.
- **Developer/API:** read-only public API (`/api/v1/...`) for agent state/proofs/leaderboards — proof fields only, no raw text body.

## 3. SECURITY RULES (locked — do not violate)
- All ⬡ movement (credit AND debit) requires `requireProvenWallet` (signature). Bare `bind` = identity hint only.
- **Game ledgers SINK real HEX, never SOURCE it.** No real-HEX faucet from client-side game wins.
- Every credit path is idempotent (SET-NX / event key) AND mutates the record inside `withWalletLock`.
- HEX is non-cashable to ETH. ETH is the only money-in. No withdrawal path.
- No real-HEX credit from an unauthenticated request.
- **Farmable faucets** (claim/sweep/passive/quest/mission/listing/reply) capped at `FARMABLE_DAILY_CAP` (250⬡/UTC-day) via `creditWalletHex(..., {farmable:true})`. **Value-backed** events (snipe/sale/unlock/admin/refund) are NEVER capped.
- **Public = proof; owner = memory.** Never serve raw text `body` publicly. Never serve `brief` (user input) at all publicly. Image `body` (URLs) may be public.

## 4. ARCHITECTURE DECISIONS (current shipped state)
- **Public history endpoint** (`/api/citizens/[id]/agent`): proof fields + image URLs; text `body` stripped (flag `HISTORY_PUBLIC_STRIP`, default on). SHIPPED.
- **Owner history endpoint** (`/api/citizens/[id]/history/full`): `requireProvenWallet` + `ownerOf` → full body. SHIPPED.
- **Stays public:** agent state, leaderboards, civ/caste/lore reference, v1 API (proof-only), OG cards (safe summary). All SHIPPED stripped.
- **Requires owner proof:** full work-history text body only. SHIPPED.
- **`/match-results` (OPEN DECISION):** currently orphaned — live `/match` ends at the in-board `MatchCeremony` (→ rematch / home), never routes to the reward screen. Decide: (a) wire ceremony → `/match-results` with a "claim/view rewards" CTA, or (b) retire `/match-results` and fold its reward display into the ceremony. Recommended: (a), via a CTA that writes the existing `sessionStorage["crypt.lastResultState"]` then navigates. NOT YET BUILT.
- **TCG HEX display:** device-local ⬡ HEX, labeled "(device)", never credits real HEX. SHIPPED (currency renamed from $CRYPT).

## 5. BUILD SEQUENCE — what's actually LEFT (safest → riskiest)
The original 12-prompt security/privacy sequence is DONE/deferred (see CLAUDE_CODE_BUILD_SEQUENCE.md).
Remaining buildable work is product/clarity + one Crypt flow:

**P1 — Ecosystem copy: lock the 10-second pitch.** — ✅ DONE 2026-06-09 (mostly already satisfied)
Audited the on-page surfaces: homepage hero ("Where memory becomes character" + product subline) and
`/start` ("own a FREELON, unlock its agent, train it") were ALREADY on-pitch and banned-phrase-free —
left untouched (the evocative h1 is a locked preference). The one real gap was the homepage
`HOME_DESC` (meta + OG + Twitter description) which was LORE-first ("The HEX disappeared…"),
contradicting the product-first funnel decision. Fixed to the canonical product-first line. Verified:
both `<meta name=description>` and `og:description` now render the pitch; no lore-first; no console
errors. Meta-only change (head, not page body) so DOM-verified, no screenshot.

**P2 — Resolve the "Crypt" naming collision (D2).** — ✅ DONE 2026-06-09 (Billy's call: unify cards+game)
Found 3 distinct things: "The Crypt" (`the-crypt-official`, lore NFT collection), "Combat Archives"
(`crypttradingcards`, the CARD NFT collection), "Crypt TCG" (`/crypt-tcg`, the game). Billy chose to
unify cards+game: renamed the "Combat Archives" DISPLAY name → "Crypt TCG" (slug `crypttradingcards`
unchanged — display-only). Result: "The Crypt" (lore) + "Crypt TCG" (cards+game), no ambiguous third
name. Files: `collections-data.ts`, `collections.ts`, `OtherSignalsStrip.tsx` (also fixed its dead
`/combat-archives` href → `/crypt-tcg`), `og/universe`, `glossary.ts`. Verified: /collections fetch
shows "Crypt TCG" present, "Combat Archives" gone, "The Crypt" retained; tsc 0 errors; no console
errors. (Code comments + the `/og/combat-archives.jpg` asset filename left as-is — not user-facing.)

**P3 — Nav hierarchy pass.** — ✅ ALREADY SATISFIED 2026-06-09 (verified, no change needed)
Audited `Header.tsx`, `MobileNav.tsx`, `HeaderArchives.tsx`. The nav was already radically condensed
(2026-06-08 "drop the 45 pages, keep it really simple"): desktop top-level = FREELONS + Collections
+ a "More" dropdown (Get started / The city / Lore — 5 deep links); mobile = 2 CTAs + 3 spine links
(FREELONS, Collections, New here). This IS the minimal hierarchy the blueprint prescribes — sisters/
lore/TCG/dashboard all live deeper, off the newcomer path. No "Combat Archives" lingering post-P2.
No change manufactured. (Same lesson as P1's on-page surfaces: the work was already done; don't
invent a diff.)

**P4 — Agent scope messaging.** — ✅ DONE 2026-06-09
`/demo` already distinguished correctly ("chat with… then own… train and keep") and sister kickers
are lore-only (no "train" claim) — left as-is. The real gap was `/collections`, which flattened
everything into "every token is an AI character you can chat with" — underselling FREELONS (Tier-1
train/own) and over-leveling sisters (Tier-2 chat). Fixed to: "Freelons … the ones you own and
train. … talk to any of them; train and keep a FREELON." Verified live (new copy present, flat line
gone); tsc 0 errors; no console errors. Tier-1/Tier-2 reality now reads in the copy.

**P5 — Crypt post-match reward flow (the one real build).** — ✅ DONE 2026-06-09 (option a: wire it)
Wired the in-board `WinCeremony` (the live `/match` ceremony, via `LiveCryptMatchPage`) to the
orphaned reward screen: added "View rewards →" that writes `sessionStorage["crypt.lastResultState"]`
+ `navigate("/match-results")`. Reducer/balance/real-HEX untouched; device-local ⬡ HEX only;
Run-It-Back + Leave preserved. Also fixed a latent hooks-order violation in WinCeremony. Verified
LIVE: played a real `/match` to DEFEAT → ceremony → View rewards → `/match-results` showed
commander + +8 ⬡ HEX (device) + +15 XP + Duel Again. tsc 0 errors. SEPARATE pre-existing finding
logged: an app-wide React 19 dev warning ("static flag") fires on /home too — NOT from P5, needs its
own look (see CRYPT_TCG_QA_STATUS.md).

**P6 — Human-verify ranked ceremony + reward (QA, no code).** Drive one ranked `/match` to a finish;
confirm in-board ceremony + rating delta fire live. Record in CRYPT_TCG_QA_STATUS.md.

(Each future engineering prompt MUST carry: goal / allowed files / forbidden files / exact change /
acceptance tests / rollback / stop condition — same discipline as the shipped sequence.)

## 6. QA MATRIX
| Flow | Test | Expected | Failure sign | Browser verify? |
|---|---|---|---|---|
| Home → demo | click SEE AN AGENT, send a prompt | live agent reply, free counter decrements | no reply / counter stuck | YES |
| Citizen browse | load /citizens | cards render | blank / bounce | YES |
| Agent workspace (non-owner) | load /agent/[id] | no raw text body; labels/badges only | emoji/hype/raw text visible | YES |
| Agent workspace (owner) | proven wallet | full work-history body + recall | body missing for owner | HUMAN (signature) |
| Public history API | GET /agent | text entries: no `body`; images: URL | text `body` present | YES (fetch) |
| Owner history API | GET /history/full unauth | 401 | 200 w/ body | YES (fetch) |
| HEX farmable cap | credit farmable past 250/day | clamps at 250 | exceeds 250 | TEST (farmable-cap.test) |
| HEX value-backed | snipe after cap | 500 credits in full | snipe blocked | TEST |
| Sweep race | concurrent credits | ≤ cap | double-credit | TEST (sweep-cap-race.test) |
| Wallet connect | /sync | read-only reassurance shown | wallet-move implied | YES |
| Crypt core | tutorial/match | mulligan→deploy→turn→win | crash / dead board | YES |
| Crypt ceremony | finish /match | VICTORY/DEFEAT + reward | no ceremony / no reward | HUMAN |

## 7. LAUNCH-READINESS CHECKLIST
- **MUST fix before public push:** confirm `HISTORY_PUBLIC_STRIP` defaults on in prod; confirm `PAYMENTS_LIVE` + cost-guard (free tier on cheap model); human-verify ranked ceremony→reward; resolve P5 (don't ship an orphaned reward screen).
- **SHOULD fix:** P1/P2 copy + naming collision; P3 nav; legal/compliance review of any money-adjacent copy.
- **CAN wait:** P4 sister-agent messaging polish; sweep-into-shared-pool; v1 API versioning.
- **DO NOT build yet:** real-HEX faucet from games; deep per-sister-collection agent features; cross-collection agent collaboration; wiring `JOB_SIGNAL_*` to the ledger.

## 8. COPY / NAVIGATION RULES
**10-second explanation (canonical):**
> FREELON CITY is a world of AI characters you own as NFTs. Each FREELON is an agent you train — it
> remembers your work and its whole history travels with the NFT. Try one free.

- **Homepage hierarchy:** hero (FREELONS pitch + try-free CTA) → how-it-works (4 steps) → citizen showcase → one line that the city is bigger (link /collections) → closing CTA. Nothing else competes.
- **Nav:** primary = Freelons, Collections, (lore→canon). Everything else under Explore / deeper.
- **Banned phrases:** "investment", "value will increase", "guaranteed", "unfakeable", "more valuable", any ROI/return claim, vague AI buzzwords ("revolutionary AI", "next-gen intelligence").
- **Safe phrases:** "ownable AI agent", "it remembers your work", "history travels with the NFT", "more useful / visible work history", "try free, no wallet needed".
- **Explain HEX:** "⬡ HEX is the in-app credit you earn and spend to train your agent. It's not cashable to ETH." For the game: "device-local ⬡ HEX (practice)".
- **Explain agents:** "Your FREELON is an AI character you train; it builds a work history that stays with the NFT."
- **Explain multiple collections without confusion:** "FREELONS are the first and the one you train. Emile, The Crypt and Oogies are other citizens of the same city you can talk to — one signal, many collections." Lead with FREELONS; sisters are "talk to," not "train."

---

## Pointers (the rest of the control pack)
- Ecosystem detail + decisions: `FREELON_CITY_ECOSYSTEM_MAP.md`
- HEX security + faucet/sink inventory: `HEX_ECONOMY_RED_TEAM.md`
- History API design: `OWNER_AUTH_HISTORY_ENDPOINT_SPEC.md` + `HISTORY_VISIBILITY_POLICY.md`
- Agent scope: `FREELON_CITY_AGENT_SYSTEM_SPEC.md`
- Shipped build log + statuses: `CLAUDE_CODE_BUILD_SEQUENCE.md`
- Crypt QA + the /match-results finding: `CRYPT_TCG_QA_STATUS.md`
- This sprint's changes: `FREELON_CITY_SPRINT_CLOSEOUT.md`

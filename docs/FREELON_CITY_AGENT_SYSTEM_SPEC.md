# FREELON CITY — Agent System Spec

Status: 2026-06-09. Grounded in `lib/agent-subject.ts`, the agent workspace, mission/job
routes, economy constants. No code yet — this locks SCOPE and messaging.

**Critical correction to assumptions:** the code **already** treats every non-TCG collection
as agentic — `NON_AGENTIC_SLUGS = {"crypttradingcards"}` is the ONLY exclusion
(`lib/agent-subject.ts:24`). So "which collections become agents" is not a future build; it
already shipped. The real decision is **how much agent DEPTH each gets, and how we message it.**

---

## 1. Which collections are agents NOW (shipped)
FREELONS + ALL sister collections (The Crypt, OOGIES, Emile, SMILES) are agentic. Only the
Crypt TCG (`crypttradingcards`) is excluded. Each `(slug, tokenId)` resolves to an agent
subject; sisters chat via a separate chat-only/free endpoint, FREELONS via the money-path.

## 2. Recommended SCOPE tiers (the decision)
Code enables everything; we should MESSAGE and INVEST in tiers:
- **Tier 1 — FREELONS (full agent):** the spearhead. Unlock + train + jobs + memory + work history + image gen + powers. 90% of investment.
- **Tier 2 — Sister collections (chat-demo agents):** keep the live chat (already shipped, free, separate endpoint) but DEFER deep per-collection features (custom jobs, unique powers) until FREELONS retention is proven. Message them as "talk to them," not "train them like a FREELON."
- **Tier 3 — Crypt TCG (not an agent):** stays the game. Correct as-is.

Rationale: "if everything is a full agent, nothing is special." FREELONS must stay the
clear spearhead (see Ecosystem Map D4). This is a messaging/investment decision — no code change required to hold it.

## 3. What a FREELON citizen agent can do (live)
Chat; jobs (XP/skill/rep, free); premium missions (Broadcast/War Council/Closer/Signal Scan/etc.); image render ("deploy"); powers (Daily Transmission/Chronicle/Versus); persistent memory + work history that travels with the NFT.

## 4. What Emile can do
Tier-2 chat-demo agent (memory-fragment persona). Live chat only for now; no bespoke job system. Defer deeper features.

## 5. What Crypt / TCG / OOGIES / SMILES contribute
- **The Crypt (NFT):** Tier-2 chat agent ("dead ones" persona) + lore depth.
- **Crypt TCG:** the game — engagement loop, device-local ⬡ HEX, NOT an agent.
- **OOGIES:** Tier-2 chat agent ("wild ones").
- **SMILES:** Tier-2 chat agent ("failed control system").

## 6. Jobs model
FREELONS only. Free daily jobs grant XP/skill/rep, **no HEX** (`job/route.ts:129` signalReward:0 — confirmed). Daily cooldown + cap. tokenId-keyed so progress survives sale.

## 7. Memory model
Per-token agent history (`lib/agent-history.ts`, Upstash, capped ring buffer). Owner memory = full; public = proof-only (see Owner-Auth History spec). Survives resale (keyed by token).

## 8. XP model
Progression store (`lib/progression-store.ts`), tokenId-keyed, daily cap, drives level → class/specialization.

## 9. Reputation model
Derived from job/mission activity; feeds leaderboard. Read-only public proof.

## 10. Skills model
`deriveSpec` from progression → dominant skill = agent's "primary" class. Display-only on the public agent endpoint.

## 11. What costs HEX
Premium missions (800–4000⬡), ascension (2500–20000⬡), art evolution (5000–30000⬡), naming, boosts, tribute. (See HEX red-team doc.)

## 12. What costs ETH
The one-time unlock/activation (rarity-priced 0.005→1.0 ETH), which grants runs + a runs×500⬡ HEX bonus. ETH is the only money-in. Training never re-charges ETH.

## 13. What is free
Sister-collection chat demos; FREELONS daily jobs (XP, no HEX); the public /demo (5 free turns); chat on a free tier.

## 14. What NOT to build yet
- Deep per-sister-collection agent features (custom jobs/powers/memory tuning).
- Cross-collection agent collaboration beyond what exists.
- Any agent feature that sources real HEX (locked rule).
- Sister-collection money-path (keep them free/chat-only; FREELONS owns the money path).

## 15. Simplest MVP
FREELONS full agent loop (unlock → train → jobs → memory → history) + sister chat demos as
the "the city is bigger" proof. Everything else deferred. This is essentially LIVE today —
the MVP is to HOLD this scope and not over-build sisters.

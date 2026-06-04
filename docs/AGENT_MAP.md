# FREELON Agent — System Map & Reference

> ⛔ **DO NOT ADD MORE FEATURES until real-wallet activation and the first paid job are tested.**
> The build phase is done. The next milestone is not another feature — it is:
> **Activate one real FREELON. Run one paid Red Team. Show the proof.**

**Product sentence:**
A FREELON is a citizen you activate into a working AI agent. Give it jobs, train it, build its résumé, and its history stays with the NFT.

**CTA:**
Own the citizen. Activate the agent. Train your squad.

**Status (2026-06-04):** built & tested (214 tests, tsc clean). `PAYMENTS_LIVE=false` — nothing charges yet. Zero real users. This doc is the source of truth for the agent system; keep it factual, no investment/value-promise language.

---

## 1. What a FREELON agent IS (plain English)

Each of the 4040 FREELON NFTs is also a **trainable AI agent the holder owns**.

- **Before activation:** you own a citizen — art, traits, owner, a résumé shell.
- **After activation:** you own a working agent. It does premium jobs, gains XP, develops a class/role, builds a visible work history, and grows a public résumé.

The work history is **tokenId-keyed and follows the FREELON inside the app** — a new owner inherits a trained agent. (On-chain anchoring of that history is **built but not yet deployed**; until then, history is recorded by FREELON CITY and tied to the token, not stored on-chain.)

The moat vs a rented chatbot: it's **yours**, it **remembers your project** (Dossier), it **specializes** from what you actually made it do, and the proof is **shareable + verifiable in-app**.

---

## 2. The activation loop

```
Own FREELON
  → Activate the agent (one-time ETH, by rarity; permanent, survives sale)
    → Get premium runs (finite pool — Common 40 … 1/1 4040)
      → Give it jobs (Strategy / Red Team / Dossier / Images + free abilities)
        → Each job: gains XP · builds class/role · adds to work history · shapes the résumé
          → Runs decrement (40 → 39 → …); recharge cheaply when empty
            → Share the proof (work-log page + OG card)
              → If sold: activation, remaining runs, XP/class, work history stay with the FREELON
```

One FREELON = one agent. Multiple FREELONS = a squad. Different jobs = different roles.

---

## 3. User journey (what the holder sees)

1. Land on a FREELON page → **AGENT RÉSUMÉ** card (class · rank · level · runs · owner · status · best-for).
2. **SEE IT WORK** demo (a real example output) — witness quality before owning.
3. Own it / connect wallet → free abilities (Content / Sales / Research / Design) run immediately, no payment.
4. Pick a **premium** ability (Strategy / Red Team / Dossier / Images) → **Activate** (one-time ETH).
5. Agent activates: badge flips to ACTIVATED, meter shows **premium runs left**.
6. Run a job → real output renders, saves to **Body of Work**, agent gains XP.
7. **Refine** the output ("make it shorter / more brutal / turn into an X post") — multi-turn.
8. **Copy / Share** the result (one-tap X card).
9. Runs run low → **Recharge** (cheaper than activation; bulk packs available).
10. Earn extra runs via daily streaks / referrals (no payment).
11. Public **work-log** page proves what the agent has done.
12. Sell → the new owner inherits the activated, trained agent.

---

## 4. Technical journey (a job, end to end)

```
POST /api/citizens/[id]/mission
  → rate-limit → same-origin → auth (session or wallet signature) → verify ownership
  → kill-switch + budget check
  → UNLOCK GATE: premium ability → require activated → spend 1 run (refund on fail)
     (free abilities → daily cap + global $ budget instead)
  → mission.resolve(ctx)  [the real LLM call: persona + ability + task + guardrail,
     premium model if paid, multi-turn priorOutput if refining, copy-clean if Strategy]
  → applyMission(): +XP, +skill (professional only), memory log, leaderboards
  → addAgentWork(): store the real output (no private brief)
  → agent-notify: level-up / runs-low triggers
  → return output + level + runs + skills
```

---

## 5. File tree

```
THE BRAIN (reasoning + identity)
  lib/missions/llm.ts ............ the LLM call (provider-agnostic, injection-defended, capped)
  lib/missions/models.ts ......... model tiers (premium gpt-5.5 / cheap gpt-4o-mini); free=cheap
  lib/missions/persona.ts ........ builds the agent's identity prompt (civ/class/level/memory/dossier)
  lib/missions/copy-clean.ts ..... persona-free pass that strips lore/hype from public copy (Strategy)

WHAT IT CAN DO (abilities + special missions)
  lib/missions/abilities/ability.ts ..... the resolver template (premium floor, multi-turn)
  lib/missions/abilities/maker.ts ....... Content [free]
  lib/missions/abilities/analyst.ts ..... Strategy [premium]
  lib/missions/abilities/builder.ts ..... Sales [free]
  lib/missions/abilities/communicator.ts  Research [free]
  lib/missions/abilities/guardian.ts .... Design [free]
  lib/missions/abilities/scout.ts ....... Red Team [premium]
  lib/missions/abilities/index.ts ....... the 6-ability registry + display views
  lib/missions/resolvers/dossier.ts ..... THE MOAT — living profile of the holder [premium]
  lib/missions/resolvers/deploy.ts ...... image generation [premium]
  lib/missions/resolvers/feud.ts ........ 2-citizen scene [social]
  lib/missions/resolvers/versus.ts ...... agent-vs-agent red-team [social]
  lib/missions/resolvers/crew.ts ........ 2-citizen collaboration [social]
  lib/missions/resolvers/consult.ts, stub.ts  legacy/back-compat

PROGRESSION (how it grows)
  lib/progression-store.ts ....... XP/level/skills/reputation/memory, tokenId-keyed, leaderboards
  lib/specialization.ts .......... PURE: skill points → class + rank (… Oracle → Legend → Mythic)
  lib/agent-history.ts ........... the body-of-work log (real outputs)

ACTIVATION + ECONOMY (the money loop)
  lib/missions/unlock.ts ......... rarity → price + runs ladder, recharge, bulk packs
  lib/missions/unlock-store.ts ... activated flag + finite run balance (can't outspend), survives sale
  lib/payments/unlock-orders.ts .. ETH quote + on-chain verify (activation / recharge)
  lib/payments/orders.ts ......... per-mission ETH payment rail (sender-matched)
  lib/missions/pricing.ts ........ PAYMENTS_LIVE switch + PAYMENT_WALLET + binding disclaimer
  lib/missions/budget.ts ......... daily $ ceiling + kill-switch (free-run cost guard)
  lib/missions/earn-runs.ts ...... earn runs via streak (7d→3 / 30d→15) / referral (→5)

ENGAGEMENT
  lib/missions/agent-notify.ts ... level-up / runs-low / runs-earned triggers (X-DM + inbox)
  lib/missions/memory-filter.ts .. what's safe to store/showcase (résumé hygiene)

ON-CHAIN PROOF (built, NOT deployed)
  contracts/FreelonHistoryRegistry.sol  Merkle-root anchor contract
  lib/onchain/merkle.ts .......... OZ-compatible Merkle tree / proof / verify
  lib/onchain/history-anchor.ts .. canonical hash of a citizen's history
  lib/onchain/anchor-service.ts .. compute root / verify a citizen
  scripts/anchor-history.mjs ..... founder-run anchor tx (dry-run default)
  scripts/README-onchain.md ...... the anchor runbook

API ROUTES
  app/api/citizens/[id]/mission/route.ts ...... THE run endpoint (the hot path)
  app/api/citizens/[id]/mission/quote/route.ts  per-mission ETH quote
  app/api/citizens/[id]/unlock/route.ts ....... activate / recharge (quote + claim)
  app/api/citizens/[id]/agent/route.ts ........ public: abilities + class + unlock status + history
  app/api/og/agent/[id]/route.tsx ............. shareable social card
  app/api/admin/* (ADMIN_SEED_KEY-gated, OFF in prod):
    golive-preflight ... read-only go-live readiness check
    train .............. run REAL missions to genuinely train a citizen
    seed-demo / seed-showcase ... clearly-labelled display models
    anchor/compute · anchor/save  on-chain anchor helpers

UI (what the holder sees)
  components/CitizenResume.tsx ......... THE résumé card (leads the page)
  components/CitizenAgentDashboard.tsx . the cockpit (pick → brief → run → output → copy/share/refine; pay flow)
  components/CitizenAgentExplainer.tsx . "this is an agent" + SEE IT WORK demo
  components/TopAgents.tsx ............. "what they're becoming" showcase wall
  components/ShareAgentOutput.tsx ...... one-tap share-to-X button
  app/citizens/[id]/page.tsx ........... the citizen page
  app/citizens/[id]/log/page.tsx ....... PUBLIC work-log (proof of what it did)

TESTS (214) — unlock economics, merkle proofs, copy-clean, résumé, earn-runs,
  social-mission guards, + live smoke tests (RUN_LIVE=1) for Red Team / Strategy /
  Dossier / multi-turn quality.
```

---

## 6. Safety & copy rules (LOCKED)

**Never use** (financial-promise / overclaim risk): `worth more`, `value`, `investment`, `profit`, `appreciating`, `guaranteed`, `ROI`, `unfakeable`, `first ever`, or "on-chain" for history that isn't anchored on-chain yet.

**Use instead:** `more useful`, `more developed`, `more proven`, `visible work history`, `tied to the FREELON`, `activation stays with the NFT`, `a trained FREELON is different from a blank one`.

**Other locked rules:**
- Free runs always use the **cheap** model; premium quality only unlocks when paid.
- Finite run pool = a holder **cannot outspend** what they paid (max COGS ≈ 24% of price).
- Only **professional** work shapes the class/résumé; cosmetic/social missions don't pollute it.
- The private `brief` is **never** exposed publicly — only the output.
- Premium copy (Strategy) goes through the persona-free copy pass so deliverables read human, not lore.
- The binding disclaimer must be shown/accepted before any paid action. Crypto is non-refundable.

---

## 7. Go-live gates

**Config to set before any live test:**
`PAYMENT_WALLET` (verify on Etherscan you control it — code has a hardcoded default), `ETH_RPC_URL` (real RPC, not public fallbacks), `ADMIN_SEED_KEY` (unlocks the preflight). Then `PAYMENTS_LIVE=true` is the master switch. Rollback = set it back to `false`. Panic-all-off = `AGENT_AGENTS_OFF=1`. Spend ceiling = `AGENT_DAILY_BUDGET_USD`.

**Preflight (read-only):**
`curl ".../api/admin/golive-preflight?key=KEY&tokenId=<owned>&wallet=<yours>"` — checks citizen exists, you own it, activation price, payment wallet, RPC, LLM key. Don't proceed until `ready: true`.

### GO-LIVE RULE — do NOT announce public activation until:

```
├── One real-wallet activation succeeds
├── One paid Red Team job succeeds
├── Runs decrement correctly (40 → 39)
├── Work history saves correctly
├── Résumé updates correctly
├── Share card updates correctly
├── Rollback has been tested (PAYMENTS_LIVE=false)
└── Public copy has been checked for risky language
```

**The decision gate after the paid job:** *"Would a skeptical holder pay 0.005 ETH for this output?"* — Yes → copy/legal check, then the *"I activated mine, here's what Red Team found"* proof post. No → fix the prompt, not the plumbing. Don't launch.

**Suggested order:** private real-wallet test → fix anything broken → copy/legal pass → one controlled proof post → open activation wider.

---

*Reference doc. Built product: strong. Market proof: not yet started. The next move is the real-wallet test, not another feature.*

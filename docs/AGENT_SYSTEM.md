# FREELON Agent System

> **⚠️ Status & scope**
> - This documents the **FREELON agent system** — citizens (NFTs) as owned AI workers.
> - **Current state: built and live in FREE TEST mode.** Agent runs go through OpenRouter (gpt-5.5 premium / gpt-4o-mini cheap).
> - **Not live:** payments, FUEL, the HEX freeze, and the EMILE emotional-agent line. All missions are currently `cost: 0`.
> - **Keep this updated** whenever agent files or routes change. This is not the main project README — it's the system explainer.

---

## What this is, in one breath

You own an AI worker (the NFT). You use it, it does real work, it remembers what it did, it levels up, and it becomes **more capable and more distinct**.

```
You own an AI worker.
You use it.
It does real work.
It remembers.
It levels.
It becomes more capable and more distinct.
```

---

## The filetree (what each piece does)

```
freelon-city-site/
│
├── 🧠 THE AGENT BRAIN (how a citizen thinks)
│   └── lib/missions/
│       ├── llm.ts ............ talks to the AI. Auto-routes to OpenRouter
│       │                       (gpt-5.5) if OPENROUTER_API_KEY is set,
│       │                       else falls back to OpenAI. Persona goes in
│       │                       the system role; the user's brief is isolated
│       │                       (prompt-injection safe). Hard token cap + timeout.
│       ├── models.ts ......... picks WHICH model per task, from env:
│       │                       premium (gpt-5.5)  = Strategy / Research / Red Team
│       │                       cheap   (4o-mini)  = Content / Sales / Design / check-in
│       └── persona.ts ........ turns a citizen's REAL data (who it is, its
│                               level, civilization, class, memory) into the
│                               AI's "you are this citizen" system prompt.
│                               Higher level → deeper, more authoritative output.
│
├── 💪 WHAT THE AGENT CAN DO (the 6 practical skills)
│   └── lib/missions/abilities/
│       ├── ability.ts ........ THE TEMPLATE. Turns an ability (data) into a
│       │                       working agent: validates the task, builds the
│       │                       persona + task + guardrail, runs the brain,
│       │                       returns output. All six share this one tested path.
│       ├── maker.ts        → CONTENT ... write X posts, threads, captions, copy, plans
│       ├── analyst.ts      → STRATEGY .. ★ FIX MY LAUNCH (flagship) + growth/positioning/audit
│       ├── builder.ts      → SALES ..... pitch, DM, landing copy, objections
│       ├── communicator.ts → RESEARCH .. market briefs, summarize, competitors, explain
│       ├── guardian.ts     → DESIGN .... visual concept, image prompt, naming
│       ├── scout.ts        → RISK ...... red-team my idea, weak points, pre-mortem
│       └── index.ts ........ the registry (which skill each ability is gated on)
│
│   (File names are legacy; the EXPORTED ability is what matters — see the arrows.)
│   Guardrails: CREATE ("review before using") on make-work; INFORM_ONLY on
│   Research/Risk (surfaces info, never tells you to buy/sign/take a regulated action).
│
├── 🎨 THE IMAGE PRODUCT
│   └── lib/missions/
│       ├── image-gen.ts ...... renders the citizen into a scene off its REAL
│       │                       shipped art, keeping the faceted-hex identity.
│       │                       Scenes are a SERVER allowlist (no free prompt box).
│       └── resolvers/deploy.ts  the "put my citizen in Neon City / Throne Room" mission
│
├── 📈 THE GROWING RECORD (what changes as you use it)
│   └── lib/
│       ├── progression-store.ts  the citizen's RECORD: level, the 6 skills,
│       │                         reputation, memory log, leaderboards.
│       │                         Keyed to the NFT (tokenId) → SURVIVES A SALE.
│       ├── specialization.ts ... reads the record → a CLASS + rank title
│       │                         ("Level 50 Strategist · Mastermind") and a
│       │                         "tuned for X" derived from its history.
│       ├── daily-checkin.ts .... free once-per-day in-character line (retention).
│       └── agent-history.ts .... the citizen's "body of work" (saved outputs).
│
├── 🚪 THE DOORS (the API a user hits)
│   └── app/api/citizens/[id]/
│       ├── mission/route.ts ... run a skill or image. Verifies you OWN the
│       │                        citizen, runs the resolver, awards XP, writes
│       │                        memory + history. Free missions: 1 per citizen/day.
│       ├── agent/route.ts ..... feeds the dashboard (abilities + history + class)
│       └── checkin/route.ts ... today's free transmission
│
├── 👀 WHAT HOLDERS SEE
│   ├── app/citizens/[id]/page.tsx ... the citizen page (the product surface)
│   └── components/
│       ├── CitizenAgentExplainer.tsx . "This citizen is an agent" (plain English)
│       ├── CitizenAgentDashboard.tsx . pick skill → pick task → type brief → RUN
│       ├── CitizenCheckIn.tsx ........ today's transmission + visible rank
│       └── CitizenProgressPanel.tsx .. level, class, skills, memory (the spec sheet)
│
└── 🗺️ THE SITE SHELL (the 5 plain pillars)
    ├── components/Header.tsx ... My Citizen · Crypt TCG · Arcade · Dashboard · Earn
    └── app/page.tsx ............ homepage leads with the AGENT (the hero);
                                  the other 4 pillars sit below as "rooms".
```

---

## The user flow (one line per step)

```
1. Holder opens their citizen page          → app/citizens/[id]/page.tsx
2. Sees the dashboard, picks "Fix My Launch" → CitizenAgentDashboard.tsx
3. Types their launch, hits RUN              → POST /api/citizens/[id]/mission
4. Server checks they own the citizen        → ownership gate (verifyOwnership)
5. Builds the citizen's persona              → lib/missions/persona.ts
6. Routes to gpt-5.5 via OpenRouter          → models.ts → llm.ts
7. Returns strategist-grade output           → shown in the dashboard
8. Citizen gains XP + remembers the work     → progression-store.ts + agent-history.ts
9. Over time it levels → new class/depth      → specialization.ts
```

---

## The six skills → classes

| Skill | Class | What it does |
|---|---|---|
| content | Content Agent | X posts, threads, captions, copy, content plans |
| strategy | Strategist | **Fix My Launch** (flagship), growth plans, positioning |
| sales | Closer | pitches, DMs, landing copy, objection handling |
| research | Analyst | market research, summaries, competitor scans |
| design | Designer | visual concepts, image prompts (+ the image render) |
| risk | Red Team | red-team ideas, find weak points, pre-mortems |

Untrained citizen = **Trainee**. The class is *derived* from whichever skill the citizen has used most — no stored field, so it's always consistent and works for all 4040 instantly.

---

## Models & provider

- Provider is **auto-detected**: if `OPENROUTER_API_KEY` is set, all calls route through OpenRouter; otherwise OpenAI.
- Model names come from env (no code change to swap):
  - `AGENT_MODEL_PREMIUM` = `openai/gpt-5.5` — used for Strategy, Research, Red Team
  - `AGENT_MODEL_CHEAP` = `openai/gpt-4o-mini` — used for Content, Sales, Design, daily check-in
- Note: via OpenRouter, model IDs are **namespaced** (`openai/gpt-5.5`, not bare `gpt-5.5`).

---

## What is live vs. not

**Live (free test):**
- All six skill missions + the image deploy mission (`cost: 0`)
- The agent brain on gpt-5.5 via OpenRouter
- Daily check-in, progression, specialization, memory, agent dashboard
- The 5-pillar site nav + agent-hero homepage

**Not live (deliberately deferred):**
- Payments (Coinbase one-off), FUEL prepaid credits
- The legacy HEX freeze / OG badges
- The EMILE emotional-agent line
- Marketplace, companies, guilds, citizen-to-citizen hiring

---

## The business idea (plain)

FREELONS are **practical** agents — they help you work: write, sell, research, plan, red-team. EMILE (planned, not built) will be the **emotional/creative** line. The difference from a normal chatbot: you **own** the agent, it **remembers** you, it **levels**, and its history **stays with the NFT**. That makes a used, specialised agent more capable and more distinct than a fresh one.

> Wording rule for docs/marketing: say "more capable and more distinct," not "worth more / invest / appreciate." Keep investment-coded language out.

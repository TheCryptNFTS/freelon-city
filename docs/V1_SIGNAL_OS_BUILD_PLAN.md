# V1 SIGNAL OS — BUILD PLAN (Execution Commander)

> **EXECUTED 2026-06-10 (same day, gap-fill scope).** Recon showed the repo had
> already shipped most of §4–§5 (hero locked, CityWeekBand = ProofOfRecord,
> home-close eco line = CityStrip, /start iterated, /collections cards live).
> What was actually built: desktop Start nav link; homepage live-status line;
> MemoryProof job CHOICE + REP delta + STAGED PREVIEW label (= §6 demo loop);
> /collections SMILES+TCG intro, threads bar, TCG "PLAY THE GAME →" → /crypt-tcg;
> /start universe line + LIVE/COMING block. tsc + prod build + browser-verified.
> Changes uncommitted — review then commit.

Status: 2026-06-10. Build-ready. Produced from locked decision docs + repo recon, NOT a fresh audit
(deep audit is running in a parallel session; security sequence is CLOSED as of 2026-06-10, commit 299c9a0).

Authority order when anything conflicts: locked decision docs in this folder > this plan > the external brief.
Key locked inputs: FREELON_CITY_ECOSYSTEM_MAP.md (homepage = single FREELONS spine, NOTHING competes),
hub-redesign direction 2026-06-09 (calm shell → living core; monochrome-gold; canon verb AWAKEN, not "agent"),
COPY_LEGAL_CHECKLIST.md, HISTORY_VISIBILITY_POLICY.md, BRIEF_HEX_ECONOMY.md.

---

## 1. BRUTAL VERDICT

- The pieces are stronger than the story. /demo, the agent workspace, jobs→XP→memory, the dossier renderer all EXIST and work — but a cold visitor never sees the loop run in one place. V1 stages the loop; it builds almost no new systems.
- Multi-collection currently reads as slug sprawl ("the-crypt-official" vs "crypttradingcards" vs "Combat Archives"). /collections must become THE city map with product-status chips. The homepage does NOT get a full map — locked decision: single spine, one reveal line.
- /start is the weakest load-bearing page (copy still TODO since the funnel work) while "mind field" is the #1 documented newcomer complaint. Start must answer 7 questions in under 90 seconds.
- The brief's 7-tab nav is itself a regression. Complexity is the #1 complaint; nav was deliberately cut. V1 = 4 public links + ⬡ pill + one gold OWN CTA. No HEX tab (clutter + money-adjacent prominence). Holder links stay connection-conditional.
- LIVE vs DEMO vs PLANNED is blurred in copy (agentic sister collections read like products; lore statuses read like features). Every V1 surface ships a status chip. Trust is the moat when the product is a public work history.

## 2. V1 GOAL

A cold visitor understands the loop in 5 seconds, runs a live citizen in 60, and can find every collection's real status in two clicks — with zero new routes and zero economy changes.

## 3. NEW NAV

Desktop, left → right. Routes all exist today; this is a label/visibility pass on `components/Header.tsx` + `MobileNav.tsx` only. Do not touch HeaderHexPill behavior (locked scope rule).

| Item | Target | Why |
|---|---|---|
| ⬡ logo | `/` | Home. Unchanged. |
| FREELONS | `/citizens` | The shop window — browse the 4,040. Stays first (current behavior). |
| Play | `/play` | The games + TCG entry (`/crypt-tcg` linked from within). Pull, not push. |
| City | `/collections` | The ecosystem map (section 7). "City" beats "Ecosystem"/"Collections" — shorter, on-world. Label change only. |
| Start | `/start` | The explainer (section 8). First slot in MOBILE nav — newcomers are mobile-heavy. |
| ⬡ pill | (unchanged) | Locked. Don't touch. |
| OWN | gold button → existing Own/OpenSea link constant | The single money CTA. Reuse the existing link constant — do not hardcode a new URL. |
| My Citizens / Dashboard | `/my-citizens`, `/dashboard` via HeaderHolderLinks | Holder-conditional, appears on connect. Holders get depth; newcomers get calm. |

Killed from the brief: "Agents" tab (canon verb is AWAKEN; the surface is holder-conditional anyway), "HEX" tab (explained in spine + `/earn`), "Dashboard" as public tab (demoted to holder-conditional), "Ecosystem" label (→ "City").

## 4. HOMEPAGE SECTION ORDER

Six sections. Locked rule respected: FREELONS spine only; the city reveal is one strip, not a competing map. Current page already has 1, 2, 3-precursor, 6 — this is mostly an upgrade pass, not a rebuild.

**§1 SignalHero** — exists (`hero--landing`), copy locked, light touch only
- Purpose: 5-second understanding + two actions.
- Headline: `Where memory becomes character.` (LOCKED — do not churn)
- Subheadline: `4,040 AI citizens you own and train — yours remembers everything you build together, and the whole history travels with the NFT.`
- CTA: `Run a live citizen — free` → `/demo` · ghost: `Own a FREELON`
- Visual: monochrome-gold, one citizen card with quiet idle motion + blinking hex eye. Keep HeroAtmosphere restrained. No RGB, no holograms.
- Component: existing hero section (copy/CTA pass only).

**§2 ProductSpine** — extract from existing `how-it-works`
- Purpose: the loop in three beats, with honest status.
- Headline: `Own. Awaken. Put it to work.`
- Subheadline: `ETH awakens a citizen. ⬡ HEX trains it. Every job it finishes is remembered on the token.`
- Steps (3 gold-rule cards, each with chip + one link):
  1. AWAKEN — rarity-priced unlock — chip LIVE — link `/citizens`
  2. TRAIN — claim ⬡ daily, spend it to train — chip LIVE — link `/earn`
  3. WORK — jobs → XP → public record — chip LIVE — link `/demo`
- CTA: none (links live in cards).
- Visual: three cards, thin gold rules, status chips, ⬡ glyph only — no icons, no emojis.
- Component: NEW `ProductSpine.tsx` (extracted, not invented).

**§3 AgentDemoLoop** — the centerpiece build (full spec in section 6)
- Purpose: show the loop RUNNING, not described.
- Headline: `Watch a citizen work.`
- Subheadline: `Pick a job. The citizen does it, remembers it, and levels.`
- CTA: `Run it yourself — free, no wallet` → `/demo`
- Visual: staged workspace card — job chips → streaming output → delta panel (+1 memory · +10 XP · rep tick). "DEMO PREVIEW" chip top-right.
- Component: NEW `AgentDemoLoop.tsx` (composes existing DemoChat/MemoryProof patterns; MemoryProof section is superseded by this).

**§4 ProofOfRecord (DashboardPreview)** — the moat section
- Purpose: show the public work history — the thing competitors can't show.
- Headline: `The résumé lives on the token.`
- Subheadline: `Sell the citizen and the record travels with it. Work history is public proof; private notes stay with the owner.`
- CTA: `See the city pulse` → `/dashboard`
- Visual: one REAL citizen dossier snippet (reuse `CitizenResume`) + three live numbers (reuse `CityStats`). Respect HISTORY_VISIBILITY_POLICY — public fields only, never raw text bodies.
- Component: NEW `DashboardPreview.tsx` (reads existing APIs; no new endpoints).

**§5 CityStrip (ecosystem reveal)** — refine existing `OtherSignalsStrip`
- Purpose: reveal the rest of the city without competing with the spine.
- Headline: `FREELONS is the first signal. The city is bigger.`
- Subheadline: none — six glyph chips (CRYPT · TCG · OOGIES · EMILE · SMILES · ⬡) in one row.
- CTA: `Enter the city` → `/collections`
- Visual: one quiet row, small-caps, gold-on-black.
- Component: `OtherSignalsStrip.tsx` (refine).

**§6 FinalCTA** — existing `home-close`, copy pass
- Purpose: close.
- Headline: `4,040 citizens. One of them is yours.`
- Subheadline: `Start free. No wallet needed.`
- CTA: gold `Own a FREELON` · ghost `Run the demo`
- Component: existing close section.

HEX gets no standalone homepage section — it's beat 2 of the spine plus `/earn` and `/start`. A full HEX section on the homepage is money-adjacent prominence the locked docs argue against.

## 5. HERO COPY (final)

```
H1:  Where memory becomes character.
SUB: 4,040 AI citizens you own and train — yours remembers everything you
     build together, and the whole history travels with the NFT.
CTA: [ Run a live citizen — free ]   [ Own a FREELON ]
```

Commander call: the H1 is locked Billy-approved copy (evocative line + clarity subline pattern) and it passes the 5-second test. Don't spend churn here — spend it below the fold. Banned anywhere in hero or site copy: "unfakeable", "more valuable", "investment", profit/appreciation implications. Approved frame: "more useful / visible work history". Run all new copy past `COPY_LEGAL_CHECKLIST.md`.

## 6. AGENT DEMO LOOP (MVP spec)

What's LIVE today (label it as such): `/demo` free chat — 5 turns/day, no wallet, isolated $10/day pool, fail-closed; owner workspace at `/agent/[id]`; jobs→XP→memory→leaderboard for awakened citizens.

The homepage loop is a STAGED PREVIEW (deterministic script, zero API cost) that hands off to the LIVE `/demo`. Why staged, non-negotiable: (a) cost guard, (b) walletProof gates ALL real ⬡ movement — no signature, no ⬡, (c) rewards are deterministic/capped, never LLM-decided. The preview must say so: chip reads `DEMO PREVIEW` and the delta panel footnote reads `Preview — real progress requires an awakened citizen.`

Flow and sample content:
1. CHOOSE CITIZEN — featured citizen via existing `FeaturedCitizenPicker` (real token art + real name; never invent a token).
2. CHOOSE JOB — three chips: `Name something` · `Summarize a thread` · `Draft my bio line`. (Jobs are PULL, not push — citizen offers, visitor picks.)
3. OUTPUT — streamed 2–3 lines. Sample for "Draft my bio line": `Builder of small sharp things. Ships before the coffee cools.`
4. MEMORY ADDED — panel appends: `Remembered: your project is a card game. You prefer blunt copy.`
5. XP — chip: `+10 XP · Level 2 → 3 (30 to go)`
6. REPUTATION — chip: `Reliable +1`
7. NEXT UNLOCK — line: `Level 3 unlocks Art Evolution · Tier I` (real shipped feature, opt-in)

UI states: `idle` (job chips pulse once) → `running` (stream + cursor) → `delta` (chips stagger in, 200ms, quiet) → `wall` (after one staged run: `That was a preview. Run a real one — free, no wallet.` → /demo).

Mobile: single column; job chips horizontal snap-scroll; output panel max-height with fade; delta chips stack 2-up; the whole loop must fit one thumb-scroll.

## 7. ECOSYSTEM MAP (lives on /collections, NOT homepage)

Layout: ⬡ center, six nodes in a hex ring (desktop) / stacked cards (mobile). One line each, product chip first, lore status as small-caps flavor. No lore walls.

```
CENTER:  ⬡ THE HEX
         The missing signal. Six collections are six states of contact with it.

FREELONS        The citizens. 4,040 working agents — own, awaken, train.   [AGENTS LIVE]
THE CRYPT       The dead ones. Ancient records beneath the city.           [DEMO CHAT] · recovered
CRYPT TCG       The combat archive. The records fight back — full game.    [GAME LIVE]
OOGIES          The wild ones. An ancient species at the edge.             [DEMO CHAT] [TRY FREE →]
EMILE           The emotional ones. Memory fragments that still feel.      [DEMO CHAT] · decaying
SMILES COLLAPSE The lost ones. A control system that failed.               [SEALED] · demo chat
```

Threads bar beneath the ring — the three systems that cross every node:
`JOBS — citizens work · MEMORY — work is remembered on the token · REPUTATION — the record is public`

Footer line: `Hold any of them and the passport ties it together →` `/sync`.
Disambiguation rule this page must solve: The Crypt (collection) and Crypt TCG (game) are TWO nodes, visually adjacent, one connecting line labeled `source`.

## 8. START GUIDE (/start rebuild)

Seven blocks, in order, each ≤ 60 words + one link. Status chips throughout.

1. **What is FREELON CITY?** — `One city, six collections, built around a missing signal. The citizens are AI agents you own. Own one, awaken it, train it, put it to work — its memory and work history live on the token, not in an app.`
2. **What do I need?** — `Nothing, to try it — the demo is free, no wallet. To go further: a FREELON for the full work loop; any sister-collection NFT gets a chatting citizen.` → /demo
3. **What can my citizen do?** — `Take jobs you pick, produce work, remember what it learns, gain XP and reputation. The record is public; the raw conversations stay yours.` → /citizens
4. **What is ⬡ HEX?** — `The city's training fuel. Claim it daily, earn more through jobs and play, spend it to train and evolve. An in-city credit — not a cryptocurrency, never cashable to ETH.` → /earn
5. **What is live now?** — chips: `Free demo · Agent workspace · Jobs/XP/Leaderboards · City games · Crypt TCG`
6. **What is planned?** — chips: `Weekly City Report · Art evolution activation · More job types` (PLANNED chip, no dates, no promises)
7. **What should I do first?** — `1. Run the demo. 2. Own a citizen. 3. Awaken it. 4. Give it its first job. 5. Claim your daily ⬡.` → /demo

## 9. COMPONENTS TO BUILD / REFACTOR

| Component | Status | Job | Props / data | Used |
|---|---|---|---|---|
| SignalHero | REFINE (inline hero) | 5-sec pitch + 2 CTAs | existing hero data | `/` §1 |
| ProductSpine | NEW (extract from how-it-works) | loop in 3 beats + status chips | static copy, 3 links | `/` §2, reused on `/start` |
| AgentDemoLoop | NEW | staged loop preview → /demo handoff | featured citizen (FeaturedCitizenPicker), scripted job/output/deltas | `/` §3 |
| DashboardPreview | NEW | real dossier snippet + 3 live numbers | CitizenResume public fields, CityStats | `/` §4 |
| EcosystemMap | NEW (refactor CollectionBrowser) | the city map, sec. 7 | collections-data.ts + status chips | `/collections` |
| HexTrainingFuel | FOLD-IN (no new comp) | ⬡ explainer copy block | static | spine step 2, `/start`, `/earn` |
| StartGuide | REWRITE page | 7-question explainer | static + status chips | `/start` |
| CitizenCard | REUSE — do not rebuild | citizen art card | existing | everywhere |
| MemoryPanel | REUSE MemoryProof internals | memory append animation | existing | inside AgentDemoLoop |
| FinalCTA | COPY PASS (inline home-close) | close | static | `/` §6 |
| NavBar | LABEL PASS Header.tsx + MobileNav.tsx | section 3 nav | existing | global |

## 10. DO-NOT-BREAK LIST

Economy/auth (the hard ones):
- walletProof gating on ALL ⬡ movement — never bypass, never add an ungated faucet
- Unlock flow tier-price off-chain verification (the fixed "paid but won't activate" path) — do not touch quote logic
- /demo pool isolation — NEVER consumeFreeRun from the paid pool; $10/day cap stays fail-closed
- HEX economy fixes (299c9a0, verified 2026-06-10) — no economy/agent/API changes, period; consult war-room docs first
- HISTORY_VISIBILITY_POLICY — work history public, raw text owner-only; 3 API surfaces still open, do NOT quick-strip them in passing
- `/api/metadata/[id]` dynamic metadata + evolution (inert until BASE_TOKEN_URI; 503 fail-safe)

Surface (locked scope rules):
- HeaderHexPill behavior · archive dir · `/combat-archives` · hold-the-line→`/synthesis` redirect · homepage-dynamics rules
- Wallet connect flow, OpenSea link constants, all collection routes, `/play` economy wiring, mobile nav, OG routes (`/api/og`) + SEO basics, archive pages
- `?ref=tx-` share params + `transmission_share` analytics event

Copy/brand (locked):
- No emojis anywhere — ⬡ glyph + typographic marks only; ⬡ (site HEX) vs ◇ (isolated game currency) never share a glyph
- Banned words: "unfakeable", "more valuable", "investment", any profit/appreciation implication
- Canon verb AWAKEN (not "activate the agent"); "Hex" never "Nexus" in Crypt TCG display text

## 11. BUILD ORDER (one session, verify gate after each step)

1. **Homepage pass** — hero CTA labels, extract ProductSpine, ProofOfRecord section, CityStrip refine, FinalCTA copy. Gate: build + typecheck + preview `/`.
2. **AgentDemoLoop** — staged preview component + wire into §3, replacing MemoryProof section. Gate: preview all 4 UI states + mobile width.
3. **/collections EcosystemMap** — the hex-ring map + Crypt/TCG disambiguation. Gate: preview, check every node link resolves.
4. **/start rewrite** — 7 blocks. Gate: preview + copy vs COPY_LEGAL_CHECKLIST.
5. **Nav label pass** — Header.tsx + MobileNav.tsx per section 3. Gate: preview desktop + mobile nav, holder-conditional links still appear on connect.
6. **DashboardPreview polish** — live numbers + dossier snippet wired. Gate: preview with and without API data (empty states).
7. **Full sweep** — `npm run build`, typecheck, preview every touched route at full desktop width AND mobile, OG preview spot-check, changed-file summary.

## 12. FINAL CLAUDE CODE PROMPT (copy-paste)

```
You are executing the V1 SIGNAL OS plan for freeloncity.com.

Repo: /Users/billy/freelon/phase3/freelon-city-site

FIRST, before any edit:
1. Read docs/V1_SIGNAL_OS_BUILD_PLAN.md in full — it is the spec. Follow its
   section numbers. Where it conflicts with anything else, the locked decision
   docs it cites win.
2. Read docs/FREELON_CITY_ECOSYSTEM_MAP.md, docs/COPY_LEGAL_CHECKLIST.md,
   docs/HISTORY_VISIBILITY_POLICY.md.
3. Inspect the current homepage (app/page.tsx), Header.tsx, MobileNav.tsx,
   app/start/page.tsx, app/collections/page.tsx before touching them.
4. Produce a short written plan of scoped changes and proceed (do not wait for
   approval; do not expand scope).

RULES:
- Scoped edits only. Do not delete or rename any route. Do not touch anything
  in the plan's DO-NOT-BREAK list (section 10) — especially walletProof, the
  unlock flow, the demo pool, /api/metadata, and the HEX economy.
- No new API endpoints. No economy changes. No new routes.
- The homepage agent demo loop is a STAGED PREVIEW handing off to the live
  /demo — label it "DEMO PREVIEW"; never imply simulated XP/⬡ is real.
- Preserve multi-collection framing exactly as the plan's ecosystem map
  defines it (7 entities incl. SMILES Collapse; Crypt collection vs Crypt TCG
  disambiguated).
- Copy rules: no emojis (⬡ + typographic marks only), banned words per
  COPY_LEGAL_CHECKLIST, canon verb AWAKEN, evocative-H1 + literal-subline
  pattern, LIVE/DEMO/PLANNED status chips everywhere a feature is named.
- Style: black/gold/white, restrained, quiet motion, premium — no RGB
  cyberpunk, no hologram effects, no mint-page energy.

EXECUTION ORDER: plan section 11, steps 1–7, with the verify gate after each
step (npm run build + typecheck + browser preview of the touched route at
full desktop width AND mobile — node-only proofs are not sufficient).

WHEN DONE: report (a) changed files with one-line reasons, (b) every copy
string added (for legal/banned-word review), (c) anything from the plan you
did NOT do and why, (d) remaining risks.
```

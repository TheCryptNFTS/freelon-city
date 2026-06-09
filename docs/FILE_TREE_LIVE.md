# FREELON CITY — Live File Tree & Architecture Map

Generated 2026-06-09 from the actual repo. Stack: **Next.js 15 (app router) · React 19 ·
TypeScript · Tailwind · viem/wagmi (Ethereum) · Upstash Redis (state) · Vercel Blob (images) ·
OpenRouter (LLM + image gen) · Sentry**. ~50 pages · 142 API routes · 254 lib files · 134 components.

State model: **no traditional DB** — Upstash Redis key-value stores (per-wallet, per-token) +
static JSON (`data/`) + on-chain reads. Images persist to Vercel Blob. Identity = wallet signature
(`walletProof`) or X OAuth session.

---

## ROOT CONFIG
| File | Does |
|---|---|
| `next.config.ts` | redirects/rewrites (the "Great Consolidation" 52→16 routes), image domains, immutable cache headers for `/public` assets |
| `middleware.ts` | `?r=<handle>` referral-cookie capture on `/sync` |
| `instrumentation.ts` | Sentry init |
| `vercel.json` | function maxDuration overrides (image/video routes need ~300s) |
| `tailwind.config.ts` · `postcss.config.mjs` | styling |
| `vitest.config.ts` | test runner |
| `BRAND-SYSTEM.md` · `DESIGN-TOKENS.md` | locked visual canon (palette, the 10 civs, bans) |
| `LAUNCH.md` · `SITE_AUDIT.md` | older planning notes |

---

## app/ — PAGES (~50 routes)

### Core newcomer funnel
- `page.tsx` — **homepage** (hero "Where memory becomes character", how-it-works, citizen showcase, closing CTA). Product-first.
- `start/` — "2-minute guide" onboarding.
- `demo/` — **free public agent demo** (no wallet; 5 free turns → OWN wall). The conversion spine.
- `sync/` — wallet connect hub (folds in /signal /passport /vault /carrier as anchored sections). Read-only.
- `collections/` + `collections/[slug]/` — the 6-collection universe browser.

### Citizen & agent (the product)
- `citizens/` — browse all 4,040; `citizens/[id]/` — citizen detail; `citizens/[id]/card/` — share card; `citizens/[id]/log/` — public work-history (proof-only).
- `agent/[id]/` — **the agent workspace** (chat + render + jobs + powers; owner-gated). `agent/c/[slug]/[id]/` — sister-collection agent workspace.
- `pfp/` — redirect → /citizens#pfp.

### Economy / stats
- `dashboard/` — market/floor/snipe/civ-war/earners analytics (tabbed; absorbs /numbers /heat /undervalued /leaderboard).
- `earn/` — all HEX-earning paths (ledger/relay/synthesis).
- `shop/` — HEX sink storefront.
- `wallet/[address]/` · `passport/[address]/` — per-wallet identity/holdings.

### Games (the /play arcade — HEX sinks/faucets)
- `play/` — arcade hub; `play/guard/` (Guard the Pot), `play/hex-match/`, `play/proof/`, `play/restore/`, `play/sweep/`, `play/cipher/`, `play/reckoning/` (civ-war tribute burn).
- `crypt-tcg/` — the card game landing (the game itself is the separate /Users/billy/crypt-game repo).

### Lore / world
- `canon/` — story + glossary (absorbs lexicon/names/secrets/roadmap/manifesto/origin/factions).
- `civilizations/` + `civilizations/[slug]/` — the 10 civs (+ castes/shapes sections).
- `transmissions/` + `transmissions/[id]/` — community wall / City Archive feed.
- `tribute/` + `tribute/[handle]/` — patrons/architect. `carrier/[handle]/`, `carrier-of-the-week/`, `channel/[handle]/` — carrier/social.
- `archive/` — graveyard. `the-fifth-bracket/` — hidden easter-egg. `press/`, `developers/` (public API docs).

### Compliance / ops
- `legal/` + `legal/{terms,privacy,dmca,honorary-notice,carrier-of-the-week-rules,guard-the-pot-rules}/`.
- `admin/` — internal ops console (unlinked). `share/score/` — score share. `app/synthesis/` — legacy.

---

## app/api/ — 142 ROUTES (by cluster)

### Agent / missions (the AI product)
- `citizens/[id]/agent` — public agent header (abilities/scenes/unlock/history; text body stripped).
- `citizens/[id]/history/full` — **owner-auth** full work-history (walletProof+ownerOf).
- `citizens/[id]/mission` — run a premium mission (image render / dossier / etc.; HEX + $-budget gated). `…/job` — free XP/skill jobs. `…/transmission` `…/chronicle` `…/checkin` `…/versus` — agent activities. `…/landing` — owner-scoped on-chain grounding. `…/unlock` — ETH activation.
- `agents/[slug]/[id]` — **all sister collections** (Crypt/OOGIES/Emile/SMILES): chat + (new) image render from token art, free-tier with tight daily caps.
- `demo/[slug]` — free public demo agent. `agent/ascend` · `agent/evolve*` · `agent/awaken/*` — paid progression (ETH/HEX).

### HEX economy
- `wallet/[address]/hex` — balance + the credit-bearing holder/sweep/defender ticks (now walletProof-gated). `…/tokens` `…/civs` `…/balance` `…/inventory` `…/net-worth` `…/featured` `…/stable` — wallet reads.
- `claim` (daily) · `mission/claim` · `quests/[questId]` · `reckoning/tribute` (civ-war burn) · `tithe` · `city/boost` `city/build` `city/collect` — earn/spend.
- `referral` · `reserve` · `watchlist` · `alerts` · `defender` · `hex-index`.

### Games
- `match/create` `match/queue` `match/[id]` `match/[id]/{action,join}` — PvP TCG matches. `arcade/score` · `play/guard/{attempt,state}` · `reckoning/state` · `city/{state,leaderboard,build,collect}` — arcade/shared-city.

### Social / X / sharing
- `x/{start,callback,prove,me}` — X OAuth + walletProof signing. `auth/{nonce,verify}` — wallet auth. `transmissions*` `transmissions/[id]/{boost,report,signal}` — community wall. `reply` · `carrier/[handle]` · `civ-broadcast/[slug]` · `name(s)` · `realign/[id]` · `threads` · `notifications`.

### OG image cards (~22 generators, Satori/ImageResponse)
- `og/resume/[id]` (NEW — cinematic poster card) · `og/agent/[id]` · `og/card/[id]` · `og/[id]` · `og/universe` · `og/carrier` · `og/civ-pride/[slug]` · `og/propaganda/[slug]` · `og/rivalry/[slug]` · `og/hex/[address]` · `og/passport/[address]` · `og/rank/[address]` · `og/wallet/[address]` · `og/{daily,heat,hex-index,floor-history,civ-value,play,score,sweep-burst}`.

### Market data (OpenSea proxy)
- `opensea/{stats,stats/[slug],holders,listings,recent,transfers,civ-stats,per-civ-floor,per-civ-volume}` · `market/{heat,red-signals}`.

### Public dev API (versioned, documented at /developers)
- `v1` · `v1/citizens` · `v1/citizens/[id]` · `v1/citizens/[id]/{agent,history,proof}` · `v1/leaderboard` · `leaderboard` `leaderboard/me`.

### On-chain / metadata
- `metadata/[id]` — dynamic NFT metadata (art-evolution). `activations` · `unlock/[id]` · `transforms` · `owned-cards` · `ghost/{list,[tokenId]}` · `lore-key`.

### Cron (scheduled)
- `cron/{daily-signal,carrier-of-week,sweep-bounty,match-sweep,agent-transmission}`.

### Admin (token-gated)
- `admin/{credit,run,train,evolve,preflight,golive-preflight,ops,seed-demo,seed-showcase,seed-transform,activations,anchor/compute,anchor/save}`.

### Misc
- `shop/{buy,inventory/[handle]}` · `log-error`.

---

## lib/ — 254 FILES (by subsystem)

### HEX economy (the money layer)
- `wallet-hex-store.ts` — **the ⬡ ledger** (creditWalletHex w/ farmable cap, debitWalletHex, withWalletLock, creditWalletHexCapped). `economy-constants.ts` — all prices/caps/rates (peg, FARMABLE_DAILY_CAP, JOB_SIGNAL_* footgun). `economy-extras.ts` — sale/listing/snipe/fresh-blood faucets. `sweep-inline.ts` — per-wallet sweep crediting. `holder-tick.ts` — passive holder income + decay gate. `floor-defender.ts` · `defender-scan.ts` · `defender-store.ts` — floor-defense bounties. `daily-claim-store.ts` · `daily-mission.ts` · `daily-checkin.ts` — daily faucets. `hex-spend.ts` · `tithe-store.ts` · `reckoning-{config,store}.ts` — sinks. `eth-math.ts` · `eth-price.ts` · `money-format.ts` — conversions.

### Agent / missions (AI)
- `missions/image-gen.ts` — **image render pipeline** (SCENES allowlist 32 looks, STYLES transforms, generateCitizenScene, generateSisterScene, evolve; OpenRouter editToB64 → stamp → Blob). `missions/video-gen.ts` · `missions/image-stamp.tsx` (FREELON signature brand). `missions/llm.ts` · `missions/models.ts` · `missions/persona.ts` — reasoning. `missions/budget.ts` — **$-budget + daily-cap cost guard** (consumeFreeRun, claimDaily, kill-switch). `missions/pricing.ts` · `missions/unlock*.ts` — ETH activation pricing/orders. `missions/registry.ts` `missions/catalog.ts` `missions/types.ts` — mission defs. `missions/abilities/*` — the 6 agent classes (analyst/builder/communicator/guardian/maker/scout). `missions/resolvers/*` — per-mission output (deploy/dossier/versus/crew/feud/consult). `missions/dossier-store.ts` · `missions/memory-filter.ts` · `missions/ops-log.ts` · `missions/train.ts` · `missions/telemetry.ts`. `agent-history.ts` — per-token work record. `agent-subject.ts` — which collections are agentic (TCG excluded). `agent-tier-store.ts`. `collection-persona.ts` — sister-collection voices.

### Crypt TCG engine (lib/crypt-engine/* — used by city-site for card data/meta; the playable game is the separate repo)
- `engine/` — reducer, state, cards, commanders, keywordEngine, effectResolver/System, traitEngine, combat bonuses, setup, formats, rng, events. `data/` — loadAllUnits/Artifacts/Commanders. `design/` — commanderSpecs, factionIdentity. `constants/` — commander rules/boosts. `types/`.

### On-chain
- `onchain/agent-registry.ts` — FreelonAgentRegistry contract (awaken/training). `onchain/history-anchor.ts` · `onchain/anchor-service.ts` · `onchain/merkle.ts` — work-history on-chain anchoring (Merkle proofs). `owner-of.ts` — ownership verification. `wallet-tokens.ts` · `wallet-proof.ts` · `wallet-classification.ts`. `payments/unlock-orders.ts` — ETH unlock order tracking.

### Citizen data / identity
- `citizens.ts` — the 4,040 (reads data/citizens.json) + getCitizen/getIdentity. `constants.ts` — CIVILIZATIONS, CONTRACT, imageUrl/IPFS. `specialization.ts` — class derivation. `progression-store.ts` — XP/level/rank leaderboard. `rarity.ts` · `citizen-meta.ts` · `epithets.ts` · `gods.ts` · `name-store.ts` · `realignment-store.ts` · `citizen-of-day.ts` · `featured-*.ts`.

### Social / X
- `x-{oauth,session,store,post,dm,autopost}.ts` — X integration. `share.ts` · `share-agent.ts` — tweet-intent + caption builders. `carrier*.ts` · `referral-store.ts` · `transmission(s)-store.ts` · `reply-{store,engagement-scan}.ts` · `civ-broadcast-store.ts` · `notify*.ts` · `notifications-store.ts`.

### Games / city
- `hex-match-engine.ts` · `match-pvp.ts` · `match-store.ts` — PvP. `guard-store.ts` · `sweeper-store.ts` · `ghost-store.ts` · `red-signal-store.ts` — arcade. `city-store.ts` · `city-config.ts` — shared city. `arcade-{progress,score-store,feedback}.ts`. `crypt-demo-decks.ts`.

### Civ / world
- `civ-wars.ts` · `civ-mayor.ts` · `collapse-mode.ts` · `worldbuilding.ts` · `deep-lore.ts` · `glossary.ts` · `canon.ts` · `daily-signal.ts` · `signal-{inventory,set}.ts` · `collections(-data).ts`.

### Infra / util
- `upstash-{client,lock}.ts` — Redis. `rate-limit.ts` — per-route limiting. `fetch-with-timeout.ts` · `opensea-fetch.ts` · `public-api.ts` (CORS) · `game-{auth,cors,session}.ts` · `track.ts` · `system-copy.ts` · `redact-state.ts`. React hooks: `use-viewer.ts` `useHolder.ts` `useOwnsCitizen.ts` `useLoreKey.ts` `viewer-cookie.ts` `get-wallet-address.ts`.

### Tests (`*.test.ts`)
~25 colocated vitest files — economy, wallet-hex, sweep-race, farmable-cap, missions (budget/pricing/unlock/money-flow/redteam), progression, match, rate-limit, etc.

---

## components/ — 134 FILES (by area)

### Agent workspace
- `AgentWorkspace.tsx` — **the 3-column workspace** (chats / agent + render / stats). `AgentPowers.tsx` (Transmission/Chronicle/Versus). `WorkspaceUnlock.tsx` · `CitizenAgentDashboard.tsx` · `CitizenJobsBoard.tsx` · `FramedAgent.tsx` · `DemoChat.tsx` · `ShareAgentOutput.tsx` · `EvolvePanel.tsx` · `CitizenResume.tsx`.

### Homepage / funnel
- `HeroVideo.tsx` `HeroAtmosphere.tsx` `HeroMarketStat.tsx` `IdentityGreeting.tsx` (cold pill) `CitizenShowcase.tsx` `TransformsWall.tsx` `YourAgentsRail.tsx` `ActivationProof.tsx` `CitizenAgentExplainer.tsx`.

### Nav / chrome
- `Header.tsx` `HeaderArchives.tsx` (More dropdown) `HeaderHexPill.tsx` `HeaderSeeAgent.tsx` `MobileNav.tsx` `Footer.tsx` `ChromeGate.tsx` `Analytics.tsx` `ErrorReporter.tsx` `CityNotice.tsx` `ScrollReveal.tsx`.

### Citizen browse / display
- `CitizensBrowser.tsx` `CitizenCard.tsx` `CollectionBrowser.tsx` `FindCitizen.tsx` `RandomCitizenButton.tsx` `CitizenName/Realign Editor` `CitizenProgressPanel.tsx` `CitizenCheckIn.tsx` `CitizenDeepLore.tsx` `CitizenOwnedByYou.tsx`.

### Economy / wallet / dashboard
- `WalletConnect.tsx` `InlineSync.tsx` `HexEarningsLog.tsx` `HexNetWorth.tsx` `HexIndex.tsx` `VaultClient.tsx` `YourStable.tsx` `StreakBadge.tsx` `ClaimForm.tsx` `dashboard/{CivWar,Earners,Heat,Snipes,Progression}Section.tsx` `earn/{Relay,Synthesis}Section.tsx` `Live{HeatGrid,SalesFeed}.tsx` `CivValueChart.tsx` `HolderDistributionChart.tsx` `TopAgents/TopCitizensByValue.tsx`.

### Games / social / share
- `GuardThePot.tsx` `HoldTheLineClient.tsx` `DailyHub.tsx` `GamePreview.tsx` `Arcade*.tsx` `Quest{Toast,Tracker}.tsx` `Share{Buttons,OG}.tsx` `PropagandaShareButtons.tsx` `CopyToClipboardButton.tsx` `Transmission{Card,Submit}.tsx` `ReplySubmit.tsx` `TitheForm.tsx` `NotificationInbox.tsx` `ReferralBeacon.tsx`.

### Lore / civ / sections
- `canon/{Lexicon,Names,Roadmap,Secrets}.tsx` `civilizations/{Castes,Shapes}Section.tsx` `citizens/PfpSection.tsx` `archive/GraveyardSection.tsx` `tribute/{Architect,Patrons}Section.tsx` `SignalUniverse.tsx` `OtherSignalsStrip.tsx` `DoctrineFragment.tsx` `Ghost404.tsx` `FourOFourEvent.tsx` `MayorBroadcast.tsx` `CivGlyph.tsx` `GlossaryTerm.tsx`.

### UI primitives (`components/ui/`)
- `Panel · Pill · Banner · ActionCard · KpiRow · SectionHeader · StatusDot · LiveIndicator · ResponsiveGrid · tokens.ts · index.ts`.

---

## data/ — static JSON
- `citizens.json` — the 4,040 (traits, civ, tier, names). `identities.json` · `doctrine-fragments.json` · `deep-lore.json` · `shop-items.json`. `collections/*.json` — the 5 sister collections (per-token art `img` + traits): crypt, oogies, emile, smiles, crypttradingcards.

## contracts/ — Solidity
- `FreelonAgentRegistry.sol` (awaken + training, LIVE on mainnet). `FreelonHistoryRegistry.sol` (work-history anchoring).

## scripts/ — tooling (.mjs/.py)
- `deploy-agent-registry.mjs` · `deploy-history-registry.mjs` · `anchor-history.mjs` — on-chain. `ingest-collections.mjs` — pull sister-collection data. `verify-engine.mjs` — prebuild engine check. `test-{agent,deploy,poster-looks}.mjs` — gen harnesses. `reckoning-v1-{audit,refund}.mjs` · `cache_honoraries.py`.

## public/ — static assets
- `heroes/ og/ atmos/ civs/ districts/ glyphs/ lore/ origin/ shop/ social/ textures/` (pre-baked, 1yr immutable cache). `generated/` — runtime image output (NOT committed; Blob is the prod store).

---

## Key data flows (how it actually works)
1. **Agent render:** workspace picks a SCENES key → `citizens/[id]/mission` (FREELONS) or `agents/[slug]/[id]` (sisters) → budget+HEX gate → `image-gen.ts` (OpenRouter edit off the token's own art) → stamp → Vercel Blob → save to `agent-history` → share.
2. **HEX:** earned via gated faucets (`creditWalletHex`, walletProof + idempotent + farmable cap) → spent via `debitWalletHex` on missions/art/tribute. ETH-in only, non-cashable.
3. **Identity:** wallet connect (read) → walletProof signature (spend/owner data) OR X OAuth (`x-session`).
4. **Persistence:** Upstash Redis (mutable state) + static JSON (citizen/lore data) + on-chain (ownership, anchored history) + Vercel Blob (images).
5. **Share/virality:** OG routes render cards (Satori) → `share.ts` tweet-intent → X.

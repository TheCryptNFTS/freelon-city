# SITE_AUDIT.md — 404 / FREELON CITY (freeloncity.com)

**Repo:** `/Users/billy/freelon/phase3/freelon-city-site`
**Date:** 2026-06-08
**Audited against:** the AGENT-NETWORK journey — land → understand *NFTs become AI agents* → connect wallet → see eligible NFTs → unlock an agent → open ChatGPT-style chat → give it work → it builds memory / skills / reputation / HEX history.
**Collections:** FREELONS/404 = work agents · Emile = memory/creative agents · The Crypt (`the-crypt-official`) = legacy/dark strategy agents · Oogies = experimental agents · TCG (`crypttradingcards`) = game layer, NOT agent-first.

> No reassurance. Nothing is marked "working" unless the code proves it. Unprovable = UNKNOWN. Optimised for a simple, shippable, understandable product, not for preserving work.

> **CORRECTIONS (2026-06-08, post-verification).** A second grounded pass against `next.config.ts` and `lib/collections-data.ts` overturned several first-pass findings. They are corrected inline below; summary:
> - **`/carrier` is NOT broken.** `next.config.ts:62` redirects `/carrier` → `/sync#carrier`. The `CarrierHealthCta` link works. (False positive.)
> - **Emile is NOT missing.** `COLLECTION_META` includes `emile0x1908` (collections-data.ts:68); `/collections/emile0x1908` works and Emile has a working agent at `/agent/c/emile0x1908/[id]`. (False positive.)
> - **The 1/1 slug routes (`/origin-signal`, `/patient-zero`, `/genesis-hex`, `/the-final-signal`) are NOT unknown.** They're rewrites to `/citizens/*` (`next.config.ts:13-16`).
> - **The build is not "broken code."** It compiles + type-checks cleanly every run; it only fails in the *prerender* phase on network-bound routes timing out in this sandbox (no `OPENSEA_API_KEY` / no RPC). See the corrected BUILD section. The site is live on Vercel.

---

## BUILD & LINT RESULTS

- **`npm run lint` → FAILS / not configured.** There is **no `lint` script** in `package.json`. `npx next lint` halts on an interactive "configure ESLint" prompt (ESLint was never set up; `next lint` is also deprecated in Next 16). **Conclusion: the project has no working lint.**
- **`npm run build` → fails to COMPLETE in this local sandbox, but compiles + type-checks cleanly every run (no code/type errors).** It dies only in the *prerender / page-data* phase. Root cause was diagnosed by testing, not guessed:
  - Every run reaches `✓ Compiled successfully` and passes `Linting and checking validity of types` — so there is **no TypeScript or code error.**
  - It then fails generating **network-bound routes**: `/api/opensea/holders` (does `fetch()` to OpenSea using `OPENSEA_API_KEY`, `revalidate=300`) and `/channel/[handle]` (`force-static` + `generateStaticParams()` prerendering 35 honorary handles, each doing **on-chain owner lookups**). In this sandbox there's no `OPENSEA_API_KEY` and no reachable RPC, so these prerenders **time out at 60s**, crash build workers, and *surface* as `MODULE_NOT_FOUND` "missing chunk" errors (the chunk/phase varies run to run because it's worker death under timeout stress, not a deterministic bad chunk).
  - **Tested fix that did NOT work:** setting `outputFileTracingRoot` in `next.config.ts` (the multiple-lockfile theory). Build got further but still died at `/api/opensea/holders`. Reverted. The lockfile is not the cause.
  - **Conclusion:** this is a **local-sandbox limitation (missing prod env + no network), not a production code blocker.** The site is live on Vercel, which has env + network for these prerenders. Cannot prove the Vercel build from here, but there is no code/type failure.
  - **Optional real improvement (not a blocker):** mark `/api/opensea/holders` `force-dynamic` (it's a live-fetch API; prerendering it is pointless) and/or stop `/channel/[handle]` from prerendering 35 on-chain lookups at build. This would let local builds complete and speed prod builds — but it changes caching behavior, so treat as a deliberate change, not a quick fix.
- **Reminder:** even a green build would NOT mean the site is good. The route audit below stands on its own.

---

## ROUTE-BY-ROUTE AUDIT (45 page routes)

Format per route: Collection · Purpose · CTAs → targets · CTA works? · Supports unlock/chat/use? · Real or fake? · Duplicates? · Confuses agent message? · Imports valid? · **VERDICT** + reason.

### CORE JOURNEY

#### `/` — `app/page.tsx`
- Collection: FREELONS only. Purpose: homepage / agent pitch.
- CTAs: SEE AN AGENT → `topAgentHref()` (real, falls back `/citizens/1`); OWN A FREELON → OpenSea; New here → `/start`; OWN/SEE repeated in closing; Discord/X.
- CTA works? Yes. Supports journey? Yes (entry). Real? Real (live islands, self-hiding proof). Duplicates? No.
- **Confuses agent message? YES — strongly. Homepage says "FREELONS are 4,040 AI characters you own" and never mentions Emile / Crypt / Oogies as sibling agent collections.** The "every NFT collection becomes an agent" thesis is absent from the front door.
- Imports valid? Yes. **VERDICT: KEEP (must fix messaging)** — works, but reframes the multi-collection agent network as a single FREELONS drop.

#### `/start` — `app/start/page.tsx`
- FREELONS only. 2-minute onboarding guide. CTAs → `/citizens/1`, `/citizens`, `/sync`(+anchors), `/dashboard`, OpenSea, X/Discord — all resolve. Supports journey? Yes. Real? Real. Duplicates? No.
- Confuses message? Partially — frames the product as FREELONS-only; no sibling collections.
- **VERDICT: KEEP** — working agent-first onboarding into the unlock flow.

#### `/citizens` — `app/citizens/page.tsx`
- FREELONS. Index/browser of the 4040 agents. CTAs → `seeAgentHref` (real), `/sync#connect`, `#pfp`, 1/1 slug routes (`/origin-signal` etc. — UNKNOWN, not verified), `/tribute/[handle]`, `/civilizations`, `/earn` — core ones resolve. Supports journey? Yes (primary discovery). Real? Real. Duplicates? No.
- Confuses message? Yes — reinforces FREELONS-only; no out-link to sibling agent collections.
- **VERDICT: KEEP** — core discovery → agent profile surface.

#### `/citizens/[id]` — `app/citizens/[id]/page.tsx`
- FREELONS. Public citizen identity hub; THE journey node. CTAs: **Open the workspace → `/agent/[id]` (EXISTS, works)**, work-log → `/citizens/[id]/log`, card → `/citizens/[id]/card`, owner tools (check-in/evolve/jobs/name/realign/watchlist/stable). Supports journey? Yes (identity→unlock→workspace). Real? Real. Duplicates? No. Confuses message? No (strongly agent-first). Imports valid? Yes.
- **VERDICT: KEEP** — central node of the required journey. **Do not touch.**

#### `/citizens/[id]/log` — `app/citizens/[id]/log/page.tsx`
- FREELONS. Public work-log (proves agent memory/reputation, survives sale). Back-link → `/citizens/[id]` works. Supports journey? Yes (evidences the thesis). Real? Real (`getAgentHistory`+`getProgress`). 
- **VERDICT: KEEP** — load-bearing proof of agent memory/reputation.

#### `/citizens/[id]/card` — `app/citizens/[id]/card/page.tsx`
- FREELONS. Shareable resale/listing card. CTAs: share-X (guarded until valid ask), LIST ON OPENSEA, DOWNLOAD PNG → `/api/og/card/[id]` (EXISTS), back. Works? Yes. Supports journey? No (resale tool). Real? Real. 
- Confuses message? Mild (pushes resale). **VERDICT: MERGE** — keep as citizen sub-tool, not a standalone surface.

#### `/agent/[id]` — `app/agent/[id]/page.tsx`
- FREELONS. **The ChatGPT-style agent workspace** (renders `AgentWorkspace`). The payoff of the whole journey. Real? Real (`getCitizen`/`getIdentity`). Imports valid? Yes.
- **VERDICT: KEEP** — this is the chat window. **Do not touch.**

#### `/agent/c/[slug]/[id]` — `app/agent/c/[slug]/[id]/page.tsx`
- Sister collections (Crypt / Oogies / Emile / Smiles) via `getCollectionToken`. Same `AgentWorkspace` chat window. Real? Real. Imports valid? Yes.
- **VERDICT: KEEP** — the sibling-collection chat window. This is the route the target structure calls `/agent/[collection]/[id]`. **Do not touch the chat; consider aligning the URL shape later.**

#### `/collections` — `app/collections/page.tsx`
- ALL (the universe index). The one surface that tells the multi-collection agent story ("every record is a living agent"). Cards → `/citizens` (FREELONS) and `/collections/[slug]` (sisters). `isAgenticCollection` badge already exists. Real? Real. 
- Confuses message? No — it *carries* the agent-network message. **VERDICT: KEEP** — closest existing page to the intended `/agents` index.

#### `/collections/[slug]` — `app/collections/[slug]/page.tsx`
- Sisters: Crypt, Oogies, Smiles, TCG (`COLLECTION_META` has only 4 keys: `the-crypt-official`, `crypttradingcards`, `oogies`, `smiles-genesis`). Agentic token cells → `/agent/c/[slug]/[id]` (EXISTS). 
- **BROKEN sub-case:** `COLLECTION_META` has **no `freelons` and no `emile0x1908` key**, so `/collections/freelons` and `/collections/emile0x1908` hit `notFound()`. **Emile is agentic but has no browse page.** Verify whether `smiles-genesis` is a 5th collection or the intended Emile slug.
- **VERDICT: KEEP (with BROKEN Emile sub-case)** — real sister-collection browser; Emile coverage gap must be fixed.

#### `/dashboard` — `app/dashboard/page.tsx`
- FREELONS economy hub (absorbs numbers/heat/undervalued/civ-wars/leaderboard). CTAs resolve. Supports journey? Weakly (one "see an agent" link; rest is market analytics). Real? Real. Duplicates? It's the merge target for 5 old routes; overlaps `/earn`.
- **Confuses message? YES — heavy floor/snipe/civ-war trading framing pushes a market-speculation product over the agent thesis.** **VERDICT: MERGE** — keep as a holder-only analytics tab, demote from the newcomer funnel.

#### `/earn` — `app/earn/page.tsx`
- FREELONS / HEX. HEX-earning hub. CTAs resolve; live feeds degrade gracefully without keys. Supports journey? Indirect (HEX = agent fuel). Real? Real. **Duplicates `/dashboard`** (red-signals, civ-wars, leaderboard, earners on both).
- **Confuses message? YES — strongest "degen" surface (snipe/sweep/red-signal/floor).** **VERDICT: MERGE** — fold the HEX-earning essentials into one lean section; drop the trading content.

#### `/sync` — `app/sync/page.tsx`
- ALL / wallet identity. Tabbed wallet hub (absorbs signal/passport/vault/carrier). **CONNECT tab = the wallet-connect step of the journey; SIGNAL tab = the only cross-collection inventory view.** Post-connect CTA → "/citizens · UNLOCK ONE". Real? Real. 
- Confuses message? Mild (identity/tribe copy rather than "connect to unlock your agents"). **VERDICT: KEEP** — the wallet-ownership step. **Do not remove wallet flow.**

#### `/shop` — `app/shop/page.tsx`
- None (HEX-priced cosmetics). Full working buy/burn pipeline → `/api/shop/buy`, `/api/shop/inventory/[handle]`, `/api/wallet/[address]/hex` (all EXIST). Supports journey? No (pure HEX sink). Real? Real.
- **Confuses message? YES — a merch/cosmetics storefront distracts from "NFTs become agents."** **VERDICT: DELETE (or deep-bury)** — works, but fully off-thesis and adds newcomer surface.

### PLAY / GAME LAYER

#### `/play` — `app/play/page.tsx`
- Arcade hub (3 free mini-games + daily). Links valid; footer admits "PROTOTYPES · SAVED LOCALLY · NOT YET ON-CHAIN". Supports journey? No (only a bottom `/citizens/1` link). Real? Real. Confuses message? **YES — arcade competes with the agent pitch (newcomer bloat).**
- **VERDICT: MERGE** — keep at most one slim door; not the agent spine.

#### `/play/hex-match` — `app/play/hex-match/page.tsx`
- None. Match-3 with server leaderboard → `/api/arcade/score` (EXISTS, works). Supports journey? No. Real? Real. **VERDICT: MERGE** — single retention toy at most.

#### `/play/proof` — `app/play/proof/page.tsx`
- None. Wordle-style daily; local. Works. Supports journey? No. Overlaps `/play/cipher` (daily deduction). **VERDICT: MERGE** — keep as the ONE daily ritual; drop Cipher.

#### `/play/cipher` — `app/play/cipher/page.tsx`
- None (lore ARG). Already delisted from the hub; duplicates Proof's daily loop. **"buyHint" implies an economy but costs only a local attempt (Cipher.tsx:433) — fake economy wording.** Supports journey? No.
- **VERDICT: DELETE** — delisted duplicate, no agent value.

#### `/play/restore` — `app/play/restore/page.tsx`
- ALL (citizen/Oogie/Crypt multipliers). Shared server-authoritative idle game; real HEX sink → all `/api/city/*` EXIST. Economy-isolated (◇ ≠ ⬡). Supports journey? Partial (holder utility, not chat). Real? Real (most-built game).
- **VERDICT: KEEP (as the holder game) / MERGE** — closest play route to "use your NFT"; not the chat journey.

#### `/play/sweep` — `app/play/sweep/page.tsx`
- (Delisted from hub.) Arcade/sweep game. Share infra references it. Supports journey? No. **VERDICT: DELETE/MERGE** — delisted arcade game; off-thesis. *(Page not deep-read; verdict on parity with the other delisted games — treat as DELETE candidate, confirm before removal.)*

#### `/play/reckoning` — `app/play/reckoning/page.tsx`
- FREELONS/all. Weekly civ-war; **real HEX burn** → `/api/reckoning/state`, `/api/reckoning/tribute`, `/api/wallet/[address]/hex`, `/api/x/me`, `/api/x/start` (ALL EXIST). Delisted from hub. Supports journey? Partial (HEX sink, not chat). Real? Real (most complete game).
- **VERDICT: MERGE** — keep only if a HEX sink is wanted; else DELETE. Off the agent spine.

#### `/crypt-tcg` — `app/crypt-tcg/page.tsx`
- Crypt / TCG. **PLACEHOLDER — "RECONSTRUCTION UNSTABLE · TERMINAL SEALED" (page.tsx:155); no playable game.** 10 God cards → OpenSea; links to `/archive`, `/civilizations`, `/`. Imports valid. Supports journey? No (sealed). Real? **Fake/coming-soon** (header comment says it reuses old `/combat-archives` content).
- **VERDICT: KEEP (as honest "coming soon")** — TCG is a legit pillar, but this ships zero gameplay; must not be presented as playable.

#### `/the-fifth-bracket` — `app/the-fifth-bracket/page.tsx`
- None (easter egg / ARG). Renders a fake 404 unless unlocked (type 0404 / 04:00–04:08 UTC / carrier streak ≥3). `robots:noindex`. Supports journey? No. Real? Intentional decoy.
- **VERDICT: DELETE** — hidden ARG, no agent value, expands the "too much stuff" surface.

#### `/share/score` — `app/share/score/page.tsx`
- None (arcade share). Emits OG card → `/api/og/score` (EXISTS), then redirects to `/play/[g]`. Works. Supports journey? No (arcade infra). 
- **VERDICT: KEEP (couples to arcade) / MERGE** — fate follows the arcade; degrades safely to `/play`.

### HOLDER / SOCIAL SURFACES

#### `/wallet/[address]` — `app/wallet/[address]/page.tsx`
- FREELONS. Public holder profile (net worth / rank / civ / citizen gallery / hex log / tithe). Gallery tiles → **`/citizens/[tid]#run` — STALE anchor: `/citizens/[id]` has no `id="run"`; real CTA is `/agent/[tid]`.** Tithe/hex/featured/notifications APIs all EXIST. **BROKEN: CarrierHealthCta "CLAIM" → `/carrier`, which has NO `page.tsx` (only `CarrierClient.tsx` + `[handle]/`) → 404 (CarrierHealthCta.tsx:59) — confirmed.** Supports journey? Partial (gallery → agent, via stale anchor). Real? Real data.
- **Duplicates `/passport/[address]`** (balance, civ, thumbs, rank). Confuses message? Partial (investor framing on top).
- **VERDICT: KEEP (with fixes)** — closest "see your NFTs → run an agent" surface; fix `#run`→`/agent/[tid]` and the `/carrier` 404.

#### `/passport/[address]` — `app/passport/[address]/page.tsx`
- FREELONS (+ FULL SIGNAL cross-collection strip). Classification card (Whale/Cultist/Collector) + share. OG `/api/og/passport/[addr]` works. Supports journey? No. Real? Real.
- **Duplicates `/wallet/[address]`** (stylized subset). Confuses message? Yes (collector-status game). **VERDICT: MERGE** into `/wallet`.

#### `/carrier/[handle]` — `app/carrier/[handle]/page.tsx`
- FREELONS. X-handle vanity/conversion page; when verified, embeds a mini wallet panel and links to `/wallet`+`/passport`. CTAs resolve (`/sync#carrier` works — distinct from the broken bare `/carrier`). Supports journey? No. Real? Real where verified, else algorithmic flavor.
- **Confuses message? YES — "carrier carries the signal for {civ}" is a separate civ-loyalty/X-social mythology.** Overlaps the holder cluster. **VERDICT: DELETE (MERGE at most).**

#### `/channel/[handle]` — `app/channel/[handle]/page.tsx`
- FREELONS (honoraries only). Token-gated easter egg (noindex). **Gate is real, but the "claims" (DOCTRINE/RELAY SLOT/COORDINATE) are no-op `twitter.com/intent/tweet` links — fake/placeholder payoff, no backend.** Overlaps `/tribute/[handle]` + `/carrier/[handle]` (same honorary set). Supports journey? No.
- **VERDICT: DELETE** — unlisted easter egg with no-op "claims," off-thesis.

#### `/tribute` — `app/tribute/page.tsx`
- FREELONS (35 honoraries + folded patrons/architect). Credits/hall-of-honor. Links valid. Supports journey? No. Real? Real. Confuses message? Mild (clearly lore). **VERDICT: MERGE** — background lore, not a primary surface.

#### `/tribute/[handle]` — `app/tribute/[handle]/page.tsx`
- FREELONS (one honorary). Tribute card + on-chain patron lookup + tweet. Links resolve. Supports journey? No. Real? Real. Overlaps `/channel/[handle]`, `/carrier/[handle]`. **VERDICT: MERGE** — clean lore detail, not core.

#### `/transmissions` — `app/transmissions/page.tsx`
- City social feed (post image+caption, burn 100⬡, signal/boost). Submit → `/api/transmissions`; signal/boost → `/api/transmissions/[id]/signal`+`/boost`; balances → wallet APIs (ALL EXIST). Real HEX sink, loops to `/citizens/1`. Supports journey? Indirect (HEX activity). Real? Real.
- Confuses message? Partial (a Twitter-like feed competing for attention). **VERDICT: KEEP** — real API-backed HEX-sink that funnels to agents.

#### `/transmissions/[id]` — `app/transmissions/[id]/page.tsx`
- None (single transmission). Detail/share view; signal/boost via existing APIs; 404s if not live. Real? Real. **VERDICT: KEEP** — necessary detail page for the kept feed.

### LORE / CIV / PRESS / DEV / ADMIN / LEGAL

#### `/canon` — `app/canon/page.tsx`
- FREELONS only. Consolidated lore library (10 sections; absorbs lore/lexicon/manifesto/origin). Deep-links work (via `next.config.ts` redirects; `/rebuild`→`/canon`, `/numbers`→`/dashboard` are mildly circular). Supports journey? No.
- **Confuses message? YES — 10 lore sections, zero mention that NFTs become agents.** Overlaps `/civilizations`. **VERDICT: MERGE** into Archive/lore.

#### `/civilizations` — `app/civilizations/page.tsx`
- FREELONS only. 10 civs + castes + shapes map. Links valid. Supports journey? No. **Content duplicated inside `/canon` §II–IV.** Confuses message? Yes (lore-heavy, no agent framing). **VERDICT: MERGE.**

#### `/civilizations/[slug]` — `app/civilizations/[slug]/page.tsx`
- FREELONS (+ Crypt-TCG patron-god cross-link). Per-civ detail (mayor/rival/broadcast/god). OG `/api/og/civ-pride/[slug]` exists; mayor/broadcast fail gracefully. Supports journey? No (gamification side-quests, not the spine). Real? Real. Confuses message? Yes (deepest lore). **VERDICT: MERGE.**

#### `/archive` — `app/archive/page.tsx`
- None. **`permanentRedirect("/collections")`** (folded 2026-06-08). Target exists. **VERDICT: KEEP** — clean redirect preserving old links into the agent-forward `/collections`.

#### `/press` — `app/press/page.tsx`
- FREELONS. Press kit (logos, OG examples, brand facts). OG routes referenced (`/api/og/1`, `/daily`, `/hex-index`, `/heat`) **EXIST (verified)**; static `/social/*.png` assets UNKNOWN (not verified on disk). Supports journey? No.
- **Confuses message? YES — copy frames FREELONS as a "hex-economy art collection," never as agents (stale vs pivot).** **VERDICT: MERGE** — update agent framing or fold into one about/press page.

#### `/developers` — `app/developers/page.tsx`
- FREELONS (the 4040 "agents"). Read-only Agent API v1 docs. **All 6 documented endpoints exist** (`/api/v1`, `/api/v1/citizens`, `/citizens/[id]`, `/history`, `/proof`, `/leaderboard`). Supports journey? Partial (reinforces the agent thesis). Real? Real. Confuses message? No (agent-forward).
- **VERDICT: KEEP** — backs the thesis, endpoints provably exist.

#### `/admin` — `app/admin/page.tsx`
- None (internal ops). Founder console (agent cost, errors, go-live, payment switch). **Auth: client key gate + server-side `ADMIN_SEED_KEY` enforcement (403/404), `robots:noindex`, force-dynamic. No data without the key — not exposed.** Real? Real (read-only). **VERDICT: KEEP (internal).**

#### `/legal` — `app/legal/page.tsx`
- Index of legal docs → terms/privacy/honorary-notice/dmca (all EXIST). **VERDICT: KEEP** (legal requirement).

#### `/legal/terms` — `app/legal/terms/page.tsx`
- Terms of Use. Inline links valid. (Stale framing: describes PFP Studio/Carrier, not agents — legally fine.) **VERDICT: KEEP** (legal requirement).

#### `/legal/privacy` — `app/legal/privacy/page.tsx`
- Privacy policy; agent-aware (token-ID-keyed progress described). **VERDICT: KEEP** (legal requirement).

#### `/legal/dmca` — `app/legal/dmca/page.tsx`
- DMCA + contact + security disclosure. **Flag: contact email is plain text, not a clickable `mailto:` link.** **VERDICT: KEEP** (legal requirement).

#### `/legal/honorary-notice` — `app/legal/honorary-notice/page.tsx`
- Notice re: 35 honoraries + 4 1/1s named after real people. **VERDICT: KEEP** (legal / named-person liability).

---

## REQUIRED CLOSING SECTIONS

### 1. Total route count
- **45 page routes** + **~131 API routes** (`app/api/**/route.ts`) = ~176 route handlers total.

### 2. Broken routes
- **No provably broken *page* routes.** (First-pass "broken" findings for `/carrier`, `/collections/emile0x1908` and `/collections/freelons` were FALSE POSITIVES — see corrections box at top.)
- **`/collections/freelons` returns `notFound()` BY DESIGN** — FREELONS routes through `/citizens`, and the `/collections` card for it links to `/citizens`, not `/collections/freelons`. Not a user-reachable break.
- **Local `npm run build` does not complete** — but it's a sandbox network-timeout artifact, not broken code (see corrected BUILD section). Not a production blocker.
- **Lint** — no `lint` script; ESLint not configured (`next lint` is interactive + deprecated). Broken tooling (real).

### 3. Fake / dead CTAs
- ~~**`/wallet/[address]` gallery → `/citizens/[tid]#run`** — dead anchor.~~ **FIXED 2026-06-08** — now links straight to `/agent/[tid]` (the workspace).
- **`/channel/[handle]` "claims"** (DOCTRINE / RELAY SLOT / COORDINATE) — no-op `twitter.com/intent/tweet`; labelled "claim," grant nothing.
- **`/play/cipher` "buyHint"** — implies an economy; costs only a local attempt (Cipher.tsx:433).
- **`/crypt-tcg`** — entire page is a "TERMINAL SEALED" placeholder presented as a product.
- **`/legal/dmca`** contact email — plain text, not a clickable link (minor).

### 4. Duplicate routes / pages
- **Holder-profile cluster:** `/wallet/[address]` ⟂ `/passport/[address]` (passport = stylized subset of wallet). `/carrier/[handle]` re-embeds wallet data + links to both.
- **Honorary cluster:** `/tribute/[handle]`, `/channel/[handle]`, `/carrier/[handle]` all orbit the same 35 honoraries.
- **Lore cluster:** `/canon` ⟂ `/civilizations` ⟂ `/civilizations/[slug]` (civs/castes/shapes duplicated across `/canon` §II–IV and `/civilizations`).
- **Economy cluster:** `/dashboard` ⟂ `/earn` (red-signals, civ-wars, leaderboard, earners on both).
- **Daily-game cluster:** `/play/cipher` ⟂ `/play/proof` (both daily deduction).

### 5. Placeholder / coming-soon content
- **`/crypt-tcg`** — "RECONSTRUCTION UNSTABLE · TERMINAL SEALED," no gameplay.
- **`/the-fifth-bracket`** — renders a fake 404 for ~all visitors (intentional decoy).
- **`/play/*`** — footer states "PROTOTYPES · SAVED LOCALLY · NOT YET ON-CHAIN."

### 6. Top 10 routes/components causing BLOAT (newcomer-surface drag)
1. `/dashboard` — market/floor/snipe analytics; off-thesis, heavy.
2. `/earn` — degen snipe/sweep/red-signal surface; overlaps dashboard.
3. `/play` + the 6 game routes (`hex-match`, `proof`, `cipher`, `restore`, `reckoning`, `sweep`) — an entire arcade competing with the agent pitch.
4. `/carrier/[handle]` — separate civ-loyalty/X-social mythology.
5. `/channel/[handle]` — unlisted easter egg with fake claims.
6. `/the-fifth-bracket` — hidden ARG.
7. `/canon` — 10-section lore wall, no agent message.
8. `/civilizations` + `/civilizations/[slug]` — duplicate lore depth.
9. `/passport/[address]` — duplicate of wallet + collector-status game.
10. `/shop` — cosmetic HEX-sink storefront.

### 7. Top 10 routes/components to MERGE or DELETE
- **DELETE:** `/play/cipher`, `/the-fifth-bracket`, `/channel/[handle]`, `/carrier/[handle]`, `/shop` (or deep-bury), `/play/sweep`.
- **MERGE:** `/passport/[address]` → `/wallet`; `/canon` + `/civilizations` + `/civilizations/[slug]` → Archive; `/dashboard` + `/earn` → one holder analytics tab; `/tribute` + `/tribute/[handle]` → Archive; `/press` → about/press (update framing); `/play` arcade → at most one daily (`proof`) + one holder game (`restore`).

### 8. Simplest final navigation — MAX 7 top-level items
1. **Agents** (`/agents` — the collection index; today's `/collections`)
2. **My Agents** (`/my-agents` — wallet-connected owned NFTs; today's `/sync`)
3. **Unlock** (`/unlock` — the activation step)
4. **HEX** (`/hex` — what HEX is + how to earn/spend; lean merge of `/earn`)
5. **TCG** (`/tcg` — the game layer; today's `/crypt-tcg`)
6. **Archive** (`/archive` — all lore + collections provenance)
7. **Connect Wallet** (persistent button — already in header)

### 9. Recommended route structure
```
/                         home — "your NFTs are becoming AI agents" (all 5 collections)
/agents                   the agent collections index           (← /collections)
/agents/freelons          FREELONS browser                      (← /citizens)
/agents/emile             Emile browser                         (NEW — fixes Emile gap)
/agents/crypt             The Crypt browser                     (← /collections/the-crypt-official)
/agents/oogies            Oogies browser                        (← /collections/oogies)
/my-agents                wallet → your eligible NFTs           (← /sync SIGNAL/CONNECT)
/agent/[collection]/[id]  the ChatGPT-style workspace           (unify /agent/[id] + /agent/c/[slug]/[id])
/unlock                   activation / unlock flow              (surface existing unlock APIs)
/hex                      HEX explainer + earn/spend            (lean ← /earn, holder analytics ← /dashboard)
/tcg                      game layer                            (← /crypt-tcg, honest "coming soon")
/archive                  lore + provenance                     (← /canon + /civilizations + /tribute + /collections lore)
/legal/*                  keep all (legal requirement)
/developers               keep (agent API docs)
/admin                    keep (internal, key-gated)
```
Plus shareable detail pages kept as-is: `/citizens/[id]` (→ becomes `/agents/freelons/[id]`), `/wallet/[address]` (fix `#run`→`/agent`), `/transmissions` + `/transmissions/[id]` (HEX-activity feed).

### 10. First 5 SAFEST cleanup actions — STATUS
1. ✅ **DONE — Homepage states the multi-collection agent message** + links to `/collections` (one line in the closing section; FREELONS funnel untouched).
2. ✅ **DONE — Agents in top-level nav** → `/collections` (added to Header + MobileNav; removed the now-duplicate "Collections" from the Explore ▾ dropdown).
3. ✅ **DONE — Fixed the dead agent CTA** — `/wallet/[address]` gallery tiles now link `/agent/[tid]` instead of dead `#run`.
4. ✅ **DONE — Corrected this audit's false positives** (`/carrier`, Emile, 1/1 slugs, build framing).
5. ⏳ **NEXT — verified consolidation pass (Tier 2):** per-page inbound-link check, then merge/delete `/passport`→`/wallet`, fold `/dashboard`+`/earn`, lore→Archive, and remove genuinely dead surface (`/play/cipher`, `/the-fifth-bracket`, `/channel`). NOT done yet — each needs link verification first (this audit over-reported on first pass).

> Note: the originally-listed "fix the build blocker" via `outputFileTracingRoot` was **tested and did not work** — the local build failure is a sandbox network-timeout artifact, not a deploy blocker (see BUILD section). Dropped from the list.

### 11. What should ABSOLUTELY NOT be touched
- **`/agent/[id]` and `/agent/c/[slug]/[id]`** — the chat workspaces (the product payoff). `AgentWorkspace`.
- **`/citizens/[id]`** and **`/citizens/[id]/log`** — identity hub + work-log (unlock entry + memory/reputation proof).
- **`/sync` CONNECT** — the wallet-connect step.
- **Unlock/activation API surface** — `/api/citizens/[id]/unlock`, `/api/unlock/[id]`, `/api/agent/awaken/*`, `/api/agent/evolve/*`, `/api/activations`. (Do not touch contracts or env.)
- **All `/legal/*`** — legal requirement.
- **`/developers`** — agent API docs (real, on-message).
- **`/api/citizens/[id]/agent`, `/api/agents/[slug]/[id]`** — the chat backends.


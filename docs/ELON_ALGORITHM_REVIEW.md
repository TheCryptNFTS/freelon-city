# FREELON CITY — The Algorithm Review

> Musk's 5-step algorithm applied to the **entire** product: 54 city pages · 125 API routes · 7 crons · 22 OG cards · 8 games (7 mini + the Crypt TCG, ~25 screens / ~52 engine files) · the HEX economy · the design system (~8,720-line globals.css) · the auto-post machine.
> **Review only — nothing has been changed.** 20-agent pass + adversarial critic + refinement loop, then balanced across every cluster.
> The algorithm, in order: **1) make requirements less dumb · 2) delete · 3) simplify · 4) accelerate · 5) automate.** A step done before the ones above it is wasted. If you're not adding ~10% back, you didn't delete enough.

---

## NORTH STAR (the single dumbest requirement)

**Every surface tries to be three products at once — a cold-stranger pitch, a holder dashboard, and a lore artifact — and that split is the root of almost everything below.** A cold X visitor decides in ~3 seconds. Today, before they reach the h1+CTA they get cinematic motion, a "scanning" identity pill that renders nothing for them, an 8-phase memory-proof game, and a brand whose load-bearing motif is literally the word that means *dead link* (**404**). Give the public path **one job** (one click into `/demo`), move holder identity to **one** surface, keep lore as an **interior reward** — and delete the redundant surfaces outright instead of A/B-testing pages already proven redundant.

---

## THE 6 CROSS-CUTTING WALLS (these matter more than any single page)

1. **Duplicate entry/identity surfaces everywhere.** Homepage vs `/start` (same pitch twice). Four holder identities: `/dashboard` · `/my-citizens` · `/wallet/[address]` · `/passport/[address]`. `/demo` vs the chat on `/agent/[id]`. v1 API vs current API. The habit is *spawn a new surface instead of fixing the old one.* Pick ONE canonical surface per job; redirect the rest with the proven `/archive→/collections` 11-line pattern.
2. **Lore-over-clarity, site-wide.** The 404 motif, "THE HEX VANISHED," "civilization," "awaken," "carrier of the week," "the fifth bracket," "tribute" — a cold buyer must decode a private mythology before they grasp *"own and train an AI character."* Your own core holders called the site a **"mind field."** Lore is a reward for people already inside, never the cold pitch.
3. **CTA soup + destination sprawl.** 9 OWN/MEET buttons on the homepage; 54 pages with no single primary path. Too many doors, no clear next action — at page level *and* product level.
4. **Premature enterprise scale for a solo, pre-PMF founder.** v1 "legacy" API, `/developers` (311 lines), 7 crons, 8 games, 22 OG cards, and a proposed automation roadmap (Percy, PagerDuty, canary deploys, ad-retargeting). Built as if there's a team and traction that isn't here yet. **The bottleneck is distribution, not infrastructure.**
5. **A/B-test-as-procrastination.** Deletions get gated behind flags + 2-week tests there isn't traffic to power — flags become permanent dead config (you've already had a "refinedAway = dead code" incident). Delete decisively; reserve A/B for genuinely uncertain calls.
6. **Optimizing things that should not exist.** The classic smart-engineer error shows up as caching/animating/abstracting pages and features that step 2 says to delete.

---

## RANKED MOVES — whole product, by leverage

`[step | impact/effort]`

### Tier 1 — do first (high impact, small/medium effort)
1. `[1·H/S]` **Kill the "404 = dead" signal on every cold surface** — browser `<title>` `404 — FREELON CITY…` → `FREELON CITY — a living AI civilization`; drop `#404HEXNOTFOUND` from share hashtags. Keep 404 as an **interior** easter egg only.
2. `[2·H/S]` **Delete `/start`** (355 lines) → 11-line `permanentRedirect('/help')`. It's the homepage pitch restated; its own comment admits the useful content already moved to `/help`.
3. `[2·H/M]` **Strip the cold homepage to copy-first** — delete HeroAtmosphere (pre-pitch motion), MemoryProof (move to `/demo`), the IdentityGreeting "scanning" pill, and YourAgentsRail (render nothing for anon). Hero = h1 + one subline + 2 CTAs.
4. `[2·H/M]` **Collapse 4 holder surfaces → 1 `/profile`** — fold `/passport` and `/my-citizens` into `/wallet/[address]` (rename `/profile/[address]`); keep `/dashboard` strictly as city-wide stats. Passport keeps classification tier + set chips only; ArtefactGallery lives in ONE place.
5. `[2·H/S]` **Delete `CitizenAgentDashboard.tsx`** (1,333 lines, orphaned, superseded by AgentWorkspace) after confirming no imports.
6. `[3·H/S]` **Crypt TCG time-to-first-win** — tutorial opponent 8→6 HP; pre-populate the deck builder with the working starter deck ("Use this deck / Customize"); auto-keep mulligan on Easy. Directly answers "the app's too complex."
7. `[3·H/S]` **Crypt TCG glossary 25→5** — keep only core keywords in `/help`; the other ~9–20 stay tooltip-only. Hide faction-threshold rules behind "Advanced Tactics."
8. `[2·H/S]` **Delete the dead mini-games** — Cipher (≈0 DAU), Sweep (0 leaderboard entries); move Guard to `/events/guard` (it's a marketing spectacle, not arcade). 8 games → 3 that earn maintenance.

### Tier 2 — high value, contained
9. `[2·H/M]` **Auto-posts: 6 → 2 spectacle + 1 rotating feed**, and strip lore from the *brand* templates (split `lib/share.ts` → `share-holder.ts` keeps the poetry, `share-brand.ts` is 5 lean product-first posts). 66% fewer posts, each carrying a real CTA — stop burning @4040hex on impression-farming.
10. `[3·H/M]` **Cut globals.css ~8,720 → ~3,500** — move ~16 decorative `@keyframes` to component `.module.css`, unify the scroll-reveal pattern (delete the duplicate), drop the CSS animation-tax on 50 non-hero pages.
11. `[2·M/S]` **Delete global listeners** — `EasterEggCode`, `Ghost404`, `Spotlight` mount on all 54 pages; load per-page (hero pages only). Saves JS + interval polling on every route.
12. `[1·H/S]` **"FREELONS is THE agent; the others are chat-only lore."** Make `/demo` FREELONS-only (hide the sister-collection picker), lock sister agents to chat (delete unlock/mission/progression plumbing). Kills the "every collection is an agent" dilution.
13. `[3·M/S]` **Economy clarity** — flatten unlock to a flat `2500⬡` (delete per-citizen pricing), gate the daily claim to owners only, delete the phantom "0.1⬡/day passive holding" from `/earn` copy, and add a `/unlock/success` page that shows the ETH→HEX math ("you paid X, you owe Y, ~3 weeks at your rate").
14. `[2·M/S]` **Delete `/api/v1/*`** (7 legacy routes) unless a named partner depends on it.
15. `[3·M/M]` **Consolidate `/api/wallet/[address]/*`** (9 sub-endpoints) into one parametric endpoint; collapse the homepage's 4-call wallet waterfall into it.
16. `[3·M/S]` **Reframe the six collections** as "FREELONS + companions," not six equal peers — answers "why should I care about six collections" and demotes the universe lore to supporting story.

### Tier 3 — accelerate / automate (only after the cuts)
17. `[4·M/M]` **Lazy-load below-fold homepage sections** (CitizenMosaic, TransformsWall) + defer/`useInView` wallet fetches + `prefetch` `/demo` on the primary CTA. Target hero→close in <2 desktop scrolls.
18. `[4·H/S]` **Event-driven crons** — `match-sweep` (10 min) + `sweep-bounty` (15 min) polling → Redis-stream triggers; latency 10 min → ~1 s, server load −90%. Also: there's an **orphaned `carrier-of-week` cron** in code but not in `vercel.json` — wire or delete it.
19. `[4·M/M]` **Pre-compute collection facets at ingest** (don't rebuild O(n) per render) and cache the cross-collection "Full Signal" scan via a daily cron (passport <100 ms vs 6 live calls).
20. `[5·H/S]` **Wire ONLY the funnel events** that judge these cuts: `home_view → meet_citizen_click → demo_view → demo_start → opensea_click`. Baseline before shipping. **Delete ~90% of the proposed automation** (Percy, axe CI, bundlesize gates, canary+auto-rollback, Hotjar, PostHog, PagerDuty, ad-retargeting) — enterprise cargo-cult for a pre-PMF solo founder.
21. `[5·M/S]` **Unify admin seed endpoints** (`seed-demo|showcase|transform`) → one `POST /api/admin/seed?type=` (kills 3 near-identical handlers); implement the missing `reply-engagement` cron (real economy gap, TODO in code).
22. `[3·M/S]` **Collapse the 6 agent ability types → 3** (Create / Analyze / Build) with sub-options — same mission depth, half the top-level UI.
23. `[3·M/S]` **Unify nav** — Header + MobileNav + BottomNav → one responsive `NavBar`.
24. `[1·M/S]` **Move heavy lore off cold paths** — `/canon` (541 lines) and extended civ lore → `/help/advanced`; keep the homepage product-first.

---

## BOLDEST DELETES (high conviction)

- **`/start`** → redirect `/help`.
- **HeroAtmosphere + MemoryProof + IdentityGreeting-pill + YourAgentsRail** off the cold homepage.
- **`/passport` + `/my-citizens`** as routes → fold into one `/profile`.
- **`CitizenAgentDashboard.tsx`** (1,333 lines, orphaned).
- **Cipher + Sweep** mini-games (dead); **Guard** → `/events`.
- **`/api/v1/*`** (legacy).
- **~90% of the proposed automation roadmap.**
- **Sister-collection agent progression** (unlock/mission/thread-sync) → chat-only.

**The 10% to add back so this isn't reckless:** one hero-sized citizen portrait grounding the homepage; a single `/demo` text proof-link replacing MemoryProof; `/help/advanced` to home the relocated lore; coaching one-liners on `/demo` and TransformsWall; reserved whitespace where self-hiding sections used to sit (no layout shift).

---

## KEEP — already Elon-standard, do NOT break

- **`/demo` 5-free-turns, no-wallet** — the single best cold hook. Keep the meter, keep FREELON default-selected.
- **The OG/Twitter share title** — already fixed to "FREELON CITY — a living AI civilization" (404 deliberately stripped from share titles). Don't regress.
- **The `/archive → /collections` 11-line redirect pattern** — reuse it verbatim for the deletions; don't invent a new mechanism.
- **Self-hiding empty states** (CityWeekBand / CitizenMosaic / TransformsWall / CityPulse render null when empty) — keep; just reserve whitespace.
- **`unstable_cache` revalidate-600 discipline** — replicate it for the other fetches, don't remove it.
- **Economy isolation — HEX is sink-only into the game; nothing sources it.** This is *physics* here. No move above touches it.
- **The 404 / HEX-VANISHED canon as an INTERIOR easter egg** (`/the-fifth-bracket` already `index:false`, agent #0404, Ghost404, CYCLE 0404) — it rewards people already inside. Forbid 404 ONLY where it renders to a non-connected stranger.

---

## PER-CLUSTER VERDICTS

| Cluster | Verdict | Top move |
|---|---|---|
| **Landing / cold visitor** | Three products in one; ceremony before clarity | Copy-first hero; delete `/start`, HeroAtmosphere, MemoryProof; fix the 404 title |
| **Six collections / universe** | Lore presented as load-bearing; it's supporting story | Reframe "FREELONS + companions"; delete `ArchiveRole`; pre-compute facets |
| **Citizens & agents** | Two agent surfaces, premise over-extended | Delete CitizenAgentDashboard; FREELONS-only demo; sisters chat-only; abilities 6→3 |
| **Mini-games (×7)** | Mostly dead/invisible prototypes | Delete Cipher+Sweep; Guard→/events; Proof one-mode; honest Restore copy |
| **Crypt TCG** | Too steep to learn fast | 8→6 HP tutorial; glossary 25→5; pre-pop deck; hide thresholds; auto-mulligan Easy |
| **HEX economy** | Mental model too branchy | Flat 2500 unlock; owner-gated daily claim; delete phantom passive income; ETH→HEX success page |
| **Holder tools** | 4 overlapping identity surfaces | Collapse to one `/profile`; ArtefactGallery in one place; split `/sync` into entry vs tools |
| **Content / lore / posts** | Volume hides the product; posts impression-farm | 6 posts→2+1; strip lore from brand voice; move `/canon` off cold path |
| **Visual / layout / motion** | Decoration tax on every page | globals.css 8,720→3,500; kill global listeners; unify nav; hex avatar ≥64px only |
| **Backend / API / automation** | Sprawl + premature scale | Delete v1; consolidate wallet/*; event-driven crons; delete 90% of proposed automation |

---

## Coverage + the next loop
Covered: all 10 clusters (every page group, the full game, the economy, the design system, the post machine, the API surface). **Lighter touch** (worth a focused follow-up pass if you want): the 6 `/legal` sub-pages (per-mini-game rules pages are themselves a complexity smell), and an audit of which of the **22 OG cards** are actually linked vs dead (`floor-history`, `rivalry/*`, `propaganda/*`, `heat`, `sweep-burst` are candidates).

**Nothing here is built.** Tell me which tier (or which cluster) to execute first and I'll do it for real — or point me at a section to loop harder on before any code moves.

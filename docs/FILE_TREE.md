# FREELON CITY · Complete File Tree (2026-05-25)

342 source files across `app/` `components/` `lib/` `data/` `docs/`
`public/`. Grouped by purpose with a one-line description per file.

Generated after the universe-hub framing landed (PR #9, #10, #11).

---

## 1 · app/ — Next.js 15 App Router routes

### Core pages (visitor-facing)

| Route | File | What it is |
|---|---|---|
| `/` | `app/page.tsx` | Homepage. Hero → DoThisNow → GoodValueToSweep → OtherSignalsStrip → HoldTheLineBanner → CityTerminal → Why Freelon → CivWarBoard → Signal Check → One-of-Ones → Civilizations → Honorees → Featured citizens → TopPatrons → RecentTransmissions → ENTER CTA → On-chain trinity. 16 sections post-Phase 3. |
| `/start` | `app/start/page.tsx` | Dummies guide. Munch's onboarding spec — 4040 supply, what's free, what costs, how to earn. |
| `/sync` | `app/sync/page.tsx` + `WalletScanner.tsx` | Paste any address/ENS/X handle. Returns passport. |
| `/numbers` (Pulse) | `app/numbers/page.tsx` | Live city pulse. Market cap hero + CITY STATE pill + all receipts. |
| `/dashboard` | `app/dashboard/page.tsx` | The Numbers · holder distribution + civ value + hex index + city stats + red signals + heat grid + sales feed + top-citizens-by-value + share CTAs. |
| `/citizens` | `app/citizens/page.tsx` + `CitizensBrowser.tsx` | 4040 grid with chip filters (civ/tier/shape/caste/aura/rarity). Curated 1/1s → Honoraries → Legendaries above browser. |
| `/citizens/[id]` | `app/citizens/[id]/page.tsx` | Single citizen. Image + traits + scarcity + VALUE card (+ tier + age) + naming + realign + CTAs. |
| `/citizens/[id]/card` | `app/citizens/[id]/card/page.tsx` | Shareable listing card preview page. |
| `/civilizations` | `app/civilizations/page.tsx` | Grid of 10 civs. |
| `/civilizations/[slug]` | `app/civilizations/[slug]/page.tsx` | Civ detail page. Banner + glyph + doctrine + mayor + broadcast + rivalry + featured citizens + share. |
| `/canon` | `app/canon/page.tsx` | 7-tab lore library. Only first tab open by default. |
| `/secrets` | `app/secrets/page.tsx` + `SecretsClient.tsx` | 5 hidden secrets. Quest-like. |
| `/archive` | `app/archive/page.tsx` | **Other Signals** — 6 recovered transmission cards (Crypt / Combat Archives / OOGIES / Emile / SMILES Collapse / 404 HEX ROOT) with OpenSea outbound links + ONE ARCHITECT provenance footer. |
| `/combat-archives` | `app/combat-archives/page.tsx` | TCG lore placeholder — RECONSTRUCTION UNSTABLE · TERMINAL SEALED. 4 fragment cards. |
| `/wallet/[address]` | `app/wallet/[address]/page.tsx` | Public wallet profile. Hero + stats + carrier-health pill + notif inbox + featured citizen picker + earnings log + tithe + civ alignment + gallery. |
| `/passport/[address]` | `app/passport/[address]/page.tsx` | Classified wallet passport (tier · rank · holdings · streak). |
| `/wallet/[address]/featured` (API) | `app/api/wallet/[address]/featured/route.ts` | GET/POST featured citizen picker. POST gated by x-session bound to wallet + ownership-checked. |
| `/carrier` | `app/carrier/page.tsx` + `CarrierClient.tsx` | Carrier dashboard. Daily claim card → inbox → mission → handle switcher → holder banner → my-invites → rank card → tier ladder. |
| `/carrier/[handle]` | `app/carrier/[handle]/page.tsx` | Public carrier profile. |
| `/daily` | `app/daily/page.tsx` | Today's signal + claim button. |
| `/leaderboard` | `app/leaderboard/page.tsx` | Holder + hex leaderboard. |
| `/transmissions` | `app/transmissions/page.tsx` + `TransmissionCard.tsx` + `TransmissionSubmit.tsx` | Submit-form OPEN by default + grid of recent transmissions + boost flow. |
| `/transmissions/[id]` | `app/transmissions/[id]/page.tsx` | Single transmission detail. |
| `/relay` | `app/relay/page.tsx` | 10 ready-to-post X templates. Click → opens X intent with prefilled body. |
| `/civ-wars` | `app/civ-wars/page.tsx` | Rules-first → MyCivStandings → Podium (2fr/1fr dominant) → All standings (collapses to stack on mobile) → Next CTA. |
| `/hold-the-line` | `app/hold-the-line/page.tsx` + `HoldTheLineClient.tsx` | Defender bid wall mission. Page-visit tick (fires defender scan if >5min stale) → counters → 3 steps → bid tiers → claim form → recent sweepers → top defenders → why. |
| `/vault` | `app/vault/page.tsx` + `VaultClient.tsx` | Batch transfer. Connect → safety → select citizens → recipient → test send (gold SAFETY CHECK card) → transfer → progress. |
| `/graveyard` | `app/graveyard/page.tsx` | Transfer ledger + dump ledger. Mobile-stacks per Phase 2. |
| `/heat` | `app/heat/page.tsx` | Per-civ heat map. |
| `/undervalued` | `app/undervalued/page.tsx` | Listings ≤ floor (Red Signals deep view). |
| `/shop` | `app/shop/page.tsx` + `ShopGrid.tsx` | Hex sink shop. PROPERTY / LAND / WEAPONS / CLOTHES / ARTIFACTS / **ASCENSION** (new). Anon users see SYNC TO BUY. |
| `/earn` | `app/earn/page.tsx` | The Ledger — every way to earn + every way to burn. |
| `/pfp` | `app/pfp/page.tsx` | PFP studio (holder-gated). |
| `/tribute` | `app/tribute/page.tsx` + `[handle]/page.tsx` | 35 honorary tribute index + per-honoree page. |
| `/names` | `app/names/page.tsx` | Hall of named citizens. |
| `/patrons` | `app/patrons/page.tsx` | Top burn-spenders (7-day window). |
| `/architect` | `app/architect/page.tsx` | Static page about the architect role. |
| `/the-fifth-bracket` | `app/the-fifth-bracket/page.tsx` | Hidden lore page (5th bracket). |
| `/doppelganger` | `app/doppelganger/page.tsx` | Duplicate-trait pairs viewer. |
| `/regret` | `app/regret/page.tsx` | Top "wallets that sold a now-valuable citizen" page. |
| `/flex` | `app/flex/page.tsx` | Showcase your portfolio. |
| `/press` | `app/press/page.tsx` | Press kit. |
| `/roadmap` | `app/roadmap/page.tsx` | Public roadmap (no securities-language). |

### Lore pages

`app/origin/`, `app/lore/`, `app/manifesto/`, `app/rebuild/`, `app/castes/`, `app/shapes/`, `app/lexicon/` — all consolidated under `/canon` now but kept as deep-link anchors.

### Vanity routes (one-of-ones)

`app/origin-signal/`, `app/patient-zero/`, `app/genesis-hex/`, `app/the-final-signal/` — friendly URLs for the 4 one-of-ones (#1, #404, #1337, #4040).

### Legal

`app/legal/`, `app/legal/dmca/`, `app/legal/privacy/`, `app/legal/terms/`, `app/legal/honorary-notice/`.

---

## 2 · app/api/ — Route handlers

### Cron + autopost

| File | What it does |
|---|---|
| `api/cron/daily-signal/route.ts` | Daily 04:04 UTC X post. Picks deterministic Daily Signal line. |
| `api/cron/sweep-bounty/route.ts` | **Every 15 min on Vercel Pro.** Reads OpenSea sale events via `/v2/events/collection/freelons`. Per event: credits buyer (+25⬡), citizen ledger, sweeper store. Then runs notify scanner + sales-pulse + weekly-receipts + engagement scan + defender scan + sweep-burst. |

### Wallet + holdings

| File | What it does |
|---|---|
| `api/wallet/[address]/tokens/route.ts` | Returns `{ tokenIds, balance, truncated }`. Uses `getWalletTokens` (RPC fallback + paginated OpenSea backfill — fixes Peterhawk's 4-of-N bug). |
| `api/wallet/[address]/hex/route.ts` | Returns wallet hex balance + lifetime earned + last active day. Includes inline sweep credit. |
| `api/wallet/[address]/civs/route.ts` | Civ breakdown for a wallet. |
| `api/wallet/[address]/featured/route.ts` | **NEW.** GET/POST featured citizen. POST x-session-bound + ownership-checked. |

### Market / OpenSea

| File | What it does |
|---|---|
| `api/opensea/stats/route.ts` | OpenSea collection stats (floor, holders, sales). 5-min revalidate. |
| `api/opensea/recent/route.ts` | Last 20 sales. Fixed 2026-05-25 to NOT divide bundle prices (was 10× too small). |
| `api/opensea/holders/route.ts` | Top 100 holders + distribution bands. |
| `api/opensea/per-civ-volume/route.ts` | Per-civ sales volume (uses `/v2/events/collection/freelons`). |
| `api/opensea/civ-stats/route.ts` | Per-civ market cap (floor × supply). |
| `api/market/red-signals/route.ts` | Listings ≤ 90% of floor. Powers GoodValueToSweep + RedSignalsFeed. |
| `api/opensea/value-flag/route.ts` | Per-citizen value-vs-listing flag. |

### Identity / X / auth

| File | What it does |
|---|---|
| `api/x/start/route.ts` | OAuth 1.0a start. Returns redirect. |
| `api/x/callback/route.ts` | OAuth callback. Binds x-session HMAC cookie to handle + wallet. |
| `api/x/me/route.ts` | Returns current x-session payload. |
| `api/claim/route.ts` | Daily +10⬡ claim. Atomic SETNX on (wallet, day). |
| `api/name/route.ts` | Burn 50⬡ to name a citizen. RPC ownership check. |
| `api/realign/route.ts` | Burn 250⬡ to realign citizen civ. |
| `api/tithe/route.ts` | Burn 100⬡ to gift wallet civ-aligned hex. |

### Transmissions / relays / quests

| File | What it does |
|---|---|
| `api/transmissions/route.ts` | POST a transmission. Burn 100⬡. |
| `api/transmissions/[id]/route.ts` | GET/DELETE single transmission. |
| `api/transmissions/[id]/boost/route.ts` | Burn N⬡ to boost. Royalty share to author. |
| `api/transmissions/[id]/signal/route.ts` | Free ⬢ signal (no burn). |
| `api/reply/route.ts` | Earn hex for verified X reply to autopost. |
| `api/quests/[questId]/route.ts` | Quest progress endpoint. |
| `api/relay/route.ts` | Relay slot claim. |

### Shop

| File | What it does |
|---|---|
| `api/shop/buy/route.ts` | Burn N⬡ for shop item. |
| `api/shop/inventory/[handle]/route.ts` | Per-handle owned items. |

### Civ wars / governance

| File | What it does |
|---|---|
| `api/civ-broadcast/[slug]/route.ts` | Mayor broadcasts (140 char) per civ. |

### Misc

| File | What it does |
|---|---|
| `api/alerts/route.ts` | City alert feed. |
| `api/hex-index/route.ts` | Synthetic hex index (composite of floor + activity). |
| `api/log-error/route.ts` | Client error sink. |
| `api/admin/credit/route.ts` | Architect-only credit issuance (admin auth). |

### OG image generators (next/og)

| Route | What it renders |
|---|---|
| `api/og/[id]/route.tsx` | Single citizen card (hex-clipped image + meta). |
| `api/og/card/[id]/route.tsx` | Citizen listing card. |
| `api/og/wallet/[address]/route.tsx` | Top-6 citizens of a wallet. |
| `api/og/hex/[address]/route.tsx` | Wallet hex balance card. |
| `api/og/flex/[address]/route.tsx` | Portfolio flex card. |
| `api/og/rank/[address]/route.tsx` | Rank/leaderboard standing. |
| `api/og/passport/[address]/route.tsx` | Wallet passport identity card. |
| `api/og/civ-pride/[slug]/route.tsx` | Civ pride leaderboard card. |
| `api/og/civ-value/route.tsx` | Collection-wide civ value bar chart. |
| `api/og/propaganda/[slug]/route.tsx` | Civ propaganda card. |
| `api/og/rivalry/[slug]/route.tsx` | Civ rivalry comparison. |
| `api/og/daily/route.tsx` | Daily signal visual. |
| `api/og/regret/route.tsx` | Top regret sales card. |
| `api/og/doppel/route.tsx` | Doppelgänger card. |
| `api/og/floor-history/route.tsx` | Floor history chart. |
| `api/og/heat/route.tsx` | Heat map. |
| `api/og/hex-index/route.tsx` | Hex index card. |
| `api/og/sweep-burst/route.tsx` | **NEW.** 3×2 grid composite image for 5+ sweep burst tweets. |

---

## 3 · components/ — React components

### Phase 1 design primitives (`components/ui/`)

Single visual language. Every primitive reads from `--state-*`, `--r-*`, `--panel-*`, `--t-mono-*` tokens.

| File | What it renders |
|---|---|
| `ui/Panel.tsx` | Bordered card with state-color strip + label/state header + primary + secondary + KPIs + optional CTA. |
| `ui/Pill.tsx` | Inline rounded pill (default/gold/warning/civ variants, sm/md sizes). |
| `ui/StatusDot.tsx` | Small pulsing color dot tied to system state. |
| `ui/KpiRow.tsx` | Label · value pair grid (mono + tabular-nums). |
| `ui/ActionCard.tsx` | Clickable funnel card (default + hero variants). |
| `ui/SectionHeader.tsx` | Kicker bar with optional right-side live indicator. |
| `ui/LiveIndicator.tsx` | Inline "status · LIVE" badge. |
| `ui/ResponsiveGrid.tsx` | Auto-collapsing 3→2→1 grid + MobileStack helper. |
| `ui/Banner.tsx` | Top or block urgency strip (CollapseBanner + HoldTheLineBanner share this). |
| `ui/tokens.ts` + `ui/index.ts` | STATE_COLOR map + single import surface. |

### Layout / chrome

| File | What it does |
|---|---|
| `Header.tsx` | Sticky site header. Brand + nav (Civilizations · Archives · Combat Archives · Pulse · Shop) + EARN HEX pill + Sync btn + HexPill + WalletConnect. |
| `HeaderArchives.tsx` | "Archives ▾" portal dropdown with grouped links (LIVE/MARKET/HOLDER/COMMUNITY/CANON). |
| `HeaderHexPill.tsx` | Live hex balance pill in header. |
| `MobileNav.tsx` | Off-canvas mobile drawer. |
| `Footer.tsx` | Site footer (contract + IPFS + OpenSea). |
| `CollapseBanner.tsx` | Top urgency strip when collapse mode active. |
| `HoldTheLineBanner.tsx` | Sticky homepage banner with defender count + DEFEND CTA. |

### Identity / wallet

| File | What it does |
|---|---|
| `WalletConnect.tsx` | MetaMask connect button + balance read. |
| `IdentityGreeting.tsx` | Wallet-aware greeting pill above hero (anon / loading / civ-known states). |
| `useHolder.ts` | Client hook — wallet+cookie source resolution + MAX(rpc, server) balance check. |
| `StampViewerAddr.tsx` | Writes viewer's address to `freelon_addr` cookie (30d). |
| `FeaturedCitizenPicker.tsx` | **NEW.** 24-cell grid on /wallet. Self-gates on cookie-vs-wallet match. POSTs to featured API. |

### Homepage components

| File | What it does |
|---|---|
| `FloorPill.tsx` | Gold pill above hero — FLOOR · price · USD · holders · 24h sales. |
| `HonoreeStrip.tsx` | Row of 7 honoree faces above the fold. |
| `DoThisNow.tsx` | Personalized funnel card (Sync / Claim / Snipe primary states). |
| `GoodValueToSweep.tsx` | **NEW.** Top-6 red signals + VALUE score + tier. Answers WitschiDaD's "are some better?" |
| `OtherSignalsStrip.tsx` | **NEW.** 5 archive cards visible on homepage. Links to /archive. |
| `CityTerminal.tsx` | 6-panel Bloomberg terminal (Floor / Hex Index / Civ Leader / Hold the Line / Last Sale / Today's Signal). |
| `CivWarBoard.tsx` | Live civ-wars standings preview. |
| `HexIndexHero.tsx` | Standalone hex index card (used outside homepage). |
| `RecentTransmissions.tsx` | Last 6 sales with thumbnail + price (price-decimal fix landed 2026-05-25). |
| `TopPatronsStrip.tsx` | Top burn-spenders strip. |
| `CityFeedTicker.tsx` | Scrolling marquee — red signals / floor / sold / fifth bracket. |

### Dashboard

| File | What it does |
|---|---|
| `CityStats.tsx` | Lifetime totals card. |
| `HexIndex.tsx` | Composite hex-index display. |
| `HexNetWorth.tsx` | Viewer's portfolio net worth. |
| `CivValueChart.tsx` | Per-civ market-cap bar chart. |
| `HolderDistributionChart.tsx` | Top-100 + tail distribution bars. |
| `LiveSalesFeed.tsx` | Live OpenSea sales tail. |
| `LiveHeatGrid.tsx` | Per-civ heat (sales + signals) in last 60 min. |
| `RedSignalsFeed.tsx` | Undervalued listings feed. |
| `TopCitizensByValue.tsx` | **NEW.** Top 10 by computed value + thumbnail + civ + score. |

### Citizen page

| File | What it does |
|---|---|
| `CitizenCard.tsx` | Compact thumbnail card with civ color border + tier badge. |
| `CitizenNameEditor.tsx` | Burn 50⬡ to name. RPC ownership check. |
| `CitizenRealignEditor.tsx` | Burn 250⬡ to realign civ. |
| `CivGlyph.tsx` | SVG mask-based civ glyph (any color). |
| `WatchlistButton.tsx` | Burn 25⬡ to watchlist a citizen. |
| `ShareOG.tsx` | Single-button OG share for any path. |
| `PropagandaShareButtons.tsx` | Civ-pride share buttons. |
| `ShareButtons.tsx` | Multi-channel share row. |
| `DoctrineFragment.tsx` | Step-tracked lore reveal block. |

### Citizens browser

| File | What it does |
|---|---|
| `CitizensBrowser.tsx` | Chip filters (civ/tier/shape/caste/aura/rarity) + load-more grid. Sticky filter bar. |
| `FindCitizen.tsx` | "Enter token #" input on hero. |

### Carrier / X

| File | What it does |
|---|---|
| `BecomeACarrier.tsx` | 2-step "Connect wallet → Sign in with X" onboarding card. |
| `HandleSwitcher.tsx` | Per-browser handle switcher for users with multiple X accounts. |
| `StreakBadge.tsx` | Lore-named streak tier (STATIC HEARD / SIGNAL CARRIER / DAYS OF FIRE / etc.). |
| `AllDoctrinesBadge.tsx` | Awarded when carrier collects all 10 doctrine fragments. |
| `DailyMission.tsx` | Daily mission card (visit a civ each day). |
| `DailySignal.tsx` | Today's signal text + share button. |
| `CitizenOfDay.tsx` | Pseudo-random featured citizen. |
| `LiveStats.tsx` | Live floor + holders + 24h count strip. |
| `ReplySubmit.tsx` | "I replied to your autopost" claim form. |
| `MyInvites.tsx` | Pending invite tracker. |
| `NotificationInbox.tsx` | On-site notification reader. |
| `QuestTracker.tsx` + `QuestToast.tsx` | Quest progress + toast popup. |

### Civ wars

| File | What it does |
|---|---|
| `MyCivStandings.tsx` | "Your dominant civ + standings" card on /civ-wars. |
| `MayorBroadcast.tsx` | Civ mayor broadcast composer + reader. |

### Holders / passport

| File | What it does |
|---|---|
| `CarrierHealthCta.tsx` | "Restore the meter" CTA when wallet is cooling/cold. |

### Transmissions

| File | What it does |
|---|---|
| `TransmissionCard.tsx` | Image + caption + boost/signal buttons. |
| `TransmissionSubmit.tsx` | Submit form (image + caption + civ). |

### Hold the line

| File | What it does |
|---|---|
| `HoldTheLineClient.tsx` | Bid claim form (wallet + bid amount + tx hash). |
| `RecentSweepers.tsx` | **NEW.** Top-10 sweepers in last 4h + mini-thumbnails. |

### Vault

| File | What it does |
|---|---|
| `VaultClient.tsx` | Full vault flow — connect, select, recipient, test-send safety card, batch transfer, progress. |

### City notice / toast / overlay

| File | What it does |
|---|---|
| `CityNotice.tsx` | In-app status toast (claimed / received / lost / restored). |
| `Ghost404.tsx` | Ghost overlay on ghosted citizens (dump deterrent). |

---

## 4 · lib/ — Core libraries

### State stores (Upstash + in-memory fallback)

| File | What it stores |
|---|---|
| `wallet-hex-store.ts` | Per-wallet hex balance + lifetime + claim streak + last active day. |
| `defender-store.ts` | Bid-wall stats + top defenders. |
| `defender-scan.ts` | OpenSea collection-offer scanner. |
| `defender-tick-on-visit.ts` | **NEW.** Page-visit fallback — fires defender scan if last >5min stale. |
| `sweeper-store.ts` | **NEW.** Recent sweep events list + getTopSweepers aggregator. |
| `citizen-value-store.ts` | **NEW.** Per-citizen hex ledger + value computation + civ rank + age (404 base) + acceptance tier. |
| `featured-citizen-store.ts` | **NEW.** Per-wallet featured citizen pick. |
| `transmissions-store.ts` | Transmission storage + queries. |
| `reply-store.ts` | Reply-to-autopost claim ledger. |
| `reply-engagement-scan.ts` | Like-count check after 24h. |
| `ghost-store.ts` | Ghosted citizens + rescue/dump ledger + defender-since. |
| `civ-broadcast-store.ts` | Mayor broadcasts (per-civ). |
| `civ-mayor.ts` | Auto-elected mayor (sampled from on-chain holdings). |
| `civ-wars.ts` | Civ-wars scoring + standings. |
| `notifications-store.ts` | NotifKind enum + delivery + prefs. (kinds: decay-warning, streak-soon, watchlist-flag, transmission-boosted, civ-wars-monday, civ-wars-mid, snipe-matured, fresh-citizen, sweep-burst) |
| `notify.ts` | High-level notify() — writes inbox + optional X DM. |
| `notify-scanner.ts` | Cron-time scanner for decay/streak/watchlist notifications. |
| `collapse-mode.ts` | City collapse state (auto-trigger + multipliers). |
| `quest-store.ts` | Quest progress per handle/wallet. |
| `invite-store.ts` | Invite tracker. |
| `name-store.ts` | Citizen names. |
| `realign-store.ts` | Civ realignments. |
| `watchlist-store.ts` | Per-wallet watchlist. |
| `tithe-store.ts` | Tithe history. |
| `propaganda-store.ts` | Civ propaganda posts. |
| `pulse-store.ts` | Sale-pulse cursor. |
| `heat-counters.ts` | Per-civ heat 60-min counters. |
| `holder-tick.ts` | Holder activity ticker. |
| `relay-store.ts` | Relay slot store. |

### X / OAuth

| File | What it does |
|---|---|
| `x-session.ts` | HMAC cookie + getSessionFromRequest + requireSessionBound (IDOR guard) + isSameOrigin (CSRF). |
| `x-store.ts` | Verified X handle ↔ wallet bindings. |
| `x-autopost.ts` | OAuth 1.0a tweet + uploadMedia. postingCapable() checks 4 env vars. |
| `x-dm.ts` | OAuth 1.0a DM helper (shared oauth1Header). |

### Autopost orchestrators (called from sweep-bounty cron)

| File | What it does |
|---|---|
| `sales-pulse.ts` | Every 4h. Picks top sale, posts tweet + image + thread CTA. |
| `weekly-receipts.ts` | Every Sunday. Posts weekly volume + hex + transmissions + rescues thread. |
| `sweep-burst.ts` | **NEW.** Fires when ≥5 citizens swept in 4h. Posts 3×2 composite image + broadcasts notification to top-100 holders. |

### Citizens / data access

| File | What it does |
|---|---|
| `citizens.ts` | getCitizen / getAllCitizens / getByCivilization / getOneOfOnes / getHonoraries / civilizationColor / countSimilar / rarityRank / civilizationOf. |
| `constants.ts` | CIVILIZATIONS map (all 10 with stamp/color/doctrine/role/rival), CONTRACT, METADATA_CID, IMAGE_CID, IPFS_GATEWAY, imageUrl(), heroImageUrl(), TOTAL. |
| `canon.ts` | CANON object — locked phrases (IDENTITY, RESTORED, RECEIVED, LOST, ONLINE, etc.). |
| `economy-constants.ts` | All hex rates + thresholds + intervals. |
| `citizen-meta.ts` | Per-citizen meta (daysHeld, lastSaleEth, lastSaleTs) via OpenSea. |
| `wallet-tokens.ts` | RPC enumeration + paginated OpenSea backfill. **Fixed 2026-05-25 for Peterhawk's truncation bug.** |
| `useViewer.ts` | Client hook — resolves viewer address from cookie/wallet. |
| `use-viewer.ts` | (Duplicate name with hyphen — keep both for backwards compat.) |

### Helpers

| File | What it does |
|---|---|
| `eth-math.ts` | weiToEth + paymentToEth (BigInt-safe). |
| `eth-price.ts` | getUsdPerEth via CoinGecko. 1h cache. |
| `share.ts` | Tweet body composers + HANDLE constant + HASHTAGS. 10 relay templates. |
| `opensea-fetch.ts` | extractEvents helper (handles both response shapes). |
| `civilization-detect.ts` | Heuristic civ assignment from X handle text. |
| `owner-of.ts` | RPC ownership check with 4-RPC fallback chain. |
| `paid-storage.ts` | Wrapper for paid-feature flags. |
| `pricing.ts` | Hex prices for naming/realign/etc. |
| `rate-limit.ts` | Upstash rate limiter (per-route, per-IP). |
| `slugify.ts` | URL-safe slugify. |
| `deep-lore.ts` | Procedural lore generator (hex_state interp). |
| `roman.ts` | Roman numeral helper. |
| `signal-loop.ts` | Daily signal selection logic. |
| `daily-mission-store.ts` | Daily mission state. |
| `feature-flags.ts` | Feature flag wrapper. |
| `tip.ts` | Wallet tip helpers. |
| `eth-token-bal.ts` | ERC-20 token balance read. |
| `sweep-inline.ts` | Inline sweep credit (called from /api/wallet/[addr]/hex for instant feedback). |
| `floor-defender.ts` | Floor-defender qualification helpers. |
| `ethereum.d.ts` | window.ethereum type. |

---

## 5 · data/ — Source-of-truth JSON

| File | Contents |
|---|---|
| `citizens.json` | All 4040 citizen records (id, civilization, caste, shape, tier, sub_archetype, aura, hex_state, honoree, honoree_handle, transmission_name, name). |
| `doctrine-fragments.json` | 10 doctrine fragment quest steps. |
| `signal-loop.json` | Daily signal corpus. |
| `shop-items.json` | Shop catalog. Includes **ASCENSION tier items** added 2026-05-25 (Wovenhood / Lit Visor / Architect's Light / Sealed Bracket). |

---

## 6 · docs/ — Internal docs

| File | What it covers |
|---|---|
| `PHASE1_CHANGELOG.md` | Design system surgery — primitives + tokens. |
| `PHASE2_CHANGELOG.md` | Mobile system + 375px breakpoint pass. |
| `PHASE3_CHANGELOG.md` | Hierarchy reorder + emoji purge + Numbers→Pulse rename. |
| `PR_BODY.md` | PR template for the 3-phase refactor PR. |
| `SPEC_SHOP_EXPANSION.md` | Hood/Mars-house spec (NOT BUILT, sign-off pending). |
| `BRIEF_HEX_ECONOMY.md` | Ready-to-send brief for a hired game-econ pro. |
| `terminal-redesign-roadmap.md` | Phased redesign plan. |
| `external-cron.md` | External cron pinger setup (now redundant — Vercel Pro covers it). |
| `FILE_TREE.md` | **THIS DOCUMENT.** |

---

## 7 · public/ — Static assets

### Glyphs (`public/glyphs/`)

| File | What it is |
|---|---|
| `civs/blue-synthesis.svg` ... `civs/silver-machine.svg` | 10 civ glyphs (currentColor SVG, used by CivGlyph via CSS mask). |
| `hex/filled.svg` · `outline.svg` · `pulse.svg` · `fractured.svg` · `sealed.svg` | 5 hex glyph variants. |

### Generated images (`public/generated/`)

| File | What it is |
|---|---|
| `signal-lost.png` | Kintsugi hooded figure (ghost overlay). |
| `defender-badge.png` | Heraldic shield + emerald hex (DEFENDER badge). |
| `terminal-bg-{1,2,3}.png` | Dark textures for terminal panels. |
| `civ-banner-{slug}.png` | 10 wide cinematic civ banners (one per civ). |

### Other static (`public/`)

`logo.png`, `favicon.png`, `heroes/{0001..4040}.webp` (a subset of locally-baked heroes), `atmos/` (atmosphere images for civ/lore pages), `shop/` (shop item thumbnails).

---

## 8 · Top-level config

| File | What it does |
|---|---|
| `next.config.ts` | Next config. Vanity rewrites for the 4 one-of-ones. |
| `package.json` | Deps + scripts. |
| `tsconfig.json` | TS config. |
| `tailwind.config.ts` | Tailwind config. |
| `vercel.json` | Cron schedule (daily-signal `4 4 * * *` + sweep-bounty `*/15 * * * *`). |
| `.claude/launch.json` | Preview server config for the MCP. |
| `app/layout.tsx` | Root layout. Header + footer + global styles + title.template ("%s · FREELON CITY"). |
| `app/globals.css` | Global CSS. Tokens + primitives + page-specific rules + Phase 2 mobile utilities. |

---

## 9 · Not in repo but referenced

- `/Users/billy/crypt-game/` — separate project. **Source of TCG god names** (Anubis / Aphrodite / Anunnaki / Hades / Loki / Odin / Poseidon / Thor / Vishnu / Zeus). All 10 confirmed as 1/1s in Crypt Trading Cards (contract `0x48fd513c9f8ca591ffada7223a261ffc6e797394`).
- `/Users/billy/crypt-game/src/data/cardMaster.json` — TCG card catalog.
- `/Users/billy/crypt-game/opensea_crypttradingcards_full.json` — Full on-chain metadata dump.

---

## Stats

- **342 source files** in `app/` `components/` `lib/` `data/` `docs/` `public/`
- **~70 routes** including OG endpoints
- **27 components/ui primitives + feature components** (most use Phase 1 primitives)
- **40+ lib stores/helpers**
- **All collections cross-referenced**: freelons (this project) + crypt-official + crypttradingcards + oogies + emile0x1908 + smiles-genesis + 404hexnotfound — all minted from the same architect wallet.

---

## APPENDIX A · Complete raw file listing (all 295 files)

Auto-generated from `find app components lib data docs public/glyphs public/generated -type f`.

```
app/api/admin/credit/route.ts
app/api/admin/preflight/route.ts
app/api/alerts/route.ts
app/api/carrier/[handle]/route.ts
app/api/civ-broadcast/[slug]/route.ts
app/api/claim/route.ts
app/api/cron/daily-signal/route.ts
app/api/cron/sweep-bounty/route.ts
app/api/defender/route.ts
app/api/ghost/[tokenId]/route.ts
app/api/ghost/list/route.ts
app/api/hex-index/route.ts
app/api/leaderboard/me/route.ts
app/api/leaderboard/route.ts
app/api/log-error/route.ts
app/api/market/heat/route.ts
app/api/market/red-signals/route.ts
app/api/mission/claim/route.ts
app/api/name/[id]/route.ts
app/api/names/route.ts
app/api/notifications/route.ts
app/api/og/[id]/route.tsx
app/api/og/card/[id]/route.tsx
app/api/og/civ-pride/[slug]/route.tsx
app/api/og/civ-value/route.tsx
app/api/og/daily/route.tsx
app/api/og/doppel/route.tsx
app/api/og/flex/[address]/route.tsx
app/api/og/floor-history/route.tsx
app/api/og/heat/route.tsx
app/api/og/hex-index/route.tsx
app/api/og/hex/[address]/route.tsx
app/api/og/passport/[address]/route.tsx
app/api/og/propaganda/[slug]/route.tsx
app/api/og/rank/[address]/route.tsx
app/api/og/regret/route.tsx
app/api/og/rivalry/[slug]/route.tsx
app/api/og/sweep-burst/route.tsx
app/api/og/wallet/[address]/route.tsx
app/api/opensea/civ-stats/route.ts
app/api/opensea/holders/route.ts
app/api/opensea/listings/route.ts
app/api/opensea/per-civ-floor/route.ts
app/api/opensea/per-civ-volume/route.ts
app/api/opensea/recent/route.ts
app/api/opensea/stats/route.ts
app/api/opensea/transfers/route.ts
app/api/quests/[questId]/route.ts
app/api/realign/[id]/route.ts
app/api/referral/route.ts
app/api/reply/route.ts
app/api/shop/buy/route.ts
app/api/shop/inventory/[handle]/route.ts
app/api/tithe/route.ts
app/api/transmissions/[id]/boost/route.ts
app/api/transmissions/[id]/report/route.ts
app/api/transmissions/[id]/route.ts
app/api/transmissions/[id]/signal/route.ts
app/api/transmissions/route.ts
app/api/unlock/[id]/route.ts
app/api/wallet/[address]/balance/route.ts
app/api/wallet/[address]/civs/route.ts
app/api/wallet/[address]/featured/route.ts
app/api/wallet/[address]/hex/route.ts
app/api/wallet/[address]/net-worth/route.ts
app/api/wallet/[address]/tokens/route.ts
app/api/watchlist/route.ts
app/api/x/callback/route.ts
app/api/x/me/route.ts
app/api/x/start/route.ts
app/architect/page.tsx
app/archive/page.tsx
app/canon/page.tsx
app/carrier/CarrierClient.tsx
app/carrier/[handle]/page.tsx
app/carrier/page.tsx
app/castes/page.tsx
app/channel/[handle]/ChannelClient.tsx
app/channel/[handle]/page.tsx
app/citizens/[id]/card/AskAndShare.tsx
app/citizens/[id]/card/page.tsx
app/citizens/[id]/page.tsx
app/citizens/page.tsx
app/civ-wars/page.tsx
app/civilizations/[slug]/page.tsx
app/civilizations/page.tsx
app/combat-archives/page.tsx
app/daily/page.tsx
app/dashboard/page.tsx
app/doppelganger/DoppelClient.tsx
app/doppelganger/page.tsx
app/earn/page.tsx
app/error.tsx
app/flex/FlexClient.tsx
app/flex/page.tsx
app/globals.css
app/graveyard/page.tsx
app/heat/page.tsx
app/hold-the-line/page.tsx
app/layout.tsx
app/leaderboard/page.tsx
app/legal/LegalShell.tsx
app/legal/dmca/page.tsx
app/legal/honorary-notice/page.tsx
app/legal/page.tsx
app/legal/privacy/page.tsx
app/legal/terms/page.tsx
app/lexicon/page.tsx
app/lore/page.tsx
app/manifesto/page.tsx
app/names/page.tsx
app/not-found.tsx
app/numbers/page.tsx
app/origin/page.tsx
app/page.tsx
app/passport/[address]/page.tsx
app/patrons/page.tsx
app/pfp/PfpStudio.tsx
app/pfp/page.tsx
app/press/page.tsx
app/rebuild/page.tsx
app/regret/RegretForm.tsx
app/regret/page.tsx
app/relay/page.tsx
app/roadmap/page.tsx
app/robots.ts
app/secrets/SecretsClient.tsx
app/secrets/page.tsx
app/shapes/page.tsx
app/shop/ShopGrid.tsx
app/shop/page.tsx
app/sitemap.ts
app/start/page.tsx
app/sync/WalletScanner.tsx
app/sync/page.tsx
app/the-fifth-bracket/FifthBracketClient.tsx
app/the-fifth-bracket/page.tsx
app/transmissions/[id]/page.tsx
app/transmissions/page.tsx
app/tribute/[handle]/page.tsx
app/tribute/page.tsx
app/undervalued/page.tsx
app/vault/page.tsx
app/wallet/[address]/page.tsx

components/AlertsFeed.tsx
components/AllDoctrinesBadge.tsx
components/Analytics.tsx
components/BecomeACarrier.tsx
components/CarrierHealthCta.tsx
components/CitizenCard.tsx
components/CitizenDeepLore.tsx
components/CitizenNameEditor.tsx
components/CitizenOfDay.tsx
components/CitizenOwnedByYou.tsx
components/CitizenRealignEditor.tsx
components/CitizensBrowser.tsx
components/CityFeedTicker.tsx
components/CityNotice.tsx
components/CityStats.tsx
components/CityTerminal.tsx
components/CivGlyph.tsx
components/CivValueChart.tsx
components/CivVisitTracker.tsx
components/CivWarBoard.tsx
components/CollapseBanner.tsx
components/CopyToClipboardButton.tsx
components/DailyMission.tsx
components/DailySignal.tsx
components/DoThisNow.tsx
components/DoctrineFragment.tsx
components/EasterEggCode.tsx
components/ErrorReporter.tsx
components/FeaturedCitizenPicker.tsx
components/FindCitizen.tsx
components/FloorPill.tsx
components/Footer.tsx
components/FourOFourEvent.tsx
components/Ghost404.tsx
components/GhostedMask.tsx
components/GoodValueToSweep.tsx
components/Header.tsx
components/HeaderArchives.tsx
components/HeaderHexPill.tsx
components/HexEarningsLog.tsx
components/HexIndex.tsx
components/HexIndexHero.tsx
components/HexNetWorth.tsx
components/HoldTheLineBanner.tsx
components/HoldTheLineClient.tsx
components/HolderDistributionChart.tsx
components/HonoreeStrip.tsx
components/IdentityGreeting.tsx
components/InlineSync.tsx
components/LiveHeatGrid.tsx
components/LiveSalesFeed.tsx
components/LiveStats.tsx
components/MayorBroadcast.tsx
components/MobileNav.tsx
components/MyCivStandings.tsx
components/MyInvites.tsx
components/MyRank.tsx
components/NotificationInbox.tsx
components/OtherSignalsStrip.tsx
components/PropagandaShareButtons.tsx
components/QuestToast.tsx
components/QuestTracker.tsx
components/RandomCitizenButton.tsx
components/RecentSweepers.tsx
components/RecentTransmissions.tsx
components/RedSignalsFeed.tsx
components/ReplySubmit.tsx
components/ScrollReveal.tsx
components/ShareButtons.tsx
components/ShareOG.tsx
components/Spotlight.tsx
components/StampViewerAddr.tsx
components/StreakBadge.tsx
components/TitheForm.tsx
components/TopCitizensByValue.tsx
components/TopPatronsStrip.tsx
components/TransmissionCard.tsx
components/TransmissionSubmit.tsx
components/VaultClient.tsx
components/WalletConnect.tsx
components/WatchlistButton.tsx

components/ui/ActionCard.tsx
components/ui/Banner.tsx
components/ui/KpiRow.tsx
components/ui/LiveIndicator.tsx
components/ui/Panel.tsx
components/ui/Pill.tsx
components/ui/ResponsiveGrid.tsx
components/ui/SectionHeader.tsx
components/ui/StatusDot.tsx
components/ui/index.ts
components/ui/tokens.ts

data/citizens.json
data/deep-lore.json
data/doctrine-fragments.json
data/identities.json
data/identities_tier_a.json
data/shop-items.json

docs/BRIEF_HEX_ECONOMY.md
docs/FILE_TREE.md
docs/PHASE1_CHANGELOG.md
docs/PHASE2_CHANGELOG.md
docs/PHASE3_CHANGELOG.md
docs/PR_BODY.md
docs/SPEC_SHOP_EXPANSION.md
docs/external-cron.md
docs/terminal-redesign-roadmap.md

lib/alerts.ts
lib/canon.ts
lib/carrier-store.ts
lib/carrier.ts
lib/citizen-meta.ts
lib/citizen-of-day.ts
lib/citizen-value-store.ts
lib/citizens.ts
lib/city-notice.ts
lib/civ-broadcast-store.ts
lib/civ-mayor.ts
lib/civ-wars.ts
lib/collapse-mode.ts
lib/constants.ts
lib/daily-claim-store.ts
lib/daily-mission.ts
lib/daily-signal.ts
lib/deep-lore.ts
lib/defender-scan.ts
lib/defender-store.ts
lib/defender-tick-on-visit.ts
lib/economy-constants.ts
lib/economy-extras.ts
lib/epithets.ts
lib/eth-math.ts
lib/eth-price.ts
lib/ethereum.d.ts
lib/featured-citizen-store.ts
lib/fetch-with-timeout.ts
lib/floor-defender.ts
lib/get-wallet-address.ts
lib/ghost-store.ts
lib/heat-counters.ts
lib/holder-tick.ts
lib/name-store.ts
lib/notifications-store.ts
lib/notify-scanner.ts
lib/notify.ts
lib/opensea-fetch.ts
lib/owner-of.ts
lib/quests-store.ts
lib/rarity.ts
lib/rate-limit.ts
lib/realignment-store.ts
lib/red-signal-store.ts
lib/referral-store.ts
lib/reply-engagement-scan.ts
lib/reply-store.ts
lib/require-x.ts
lib/sales-pulse.ts
lib/secrets-store.ts
lib/share.ts
lib/shop-store.ts
lib/shop.ts
lib/sweep-burst.ts
lib/sweep-inline.ts
lib/sweeper-store.ts
lib/sync.ts
lib/system-copy.ts
lib/tithe-store.ts
lib/transmissions-store.ts
lib/unlock-store.ts
lib/upstash-lock.ts
lib/use-viewer.ts
lib/useHolder.ts
lib/useOwnsCitizen.ts
lib/wallet-classification.ts
lib/wallet-hex-store.ts
lib/wallet-tokens.ts
lib/watchlist-store.ts
lib/weekly-receipts.ts
lib/worldbuilding.ts
lib/x-autopost.ts
lib/x-dm.ts
lib/x-oauth.ts
lib/x-session.ts
lib/x-store.ts

public/glyphs/civs/black-fracture.svg
public/glyphs/civs/blue-synthesis.svg
public/glyphs/civs/gold-sovereignty.svg
public/glyphs/civs/green-growth.svg
public/glyphs/civs/pink-luxury.svg
public/glyphs/civs/purple-oracle.svg
public/glyphs/civs/red-corruption.svg
public/glyphs/civs/silver-machine.svg
public/glyphs/civs/void-404.svg
public/glyphs/civs/white-transmission.svg
public/glyphs/hex/filled.svg
public/glyphs/hex/fractured.svg
public/glyphs/hex/outline.svg
public/glyphs/hex/pulse.svg
public/glyphs/hex/sealed.svg
```

(Plus `public/generated/*.png` non-text assets: signal-lost · defender-badge · terminal-bg-{1,2,3} · 10 civ banners.)

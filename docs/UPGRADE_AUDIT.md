# FREELON CITY — Ecosystem Upgrade Audit

_Generated 2026-06-19 by a 35-agent multi-lens audit (recon → 15 specialist reviews → 15 adversarial verifiers → synthesis). Every finding below was confirmed against the real code before inclusion; impact 1–5, effort S/M/L._

**119 verified findings.** Impact spread: 5★×5, 4★×27, 3★×43, 2★×43, 1★×1

## Top recommendation

Start with the six dead /start links (rank 1). It is the highest impact-to-effort item on the board: a single find/replace that resolves a bug appearing across ~7 separate verified findings, removes a 308 redirect from the conversion path, kills a literal self-loop on /help, and fixes mislabeled links that lie to cold visitors at peak-intent moments (the demo exhaustion wall, /canon 'START HERE', the /help '2-minute guide'). It is fully verified (app/start/page.tsx:15 permanentRedirect('/help') plus all six hrefs grep-confirmed at the cited lines), touches no locked constraint, carries no economy or on-chain risk, and clears the way for the two highest-leverage instrumentation items (run_completed and the buy->awaken return loop) by making the funnel it measures actually intact.

## Themes

- **Broken funnel plumbing & dead-end links** — The /start fold left six redirecting links (one self-looping, several mislabeled) and a '404' crash page — newcomers hit dead ends at the exact moments they need reassurance.
- **Conversion path unowned & unmeasured** — Every buy CTA dumps to OpenSea with no return loop, the citizen-page CTA promises chat but shows a paywall, and the most expensive owner transitions (buy->awaken, activate->first-output) fire no completion or failure events.
- **Brand palette & verb drift** — Off-palette hot-pink magenta on the arcade, traffic-light status colors and duplicate-gold cards on the homepage, a different gold/black/type in Mars, and a stray 'BUY' verb all erode the premium black/gold/ivory/dust-red AWAKEN canon.
- **Shareability left flat on the distribution bottleneck** — Six pages share one generic OG card, the /proof card is mis-cropped, and one share surface drops its ref code — cheap virality levers untapped where the real constraint (distribution) lives.
- **Sink-side economy correctness** — Concurrent hex ticks do unlocked full-record writes that erase locked sweep/sale credits, sweeps bypass the farmable daily ceiling, and a retired floor-defender tick still writes — all real HEX-accounting bugs (not faucets), fixable with one lock-wrapped patch helper.
- **Doc rot & latent config footguns** — A stale /crypt-tcg header could regress live marketing copy, the game-URL fallback points at an unbranded domain, and prod analytics may be silently dark — small landmines in a fast-shipping solo repo.

## Quick wins (high-impact, low-effort)

- Repoint all six dead /start links (308-redirect + broken labels + /help self-loop)
- Fire run_completed / run_failed / first_run_completed on the owner agent path
- Rewrite the homepage hero subline into a what-it-is + what-you-do split
- Instrument unlock_blocked at the 3 wallet/connect failure branches before activation_paid
- Remap off-palette neon-magenta (#FF0070) to a brand token (one var change)
- Recolor homepage collection cards off traffic-light status colors
- Change the runtime error boundary headline from '404' to a crash word
- Rewrite the stale /crypt-tcg file header
- Fix mobile MetaMask deep-link dropping ?ref= and hash on /sync
- Add a Crypt TCG card to the /play arcade hub
- Default the /crypt-tcg game URL fallback to play.freeloncity.com
- Verify Crypt TCG prod analytics env + add an absent-beacon warning

## Biggest levers

- Add a buy->awaken return loop (microcopy + return banner + named funnel) on every OpenSea CTA — recovers the second ETH revenue event that currently leaks to OpenSea unmeasured
- Fire run_completed/run_failed/first_run on the owner agent path — makes 'did paying owners get a real first output' measurable for the first time
- Make the citizen-page primary CTA ownership-aware — fixes expectation/reality whiplash on 4,040 indexed, most-shared pages
- Disambiguate the two 'unlock' verbs (AWAKEN vs REVEAL) — removes documented newcomer confusion sitting directly on the money path
- Repoint all six dead /start links — one find/replace fixes a bug that recurs across ~7 findings and breaks the scent trail at peak-intent moments
- Rewrite the homepage hero subline — the 10-second clarity fix on the highest-traffic surface
- Per-surface OG share cards + fix the /proof share aspect ratio — cheap virality levers on the known distribution bottleneck

## Ranked top 20

### 1. Repoint all six dead /start links (308-redirect, broken scent trails, self-loop)
`CITY SITE` · impact 5 · effort S

**Why.** This is the same bug appearing in ~7 separate verified findings and it sits squarely on the conversion path. /start permanentRedirects to /help, so every click costs a 308 hop, and several labels lie about the destination: the demo exhaustion wall (peak intent) says 'see how awakening works' but lands on wallet-troubleshooting FAQ; /canon 'START HERE' lands on troubleshooting; and /help itself links to a '2-minute guide' that bounces /start->/help, landing the reader exactly where they started. Cold/unsure newcomers are the ones following these links, and they break at the worst moments.

**How.** Global find/replace the six in-content hrefs (app/page.tsx:263, app/canon/page.tsx:251, app/help/page.tsx:61, components/DemoChat.tsx:455, components/CitizenAgentDashboard.tsx:289, components/VaultClient.tsx:605) to point directly at /help or a real #anchor (/help#wallet, /help#free). Delete help/page.tsx:61 outright since it can only self-loop. Fix the demo-wall label to match /help. Keep app/start/page.tsx as the redirect so any external old links still resolve. No new page, no redirect needed once links are direct.

**Evidence.** app/start/page.tsx:15 permanentRedirect('/help'); links at app/page.tsx:263, app/canon/page.tsx:251, app/help/page.tsx:61, components/DemoChat.tsx:455, components/CitizenAgentDashboard.tsx:289, components/VaultClient.tsx:605 (all grep-confirmed)

### 2. Fire run_completed / run_failed / first_run_completed on the owner agent path
`CITY SITE` · impact 5 · effort S

**Why.** The single most expensive conversion (a paying owner) goes dark exactly where it matters: run_started fires but nothing fires on success or failure, so 'of owners who activated, what fraction got a real first output' is unmeasurable. With real payers already in the funnel, this is the number that tells Billy whether the post-purchase product actually delivers. Zero call sites exist today (grep-confirmed).

**How.** In CitizenAgentDashboard.tsx finish() (lines 712-725): add trackEvent('run_completed') on the ok branch (~713), trackEvent('run_failed',{reason}) on the capacity/error branches (~722-724), and a once-guarded first_run_completed on the justActivated path. Pure additive instrumentation, no behavior change.

**Evidence.** components/CitizenAgentDashboard.tsx:336 run_started fires; finish() lines 712-725 emit nothing on any of 4 branches; repo-wide grep for run_completed|run_failed|first_run returns zero hits

### 3. Rewrite the homepage hero subline into a what-it-is + what-you-do split
`CITY SITE` · impact 4 · effort S

**Why.** Under an abstract h1 ('Where AI becomes a civilization'), the subline crams provenance + six collections + four verbs (meet/own/train/battle) + a memory claim into one ~40-word breath. A 10-second cold visitor can't tell which action is theirs, and 'battle in the card arena' over-promises a separate device-local game. This is the highest-traffic surface and the cheapest possible fix.

**How.** Split app/page.tsx:122-126 into two short lines mirroring the two CTAs: one what-it-is line, one what-you-do line. Drop 'battle in the card arena' from the hero. Copy-only, no value/return claims.

**Evidence.** app/page.tsx:120 h1; :122-126 the single ~40-word .hero-landing__tag sentence

### 4. Add a buy->awaken return loop: microcopy + return banner on every OpenSea CTA
`CITY SITE` · impact 5 · effort M

**Why.** Every prominent OWN CTA dumps the buyer to OpenSea with target=_blank and no breadcrumb back. The awaken flow (the second ETH revenue event, highest-intent moment) only renders inside /agent/[id] for someone who already knows to go there. The opensea_click->agent_view{owner:true} transition is both unmeasured and unguided, so the most expensive owner transition leaks silently.

**How.** Add a one-line 'after you buy, come back to /my-citizens to awaken it' microcopy next to each OpenSea CTA (extend the wallet-needed note pattern at app/page.tsx:261), and set a localStorage flag on opensea_click that IdentityGreeting reads to show a return banner (CLAIM YOUR FIRST CITIZEN already at IdentityGreeting.tsx:146). Name the opensea_click->agent_view{owner:true}->activation_paid funnel. Microcopy + nudge + dashboard funnel only; does not touch the ETH path.

**Evidence.** OpenSea CTAs with no return: app/page.tsx:137 & :238, components/DemoChat.tsx:438/450, app/proof/page.tsx:139; awaken in WorkspaceUnlock.tsx; CitizenAgentExplainer.tsx:44-46 describes buy->awaken->run off the buy path; IdentityGreeting.tsx:146

### 5. Make the citizen-page primary CTA ownership-aware (it promises chat, delivers a paywall)
`CITY SITE` · impact 4 · effort M

**Why.** On the 4,040 indexed citizen pages (the most-shared surface), the one primary CTA promises 'Open the workspace -> Chat, generate, and build a permanent work history... like opening ChatGPT or Claude' but a non-owner lands on a LOCKED pay panel, not chat. The only buy path is a secondary OpenSea link in the footer. Expectation/reality whiplash at the highest-leverage conversion moment.

**How.** Branch the CTA on ownership: non-owners get 'Awaken this FREELON ->' straight to the unlock panel (or OpenSea for that token); reserve 'Open the workspace' for owners. At minimum soften the sub-copy so it doesn't promise immediate chat to a soon-to-be-paywalled visitor.

**Evidence.** app/citizens/[id]/page.tsx:392-396 CTA copy; AgentWorkspace.tsx:916-932 non-owner showUnlock renders LOCKED pay panel; only buy path VIEW ON OPENSEA at page.tsx:499

### 6. Disambiguate the two 'unlock' verbs: AWAKEN (ETH) vs REVEAL/DECRYPT (HEX lore)
`CITY SITE` · impact 4 · effort M

**Why.** Two completely different actions both say 'unlock': CitizenDeepLore spends off-chain HEX to reveal blurred lore ('UNLOCK COST'/'UNLOCK FOR ME'), while WorkspaceUnlock spends real ETH to awaken the agent (the revenue path). WorkspaceUnlock's own header documents holders already dead-ending on 'can't find where to unlock.' Documented newcomer confusion sitting on the money path.

**How.** Rename user-facing verbs only: ETH path = AWAKEN (brand canon, already used in 8+ components), HEX lore reveal = REVEAL or DECRYPT. Change labels/buttons in CitizenDeepLore.tsx:130,146; keep both API routes (load-bearing). Pure naming cleanup, no HEX faucet, no new feature.

**Evidence.** components/CitizenDeepLore.tsx:70 POSTs /api/unlock (HEX), labels at :130,:146; components/WorkspaceUnlock.tsx:76 POSTs /api/citizens/[id]/unlock kind:activate (ETH); header :5-13 documents the dead-end

### 7. Instrument the wallet/connect prerequisite before activation_paid
`CITY SITE` · impact 4 · effort S

**Why.** Between unlock_quote_started and activation_paid, signature-rejected and no-wallet-browser both dead-end with an error string and no event, so a leak there can't be diagnosed as a pricing problem vs a wallet-environment problem. For a mobile-heavy NFT audience this is the most likely silent killer of the ETH path, and the fix is three trackEvent lines.

**How.** Fire unlock_blocked{reason: no_wallet_browser|sig_rejected|quote_error} at the three existing failure branches in CitizenAgentDashboard.tsx (line 672 no-wallet-browser, 628 quote catch, 685 pay cancelled/failed). Display-only, no ETH-path logic change.

**Evidence.** CitizenAgentDashboard.tsx:603 unlock_quote_started, :653 activation_paid; silent failures at :672, :628, :685

### 8. Fix the parallel hex-tick race that clobbers locked sweep credits
`CITY SITE` · impact 4 · effort M

**Why.** On the hottest authenticated endpoint (GET /api/wallet/[addr]/hex), three ticks run in Promise.all for one wallet. Sweep credits under the wallet lock, but runHolderTick finishes with an UNLOCKED getWalletHex->set->setWalletHex that overwrites the whole record. A sweep credit landing between that read and write is erased -- real HEX silently lost. This is sink-side correctness, not a faucet.

**How.** Route the cursor-only writes through withWalletLock (a lock-wrapped stampCursor helper) OR run the three ticks sequentially in the route, matching holder-tick.ts:172-176's own documented sequential-safety rule. The same lock-wrapped patch helper also fixes the creditSaleShare and floor-defender unlocked writes (rank 13).

**Evidence.** app/api/wallet/[address]/hex/route.ts:56-62 Promise.all (confirmed); holder-tick.ts:183-186 unlocked RMW of full record; wallet-hex-store.ts:87 withWalletLock is opt-in

### 9. Remap off-palette neon-magenta (#FF0070) to a brand token
`CITY SITE` · impact 3 · effort S

**Why.** Locked palette is black/gold/ivory/dust-red with no magenta. --neon-magenta #FF0070 is fully-saturated hot pink shipping on the public /play arcade door (a cold acquisition surface) plus 6+ game UIs (ProofOfSignal, Reckoning, HexMatch, RestoreSignal, DailyHub). One variable re-point corrects every call site at once, the same way --neon-cyan was already remapped to gold.

**How.** In app/globals.css:78 re-point --neon-magenta to dust-red (--state-warning #FF8A6E) or a second gold; this cascades to all call sites. Optionally rename the token to kill the misnomer. Verify the 6 game call sites still read on-brand.

**Evidence.** app/globals.css:78 --neon-magenta:#FF0070; live at app/play/page.tsx:67, ProofOfSignal.tsx:484/497, Reckoning.tsx:595, HexMatch.tsx:744, RestoreSignal.tsx:1096, DailyHub.tsx:49; --neon-cyan (line 77) is already #E9C984 gold (not a violation)

### 10. Recolor homepage collection cards off traffic-light status colors
`CITY SITE` · impact 4 · effort S

**Why.** Five collection cards on the premium-collector homepage render in server-health green/yellow/salmon (--state-active/--state-surge/--state-unstable/--state-warning), reading as a status dashboard rather than a brand. Worse, Crypt TCG and Emile both use --state-surge gold so they read as duplicate cards. Cheap brand-discipline win on the front door.

**How.** Give each connected collection a real brand color in the gold/ivory/dust-red/void-purple family and reference those instead of --state-* in OtherSignalsStrip.tsx (lines 43-89) and collections.ts (52-84). Reserve --state-* for live/online/error indicators. Ensure no two cards share a hue.

**Evidence.** OtherSignalsStrip.tsx:43/54/65/77/89 use --state-* tokens; globals.css:184-187 defines them as green/gold/yellow/salmon; Crypt TCG (line 54) and Emile (line 77) both --state-surge

### 11. Per-surface OG share cards for /demo, /citizens, /collections
`CITY SITE` · impact 3 · effort M

**Why.** Six pages all share the identical /api/og/universe?b=2 card as the homepage (b=2 is a no-op the route never reads). The preview never matches the destination, under-selling each surface. Distribution is the known bottleneck and per-surface cards are a cheap virality lever currently left completely flat.

**How.** Branch the universe route on a query param (the v=universe variant pattern already exists at universe/route.tsx:343) to give /demo and /citizens their own card. Reuses the existing FreelonCard composition; update the metadata image URLs on those pages.

**Evidence.** app/api/og/universe/route.tsx:327 reads only searchParams v (b=2 never read); identical '/api/og/universe?b=2' on layout.tsx, citizens, page, collections, demo

### 12. Change the runtime error boundary headline from '404' to a crash word
`CITY SITE` · impact 3 · effort S

**Why.** app/error.tsx (the catch-all runtime crash boundary, not not-found) renders a 96-240px '404' headline for real server crashes. A stranger reads that as a dead link and leaves, contradicting the team's own 'kill the 404 title' decision and obscuring crash triage.

**How.** Change the error.tsx headline (line 50) from '404' to a non-numeric crash word or the hex glyph (e.g. 'FAULT' / the gold mark); keep the gold kicker and RETRY button. Reserve the big '404' for app/not-found.tsx only.

**Evidence.** app/error.tsx:5 GlobalError; :50 literal '404' at clamp(96px,22vw,240px); RETRY at :87-90

### 13. Align the Mars game to canonical palette/type at the /mars door
`MARS COMMAND` · impact 4 · effort M

**Why.** Mars runs a different gold (#d8b25c vs canon #C8A75D), pure #000 background (vs the lifted #0B0B0D), and monospace-only type with no Clash Display. It reads as a different product at the /mars door -- a hard brand seam on a shipped flagship game.

**How.** Repoint Mars :root to canonical tokens (--gold:#C8A75D, --gold-bright:#E9C984, --ivory:#F5F2E8), lift page background to #0B0B0D (the 3D canvas itself can stay black), and load Clash Display for HUD/brand headers while keeping Space Mono for terminal readouts. Re-apply to BOTH mars-command/index.html and public/mars/index.html (the deployed copy diverges -- known sync trap).

**Evidence.** mars-command/index.html:9-11 off-brand gold; :17 background #000; :18 SF Mono only; same off-brand values in public/mars/index.html:9/17

### 14. Fix the proof share card aspect ratio (1:1 image tagged summary_large_image)
`CITY SITE` · impact 3 · effort M

**Why.** /proof is the page literally built to be shared as ownership proof, yet its share card is a 1024x1024 square tagged summary_large_image (expects ~1.91:1). Twitter center-crops it to a strip (clipping the identity caption) or shrinks it to a thumb. The one page meant to go viral previews broken.

**How.** Render a 1200x630 proof card and point og:image/twitter:image at it; at minimum change card to 'summary' so it isn't force-cropped. proof/page.tsx:15,19.

**Evidence.** app/proof/page.tsx:15 image 1024x1024; :19 card summary_large_image; public/proof/freelon-2268.png confirmed 1024x1024

### 15. Rewrite the stale /crypt-tcg file header (says 'coming soon / no TCG language')
`CITY SITE` · impact 3 · effort S

**Why.** The governing doc-comment still says 'placeholder lore page', 'mark it as coming soon', 'do NOT use trading-card/deck language' -- directly contradicting the shipped page that openly markets 'the card game... build a deck and battle the AI now.' In a fast-shipping solo repo a future session could re-apply the old rule and regress live marketing copy. Doc-only edit, zero runtime change.

**How.** Rewrite app/crypt-tcg/page.tsx:1-16 to reflect shipped reality: game is live, door points at play.freeloncity.com, TCG language allowed since the 2026-06-10 launch.

**Evidence.** app/crypt-tcg/page.tsx:1-16 stale brief; :28-44 live metadata markets the card game; collections/page.tsx:137-138 also markets it

### 16. Fix mobile MetaMask deep-link dropping ?ref= and hash on /sync connect
`CITY SITE` · impact 3 · effort S

**Why.** A mobile visitor with no injected wallet on a deep-linked /sync?ref=... URL gets bounced into MetaMask's in-app browser landing on bare /sync, losing referral attribution and return context. This is exactly the no-injected-wallet mobile path that has repeatedly broken connect for this product. One-line fix.

**How.** In SyncWalletAction.tsx:63-64 include window.location.search + window.location.hash before building the metamask.app.link/dapp/ URL, so ?ref= and token context survive the round-trip.

**Evidence.** app/sync/SyncWalletAction.tsx:63-64 builds host+pathname only, dropping search+hash

### 17. Add a Crypt TCG card to the /play arcade hub
`CITY SITE` · impact 3 · effort S

**Why.** The /play arcade routes its highest-intent play traffic past the one compounding holder game (Crypt TCG) -- absent from both game grids -- and the closing CTA sends them to /demo instead. No measured entry to the owned-card loop on the busiest play surface. Adds a card, deletes nothing (mini-games preserved).

**How.** Add a Crypt TCG card to /play (GAMES or MORE_GAMES) linking to play.freeloncity.com, and tag crypt_play_click{from:arcade} to compare arcade vs direct landing as game entry points.

**Evidence.** app/play/page.tsx GAMES 43-76 + MORE_GAMES 101-120 (no Crypt TCG); closing CTA :309 -> /demo

### 18. Surface /proof on the buy path and kill the /play/proof name collision
`CITY SITE` · impact 3 · effort S

**Why.** The sharpest 'why own one' argument (the render-moat / published-prompt page) is reachable only from two in-page spots and is absent from all three nav components, so cold traffic rarely sees it. Its URL also collides with /play/proof (a Wordle game), making Discord 'proof' references ambiguous (collision documented in DailyHub.tsx).

**How.** Add /proof as a secondary CTA on the demo exhaustion wall and the homepage close (1-2 link additions). Optionally rename the route to /render-moat to end the /play/proof collision.

**Evidence.** app/proof/page.tsx exists; linked only from citizens/page.tsx:118 + TransformsWall.tsx:65; absent from Header/MobileNav/BottomNav; collision at DailyHub.tsx:32-34

### 19. Verify Crypt TCG prod analytics + add an absent-beacon warning
`CRYPT TCG` · impact 4 · effort S

**Why.** If VITE_ANALYTICS_URL is unset in the Vercel build (it lives only in local-only .env.local) or Upstash is unconfigured on city, every play event flushes to a no-op and the entire game/owned-cards funnel reads zero with no warning -- a silently-dark gate number for the compounding holder loop.

**How.** 2-minute prod check: confirm the Vercel env var is set and GET /api/play-event returns a non-zero read. Add a prod startup console.warn when the beacon URL is absent so future regressions are loud. No code-path change.

**Evidence.** analytics.ts:159-164 returns NoopAnalyticsSink in prod without VITE_ANALYTICS_URL; play-event/route.ts:63 drops when !hasUpstash; .env.local is local-only, not used by Vercel

### 20. Default the /crypt-tcg game URL fallback to play.freeloncity.com
`CITY SITE` · impact 2 · effort S

**Why.** If NEXT_PUBLIC_CRYPT_GAME_URL is missing on a deploy/preview, the public 'PLAY THE GAME' door silently routes players to the raw unbranded crypt-game.vercel.app instead of branded play.freeloncity.com -- off-brand and potentially CORS-mismatched against the bridge. A latent one-line footgun.

**How.** Change the fallback default in app/crypt-tcg/page.tsx:49 to 'https://play.freeloncity.com' so the worst case is still on-brand.

**Evidence.** app/crypt-tcg/page.tsx:49 GAME_URL = process.env.NEXT_PUBLIC_CRYPT_GAME_URL || 'https://crypt-game.vercel.app'

---

## Full backlog — all 119 findings

### Impact 5★

- **The owner funnel goes dark at "did the agent actually produce something" — run_started fires but run_completed never does** `CITY SITE` · effort S · instrumentation
  - _Problem:_ run_started fires but no completion/failure event exists, so 'of owners who activated, what fraction got a real first output' is unmeasurable.
  - _Upgrade:_ Add run_completed on the ok branch (713), run_failed{reason} on capacity/error branches (722-724), first_run_completed once on the justActivated path.
  - _Evidence:_ CitizenAgentDashboard.tsx:336 run_started; finish() lines 712-725.
  - _Verified:_ VERIFIED: CitizenAgentDashboard.tsx:336 fires trackEvent("run_started"). finish() (lines 712-725) sets output/refreshes history with zero trackEvent on any of its 4 branches. Repo-wide grep for run_completed|first_run|run_failed returned zero call sites. Problem real, fix is concrete and minimal.

- **The most expensive owner transition — OWN A FREELON → activate — is both unmeasured and unguided (cold buyer exits to OpenSea, never returns)** `CITY SITE` · effort M · conversion
  - _Problem:_ Buyer leaves to OpenSea with no scent trail or return reminder; opensea_click→agent_view{owner:true} gap is unsized and unbridged.
  - _Upgrade:_ Name the opensea_click→agent_view{owner:true}→activation_paid funnel; add a return banner via localStorage flag read by IdentityGreeting (CLAIM YOUR FIRST CITIZEN already at :146).
  - _Evidence:_ page.tsx:137,238 OWN→TrackedOpenSeaLink; TrackedOpenSeaLink.tsx:29 fires then user leaves; CitizenAgentDashboard.tsx:149 agent_view{owner}.
  - _Verified:_ VERIFIED: page.tsx:137 and :238 are TrackedOpenSeaLink (OWN A FREELON, target _blank); TrackedOpenSeaLink.tsx:29 fires opensea_click then leaves the property. CitizenAgentDashboard.tsx:149 agent_view only carries owner:o.isOwner. IdentityGreeting.tsx:146 CLAIM YOUR FIRST CITIZEN confirmed. No localStorage return-flag exists today. Effort M is honest (interstitial + banner = real UI). Does not touch the ETH path — constraint-safe.

- **No consumer terms for the paid ETH awakening — the only real money-in transaction is uncovered** `CITY SITE — /legal/terms vs the awakening pay flow` · effort M · consumer/payments
  - _Problem:_ The site takes real ETH (eth_sendTransaction) for premium agent abilities, but the Terms of Use never name the paid awakening. The non-refundable consent lives only in an in-component checkbox, not in any readable policy.
  - _Upgrade:_ Add an 'Awakening (paid activation)' section to /legal/terms covering: what the one-time ETH switches on, final/non-refundable, AS-IS at project discretion (tie to section 4), not a token sale/security, buyer responsible for gas and exact amount. Link it from WorkspaceUnlock's footer. Lawyer review before ship.
  - _Evidence:_ WorkspaceUnlock.tsx:117 fires eth_sendTransaction; the non-refundable consent is ONLY a checkbox at line 163 ('I understand this is an on-chain, non-refundable payment'). terms/page.tsx sections 1-13 cover site/PFP Studio/Carrier/Daily Signal/honorary/tweets but never the ETH awakening. legal/page.tsx:24 describes Terms as only 'site, the PFP Studio, the Carrier system, and the Daily Signal'.
  - _Verified:_ VERIFIED: WorkspaceUnlock.tsx:117 (eth_sendTransaction) + :163 (checkbox-only consent); terms/page.tsx has 13 sections, none mention the ETH awakening; legal/page.tsx:24 scopes Terms to non-payment surfaces only. Real gap.

- **The one Freysa-class spectacle is built and switched OFF — Guard the Pot is dark behind an env flag** `CITY SITE — /play/guard + play hub` · effort S · Virality / Growth
  - _Problem:_ FREELON already built the bounded, self-funding, single-winner public spectacle (the exact Freysa mechanic) and it ships OFF. The default hub leads with non-viral arcade clones while the best distribution asset is dark.
  - _Upgrade:_ Light a small bounded round (GUARD_POT_LIVE=true with a modest fixed prize), surface GUARD_CARD as the hub's first tile, and let the existing crack-pulse cron fire tweetGuardPot from @4040hex. Reuse of finished code.
  - _Evidence:_ app/play/page.tsx + route + cron + lib/share.ts
  - _Verified:_ VERIFIED. app/play/page.tsx:83-94 gates GUARD_CARD behind process.env.GUARD_POT_LIVE==='true' (default VISIBLE_GAMES omits it); app/api/play/guard/attempt/route.ts:67-69 fail-closes when flag!=='true'; app/api/cron/crack-pulse/route.ts:41-42 returns 'disabled' when GUARD_POT_LIVE unset; lib/share.ts:122 tweetGuardPot() exists and is fully wired into the cron but nothing fires it in prod. Copy is sink-only/burn compliant (route header lines 8-16). All accurate.

- **The win screen — the game's single most brag-worthy moment — has no SHARE button** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort S · retention/distribution
  - _Problem:_ Securing the planet is the peak emotional beat, but the win overlay offers no path to share it. The one share entry point is buried behind a mode the player may never open. With distribution as the stated #1 bottleneck and the OG-card/share pipeline already built, this is the highest-leverage gap.
  - _Upgrade:_ Add a prominent 'POST YOUR PLANET ▸' button to winOverlay (and the 'CONTACT PURGED' result) calling share(). Reuse share() verbatim. Also surface a small share chip in normal play, not only inside the map legend.
  - _Evidence:_ winOverlay (599-606) has only #winContinue and #winNew buttons; wired at 1293-1294 to close/newPlanet, no share. triumph() (4448-4456) fills #winSub and opens the overlay but never calls share(). The full share() (4955) is wired only at 6140 via #shareBtn (545), which lives inside #mapLegend — display:none except body.mapping (414).
  - _Verified:_ VERIFIED: winOverlay 599-606 has only Continue/New Planet; triumph 4448-4456 opens overlay w/o share; #shareBtn lives in #mapLegend (545) gated by body.mapping CSS (414); share() at 4955 only reachable via 6140 handler.

### Impact 4★

- **Homepage archive cards are tinted with SYSTEM-STATUS colors (green/yellow/salmon), not brand colors** `CITY (homepage / archive)` · effort S · Brand palette discipline
  - _Problem:_ Five collection cards render in traffic-light green/yellow/red — server-health dashboard language on a premium collector homepage — and two cards (Crypt TCG + Emile) share the exact same --state-surge gold so they read as duplicates.
  - _Upgrade:_ Give each connected collection a real brand color in the gold/ivory/dust-red/void-purple family and reference those instead of --state-* in both OtherSignalsStrip and collections.ts. Reserve --state-* for live/online/error indicators. Ensure no two cards share a hue.
  - _Verified:_ VERIFIED: OtherSignalsStrip.tsx:43/54/65/77/89 set statusColor to var(--state-active)/--state-surge/--state-unstable/--state-surge/--state-warning; globals.css:184-187 defines those as #7AE08D green / #E8B247 gold / #FFD27A yellow / #FF8A6E salmon. statusColor drives card border (line 191), bg gradient (192), image border (210), overlay (232), status dot+label (245-249). collections.ts:52-84 makes the identical --state-* choice. Crypt TCG (line 54) and Emile (line 77) BOTH use --state-surge — duplicate-hue collision confirmed.

- **Six live links point at /start, which now 308-redirects to /help — including a self-loop on /help and a mislabeled awaken link on the demo conversion wall** `CITY SITE` · effort S · conversion / broken scent trail
  - _Problem:_ The /start->/help fold (commit bff7259) left six dangling /start links. Two are actively broken UX: app/help/page.tsx:61 sends a /help reader to /start which redirects right back to /help (dead loop); and the demo exhaustion wall labels its link 'see how awakening works' but lands the user on /help (wallet troubleshooting), breaking the scent trail at the highest-value conversion moment.
  - _Upgrade:_ Repoint all six /start links per context: demo wall + home + canon -> the on-site awaken explainer or /help#free; /help's own '2-minute guide' line should drop the self-link. Global find/replace of /start, no new page.
  - _Evidence:_ app/start/page.tsx:15 permanentRedirect('/help'); /start links at app/page.tsx:263, app/canon/page.tsx:251, app/help/page.tsx:61, components/DemoChat.tsx:455, components/CitizenAgentDashboard.tsx:289, components/VaultClient.tsx:605
  - _Verified:_ VERIFIED: app/start/page.tsx:15 permanentRedirect('/help'); grep confirms all six /start references at the exact cited lines; DemoChat.tsx:455 link text is 'see how awakening works ->'; help/page.tsx:61 self-loops. Fold landed in git bff7259, references left behind.

- **Two parallel 'unlock' systems with near-identical naming — /api/unlock (HEX, reveals lore) vs /api/citizens/[id]/unlock (ETH, awakens the agent)** `CITY SITE` · effort M · newcomer confusion / parallel systems
  - _Problem:_ Two completely different actions both labeled 'unlock': CitizenDeepLore spends off-chain HEX to reveal blurred lore text ('UNLOCK COST' / 'UNLOCK FOR ME'), while WorkspaceUnlock spends real ETH to awaken the agent (the revenue path). WorkspaceUnlock's own header documents holders already hit a dead-end ('can't find where to unlock'). The collision is documented newcomer confusion.
  - _Upgrade:_ Rename user-facing verbs so they never collide: ETH path = AWAKEN (brand canon), HEX lore reveal = REVEAL/DECRYPT. Keep both API routes (load-bearing); change only labels/buttons in CitizenDeepLore. Pure naming cleanup, no HEX faucet, no new feature.
  - _Evidence:_ components/CitizenDeepLore.tsx:70 POSTs /api/unlock/${id} (HEX); CitizenDeepLore.tsx:130,146 'UNLOCK COST'/'UNLOCK FOR ME'; components/WorkspaceUnlock.tsx:76 POSTs /api/citizens/${id}/unlock kind:'activate' (ETH); WorkspaceUnlock.tsx:5-13 documents dead-end
  - _Verified:_ VERIFIED: CitizenDeepLore.tsx:70 POSTs /api/unlock/${citizenId} with carrier.handle (HEX spend); labels 'UNLOCK COST'(:130)/'UNLOCK FOR ME'(:146). WorkspaceUnlock.tsx:76 POSTs /api/citizens/${id}/unlock kind:'activate' (ETH); header:5-13 documents the dead-end. No constraint violation (keeps routes, only renames labels).

- **Cold buyer's OWN -> OpenSea path has no on-site return loop to AWAKEN — every primary buy CTA dumps to OpenSea and the journey ends there** `CITY SITE` · effort M · core spine / conversion
  - _Problem:_ Every prominent OWN CTA links straight out to OpenSea with target=_blank and no return breadcrumb. The awaken flow only renders inside /agent/[id] for someone who already knows to go there. The post-purchase moment — where intent is highest and the second ETH revenue event lives — is unowned.
  - _Upgrade:_ Add a one-line 'after you buy, come back to /my-citizens to awaken it' microcopy next to every OpenSea CTA (extend the existing wallet-needed note pattern at app/page.tsx:261), and/or a ?ref=own return state. Microcopy + my-citizens nudge, no new page, no HEX faucet.
  - _Evidence:_ OpenSea CTAs with no return loop: app/page.tsx:137 (home_hero) & :238 (home_close), components/DemoChat.tsx:438/450, app/proof/page.tsx:139; awaken flow lives in WorkspaceUnlock.tsx -> /api/citizens/[id]/unlock; CitizenAgentExplainer.tsx:44-46 describes buy->awaken->run but isn't on the buy path
  - _Verified:_ VERIFIED: home_hero CTA at page.tsx:137, home_close at :238, proof at :139, DemoChat :438/:450 all link opensea.io/collection/freelons target=_blank with no return. CitizenAgentExplainer.tsx:44-46 describes buy->awaken->run off the buy path. Upgrade is microcopy/nudge only — no SINK-ONLY violation.

- **unlock_quote_started → activation_paid measures pay-intent drop, but the wallet/connect prerequisite before it is unmeasured** `CITY SITE` · effort S · instrumentation
  - _Problem:_ Between quote-started and paid, signature-rejected and no-wallet-browser both dead-end with an error string and no event, so a leak there can't be diagnosed as pricing vs wallet-environment.
  - _Upgrade:_ Fire unlock_blocked{reason: no_wallet_browser|sig_rejected|quote_error} at the three existing failure branches (672, 628, 685).
  - _Evidence:_ CitizenAgentDashboard.tsx:603 unlock_quote_started, :653 activation_paid; silent failures at :672 (no wallet browser), :628 (quote catch), :685 (pay cancelled/failed).
  - _Verified:_ VERIFIED exactly as described: line 672 setErr("Open this page in your wallet's browser to pay.") with no event; line 628-630 catch (sig rejected during quote) no event; line 685 setErr("Payment was cancelled or failed.") no event. unlock_quote_started:603 and activation_paid:653 confirmed. Three concrete insertion points, display-only, no ETH-path change. Impact 4 honest.

- **Parallel hex ticks race: locked sweep credits are clobbered by unlocked cursor writes** `CITY SITE` · effort M · concurrency / shared-state race
  - _Problem:_ For a single wallet the three ticks run in Promise.all (route.ts:56-62). Sweep credits under the wallet lock (creditWalletHexCapped), but runHolderTick finishes with an UNLOCKED getWalletHex->set lastHolderTickDay->setWalletHex that overwrites the whole record. A sweep credit landing between that read and write is erased.
  - _Upgrade:_ Route the cursor-only writes through withWalletLock (a lock-wrapped stampCursor helper) OR run the three ticks sequentially in the route, matching holder-tick.ts:172-176's own documented sequential-safety rule.
  - _Evidence:_ app/api/wallet/[address]/hex/route.ts:56-62 Promise.all over runHolderTick+runFloorDefenderTick+processSweepsForWallet; holder-tick.ts:183-186 unlocked read-modify-write of the full record; wallet-hex-store.ts:87-116 withWalletLock only protects writers that use it.
  - _Verified:_ VERIFIED: route.ts:56-62 runs the three ticks in Promise.all for one wallet; holder-tick.ts:183-186 does getWalletHex->set lastHolderTickDay->setWalletHex with no lock import; withWalletLock at wallet-hex-store.ts:87 is opt-in. Real lost-write window. Impact kept at 4 (this is the hottest authenticated endpoint and the loss is real HEX).

- **"HEX NET WORTH" card prices held NFTs in ETH against the live floor** `CITY SITE — /dashboard (HexNetWorth component)` · effort S · copy-safety
  - _Problem:_ A ⬡-glyph-labeled card called HEX NET WORTH shows an ETH valuation derived from the OpenSea floor, blurring city HEX with ETH market value and reading as an appreciation claim.
  - _Upgrade:_ Rename off "net worth"/stop quoting ETH; show owned-citizen count + rank, not an ETH total derived from floor.
  - _Evidence:_ HexNetWorth.tsx:35 "⬡ YOUR HEX NET WORTH", 38 "price the citizens you hold against the live floor", 51 "⬡ HEX NET WORTH", 52 {data.value.toFixed(4)} ETH; used dashboard/page.tsx:115
  - _Verified:_ VERIFIED. HexNetWorth.tsx:35 "⬡ YOUR HEX NET WORTH", :38 "connect your wallet to price the citizens you hold against the live floor", :51 "⬡ HEX NET WORTH", :52 renders {data.value.toFixed(4)} ETH, :54 "priced per civilization · global floor". Imported+used at dashboard/page.tsx:115. The ⬡ glyph sits on an ETH-valued card — confirmed blur.

- **Demo's killer differentiator (persistent memory across owners) is told, never shown** `CITY SITE — /demo exhaustion wall` · effort M · Utility / Retention
  - _Problem:_ For 5 turns the demo is just ChatGPT with a portrait; the retention reason (persistent on-chain history that travels with the NFT) is asserted in prose at the paywall, not demonstrated. The stranger has no felt evidence the thing remembers.
  - _Upgrade:_ Make the demo SHOW memory in-session: have the citizen reference an earlier user statement after turn 2, and render a live 'REMEMBERS: [fact]' / work-record panel that visibly fills as they talk, so the wall closes on a demonstrated capability.
  - _Evidence:_ components/DemoChat.tsx:36-40, 397-407
  - _Verified:_ VERIFIED. DemoChat.tsx:36-40 STARTERS ask about work-record/level/memory; the exhaustion wall (DemoChat.tsx:397-407) only PROMISES memory in prose ('Own a FREELON and it remembers this exact conversation' at :403-404). No visible persistent-state panel and the 5 turns are metered/ephemeral ('This conversation is about to vanish', :400). The 'told not shown' gap is real. Effort M is fair (needs in-session memory echo + a panel).

- **Transmission image-URL validator rejects the exact twimg URLs its own hint tells holders to paste** `CITY SITE — /transmissions (primary holder participation surface)` · effort M · friction-bug
  - _Problem:_ The validator requires the image extension in the URL PATH before any "?", but real X media URLs (https://pbs.twimg.com/media/Gxxxx?format=jpg&name=small) carry the extension as a QUERY PARAM — so they fail. The placeholder and hint explicitly recommend grabbing exactly these URLs via "Copy Image Address" from X. A holder follows the instructions and is told they did it wrong, suppressing participation the weekly-prize moat depends on.
  - _Upgrade:_ Accept format-style URLs (also allow ?format=(jpg|png|webp)) and validate by server-side content-type rather than path extension, OR add a clipboard/file image upload so non-technical holders never touch a URL. At minimum fix the placeholder/hint so they don't recommend a shape that fails.
  - _Evidence:_ components/TransmissionSubmit.tsx:48 (submit) + :206 (preview), placeholder :197, hint :202
  - _Verified:_ VERIFIED: regex `/^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i` at lines 48 and 206 requires a literal .ext immediately before optional '?'. Placeholder :197 = "https://pbs.twimg.com/media/…"; hint :202 = "Copy Image Address" from X. twimg /media/<id>?format=jpg has no path extension → rejected. Error string at :49 matches. Genuine self-contradicting bug.

- **No absolute per-wallet daily HEX ceiling — value-backed faucets stack uncapped** `CITY SITE — HEX economy` · effort M · faucet-cap-leak
  - _Problem:_ FARMABLE_DAILY_CAP only bounds the low-effort bucket; snipe, sale-share, fresh-blood and unlock bonus are explicitly excluded and have no global backstop, so a single wallet's worst-case daily issuance is unbounded by any single number.
  - _Upgrade:_ Add ECONOMY.WALLET_DAILY_HARD_CAP and enforce it inside the wallet lock in creditWalletHex for all credits except admin/migration/unlock-bonus kinds — the documented backstop above all stacked faucets.
  - _Evidence:_ No WALLET_DAILY_HARD_CAP / global ceiling constant exists in economy-constants.ts (grep across lib/ and app/ returns nothing). Red-team backlog item 3 (HEX_ECONOMY_RED_TEAM.md:67) names exactly this missing backstop; creditSnipeBounties (economy-extras.ts:277) and creditSaleShare (:99) credit via plain creditWalletHex with no farmable flag.
  - _Verified:_ VERIFIED. grep for WALLET_DAILY_HARD_CAP/HARD_CAP/global ceiling across lib/ + app/ = zero hits; read all of economy-constants.ts — no such constant. HEX_ECONOMY_RED_TEAM.md:67 is the open backlog item (items 1/2/4 already done in code, but 3 is not). Snipe cap confirmed 3×500=1500⬡/day (red-signal-store.ts:66 caps at SNIPE_BOUNTY_CAP=500; economy-extras.ts:218,262 cap count at SNIPE_MAX_PER_DAY=3). Sale-share genuinely uncapped per credit. Not a faucet (it's a cap) so no LOCKED-constraint violation. Impact 4 honest.

- **Sale-share faucet is wash-trade-shaped at the 100k peg** `CITY SITE — HEX economy` · effort M · faucet-sink-balance
  - _Problem:_ Sale-share credits 5% of sale ETH as HEX (5000⬡ on a 1 ETH sale) up to 3/day with no per-credit ceiling, no global cap, and no self-deal guard — unlike snipe which blocks self-deals. Two owned wallets can wash a freelon and the seller prints thousands of ⬡.
  - _Upgrade:_ Cap sale-share per credit at a fixed ECONOMY.SALE_SHARE_HEX_CAP and/or fold it under the global WALLET_DAILY_HARD_CAP; optionally add a counterparty self-deal guard mirroring the snipe seller check.
  - _Evidence:_ economy-extras.ts:96-104 share=(eth*SALE_SHARE_PCT)/100, hex=ethToHex(share), credited via plain creditWalletHex; SALE_SHARE_PCT=5 (economy-constants.ts:73), HEX_PER_ETH=100_000 (:19), SALE_SHARE_MAX_PER_24H=3 (:74). Snipe has a self-deal block (economy-extras.ts:272 rs.seller check); sale-share has no equivalent. Not X-gated (red-team finding D, HEX_ECONOMY_RED_TEAM.md:34).
  - _Verified:_ VERIFIED. economy-extras.ts:96-104 math + plain creditWalletHex confirmed; constants confirmed (:19,:73,:74). Self-snipe block at :272 confirmed; no SALE_SHARE_HEX_CAP constant exists (grep zero). 5000⬡ per 1 ETH sale math is correct. Caveat lowering severity vs the writeup: the on-chain cost of a wash (OpenSea fee + creator royalty + gas, paid in real ETH) is a real economic deterrent the finding under-weights, and 1 ETH+ self-sales are atypical for this floor — but the asymmetry and missing self-deal guard are real. Impact 4 stands; it is the largest uncapped credit.

- **'Forever' durability promise on the awakening contradicts the Terms 'not contractual' carve-out** `CITY SITE — WorkspaceUnlock + homepage How-It-Works` · effort S · securities/financial-claims
  - _Problem:_ A paid buyer is told abilities are theirs 'forever' and persist through resale, while Terms section 4 reserves the right to remove the same benefits. That is a guarantee the project may not be able to keep, attached to a real-money purchase.
  - _Upgrade:_ Drop bare 'forever' from WorkspaceUnlock.tsx:142/156 (and AgentWorkspace.tsx:922) in favor of a durable-intent statement ('one-time, no recurring fee; the awakening and training history travel with the FREELON'). Align Terms section 4 and the paid copy so they don't say opposite things about the same paid thing.
  - _Evidence:_ WorkspaceUnlock.tsx:142 sells abilities '— forever' and :156 'one-time · forever'; AgentWorkspace.tsx:922 repeats 'forever'; page.tsx:189 step 02 'switches it on, and it stays awake through resale'. terms/page.tsx:18-19 (section 4): holder benefits 'may change, expand, or be removed. None of them is a promised, contractual... benefit.'
  - _Verified:_ VERIFIED: 'forever' at WorkspaceUnlock.tsx:142 and :156, plus AgentWorkspace.tsx:922; resale-persistence at page.tsx:189; the removable-benefits carve-out at terms/page.tsx:18-19. The contradiction is real on a paid surface.

- **Citizen-page primary CTA promises "chat, generate, build history" but a non-owner lands on a pay-wall** `CITY SITE — app/citizens/[id]/page.tsx (4,040 indexed pages)` · effort M · Conversion dead-end / expectation mismatch
  - _Problem:_ BEAT 3 is the single primary CTA and reads "Open the workspace → Chat, generate, and build a permanent work history… like opening ChatGPT or Claude" but for a non-owner the workspace renders a LOCKED pay panel, not chat. The only own-this-token path is a secondary OpenSea link in the footer — an expectation/reality mismatch at the highest-leverage conversion moment on the most-shared surface.
  - _Upgrade:_ Make the primary CTA ownership-aware: non-owners get "Awaken this FREELON →" straight to the unlock panel (or OpenSea for this token); reserve "Open the workspace" for owners. At minimum soften the sub-copy so it doesn't promise immediate chat to a soon-to-be-paywalled visitor.
  - _Evidence:_ app/citizens/[id]/page.tsx:392-396 the one CTA links to /agent/${tid} with sub-copy promising chat/generate like ChatGPT/Claude. AgentWorkspace.tsx:916-932 the non-owner `showUnlock` branch renders "LOCKED — unlock is the only action" + WorkspaceUnlock pay panel. Only buy path is VIEW ON OPENSEA in NEXT SIGNAL footer (page.tsx:499).
  - _Verified:_ Verified citizens/[id]/page.tsx:392-396 CTA copy and AgentWorkspace.tsx:916-924 showUnlock branch renders the LOCKED pay panel (not chat) for non-owners; OpenSea link confirmed at page.tsx:499. Uses brand verb 'Awaken' per canon.

- **Carrier starting balance (50⬡) folds into withdrawable wallet HEX — a real HEX source per X account** `CITY SITE — economy (HEX source)` · effort S · economy-leak
  - _Problem:_ POINTS.STARTING=50 is granted free on carrier init and foldCarrierIntoWallet credits it into the withdrawable wallet ledger, so every verified X handle mints 50⬡ of real spendable HEX from nothing on first wallet bind. Sybil with N handles harvests 50N⬡. This is gameplay SOURCING real HEX — contradicts the sink-only spirit even though the fold itself is idempotent.
  - _Upgrade:_ Set POINTS.STARTING = 0 (carrier.ts:53). Earned/paid HEX is untouched. If a welcome UX balance is wanted, keep it isolated as carrier-display points and fold only genuinely-earned hex.
  - _Evidence:_ lib/carrier.ts:52-59 POINTS.STARTING=50; app/api/unlock/[id]/route.ts:62-77 lazily creates carrier with hexPoints: POINTS.STARTING; lib/hex-spend.ts:93 foldCarrierIntoWallet does creditWalletHex(w, carrier.hexPoints,…).
  - _Verified:_ VERIFIED in code. carrier.ts:53 STARTING:50, also set in initCarrier (line 149) and unlock route line 72. hex-spend.ts:93 credits carrier.hexPoints (incl. the unearned 50) into the wallet ledger. Idempotent per (handle,wallet) via NX lock + migratedTo, so once-per-handle, but the grant itself is real unearned HEX reaching the spendable ledger. Note: carrier-store getCarrier may return null for never-visited handles, so the fold of STARTING fires only after a carrier record exists (lazily created in the unlock path itself) — leak is real, sized at 50⬡/handle as described.

- **defender-scan credits +500/+2000⬡ on OpenSea offers with NO contract validation (imports CONTRACT, never uses it)** `CITY SITE — economy (OpenSea event trust)` · effort S · economy-leak
  - _Problem:_ defender-scan imports CONTRACT but never references it and never reads/validates the consideration target contract. It trusts the OpenSea collection-offers slug entirely, then credits the largest faucet amounts in the system (500–2000⬡) to the offerer. Sibling creditors in economy-extras.ts enforce a contract+tokenId-range guard; this path does neither, so any cross-collection/malformed offer surfaced under the slug credits real HEX uncapped (these credits omit the farmable flag).
  - _Upgrade:_ Validate each offer's consideration contract equals CONTRACT before crediting; reject when absent or mismatched. Mirror the `if (c && c !== CONTRACT.toLowerCase()) continue` guard already used in economy-extras.ts so all OpenSea creditors share one trust model.
  - _Evidence:_ lib/defender-scan.ts:27 imports CONTRACT (only reference in file); consideration type declared line 52 but never read; credits REWARD_PLACED=500 (line 161) and REWARD_HOLD_7D=2000 (line 176) keyed only on order_hash + offerer wallet regex + price>=floor*1.4. Compare lib/economy-extras.ts:72-77 contract+range guard.
  - _Verified:_ VERIFIED. grep confirms CONTRACT appears ONLY on line 27 of defender-scan.ts (unused). No consideration/identifier read. Credits gated only by offerer-is-wallet + eth>=threshold. economy-extras.ts:74 confirms the sibling guard `if (c && c !== CONTRACT.toLowerCase()) return false` + tid 1..4040 exists. Honest caveat on impact: exploit requires OpenSea to return a non-freelons offer under the /offers/collection/freelons/all slug — a slug/endpoint-drift dependency, not attacker-direct — so it is a real trust-boundary gap but defensive, not a live open drain. Impact 4 retained because amounts are the system's largest and the value-backed path is uncapped.

- **Hero subline tries to carry the entire pitch in one ~40-word run — fails the 10-second scan** `CITY SITE — homepage hero` · effort S · 10-second clarity / copy
  - _Problem:_ Under an abstract h1, the subline crams provenance + six collections + four verbs (meet/own/train/battle) + a memory claim into one breath; a 10-second visitor can't parse which action is theirs. 'Battle in the card arena' also over-promises (Crypt TCG is a separate device-local game).
  - _Upgrade:_ Split into a what-it-is line and a what-you-do line mirroring the two CTAs; drop 'battle in the card arena' from the hero. Copy-safe, no value/return claims.
  - _Evidence:_ page.tsx:120,122-126
  - _Verified:_ VERIFIED: app/page.tsx:122-126 .hero-landing__tag is the single ~40-word sentence quoted verbatim (provenance + six collections + meet/own/train/battle + 'whole life travels with the NFT'); h1 line 120 is 'Where AI becomes a civilization.' Highest-impact finding; copy-only edit, violates no locked constraint.

- **Hero buries the 5-second test under abstraction — 'Where AI becomes a civilization' fails the stranger test** `CITY SITE — homepage hero` · effort S · Clarity / Copy
  - _Problem:_ A stranger cannot answer 'what do I get?' from 'Where AI becomes a civilization.' over a 38-word subline; the ownable object (an AI character you own and train) is demoted to word ~20. AI is the headline noun rather than the retention hook.
  - _Upgrade:_ Lead the h1 with the ownable object ('Own an AI character that remembers you.') and demote 'civilization' to a kicker; cut the subline to one clause.
  - _Evidence:_ app/page.tsx:119-126
  - _Verified:_ VERIFIED. app/page.tsx:120 h1 is exactly 'Where AI becomes a civilization.'; :122-126 subline is the cited ~38-word block ('alive on-chain since 2023. Six collections, every face a living AI citizen: meet one free, own one, train it, and battle...'); :118 hero-anchor img is aria-hidden/decorative and CSS-hidden <1100px per comment. All accurate; this is a copy reorder so effort S holds. Subjective 'fails stranger test' but the structural buried-object claim is real.

- **Six live CTAs point at /start, which 308-redirects to /help — including a self-referential loop on /help itself** `CITY SITE — homepage, demo wall, /canon, /help, CitizenAgentDashboard, VaultClient` · effort S · Broken/stale link
  - _Problem:_ All six links now take an extra 308 hop, and several link labels lie about the destination (demo wall promises "see how awakening works" → lands on FAQ index; /canon "START HERE" → troubleshooting). help/page.tsx:61 is worst: a user already on /help is told to read the "2-minute guide," clicks, bounces /start→/help, and lands where they started.
  - _Upgrade:_ Repoint all six links to /help (or a real #anchor on /help) and fix labels to match what /help is. Delete the self-referential link at help/page.tsx:61 outright — it can only loop. Pure find-and-replace; no redirect needed once links are direct.
  - _Evidence:_ app/start/page.tsx:15 `permanentRedirect("/help")`. grep confirmed exactly six /start links: app/page.tsx:263, app/canon/page.tsx:251, app/help/page.tsx:61, components/DemoChat.tsx:455, components/VaultClient.tsx:605, components/CitizenAgentDashboard.tsx:289.
  - _Verified:_ Verified app/start/page.tsx:15 permanentRedirect("/help") and grep found all six cited /start links at the exact lines; help/page.tsx:61 self-loop confirmed.

- **Public share templates bypass the copy-clean lint and use payment-flavored 'the city pays/rewards' language** `CITY SITE — lib/share.ts tweet builders + auto-post` · effort S · securities/financial-claims
  - _Problem:_ 'The city pays carriers' / 'rewards carriers' / 'earns 5,000 ⧡' read as monetary compensation for activity and are posted publicly. The /earn page carefully qualifies ⧡ as 'city credit, not money, not redeemable' but these high-distribution share strings drop the qualifier, and they never pass the copy-clean check (which only runs on paid Strategy output).
  - _Upgrade:_ Reword to credit-framed verbs ('the city credits active carriers in ⧡ — in-app credit, not money'). Extend the share-agent.test.ts pattern (it already uses expect().not.toMatch for value words at line 16) so any template with 'pays/rewards/earn … ⧡' must carry a non-redeemable qualifier or trip CI.
  - _Evidence:_ share.ts:207 'The city pays carriers in hex daily.'; :634 '____ ⬡ credited. The city rewards carriers who move first.'; :670 'top transmission of the week earns 5,000 ⬡.' copy-clean.ts:30 hasCopyBleed is only wired into cleanStrategyCopy (paid Strategy), not these hand-written templates. earn/page.tsx:152 has the 'not money, not redeemable' qualifier these omit.
  - _Verified:_ VERIFIED: exact strings at share.ts:207, :634, :670; copy-clean.ts only invoked from cleanStrategyCopy (no template path); earn/page.tsx:152 confirms the qualifier exists elsewhere; share-agent.test.ts:16 is the cited toMatch pattern. Accurate.

- **Every "New to NFTs? Start here" link dead-ends at /help, which has no buy/awaken walkthrough** `CITY SITE — prospective-collector path` · effort M · onboarding-gap
  - _Problem:_ Six surfaces send the unsure newcomer to /start → /help, but /help only covers wallet CONNECTION (assumes you already hold), routines, lingo, FAQ. There is no on-site explainer for get-wallet → fund-ETH → buy-on-OpenSea → awaken. The DemoChat exhaustion wall (highest-intent moment) promises "see how awakening works" and delivers a connection-troubleshooting page.
  - _Upgrade:_ Add a short "#own"/"#awaken" section to /help (or a dedicated /how-to-own): wallet → fund ETH → buy on OpenSea → return and awaken (one-time ETH, stays awake through resale). Point the DemoChat wall, AgentDashboard CTA, and homepage buy-note at it. Process only — no price/return claims.
  - _Evidence:_ app/help/page.tsx (no buy section), components/DemoChat.tsx:455-456, components/CitizenAgentDashboard.tsx:283+289
  - _Verified:_ VERIFIED: grep -iE 'opensea|buy|how to get|fund|ETH' app/help/page.tsx returns only the FREELON/awaken lingo defs (lines 185-186) — no walkthrough. No /how-to-own, #own, or #awaken page/anchor exists anywhere (find/grep both empty). DemoChat.tsx:455-456 wall links /start labeled "see how awakening works". Gap is real.

- **Public wallet OG share card renders "NET WORTH · X ETH" — a price/valuation claim on the most-shared surface** `CITY SITE — public OG share image` · effort S · copy-safety
  - _Problem:_ The auto-generated OG card prints a balance×floor ETH "net worth" valuation that travels off-site uncontrolled.
  - _Upgrade:_ Drop the price framing on the OG card and wallet page; replace NET WORTH label with a non-financial holdings/rank stat.
  - _Evidence:_ og/wallet route.tsx:46 netWorth=balance*floor; lines 125 "NET WORTH" + 136 {netWorth.toFixed(3)} ETH; wallet/[address]/page.tsx:384-388 "FREELON NET WORTH"/{netWorth.toFixed(4)} ETH
  - _Verified:_ VERIFIED. og/wallet/[address]/route.tsx:46 const netWorth = balance * floor; rendered as label "NET WORTH" (line 125) above "{netWorth.toFixed(3)} ETH" (line 136). wallet/[address]/page.tsx:384-388 renders "FREELON NET WORTH" / {netWorth.toFixed(4)} ETH with comment at 376-377 calling it "the investor question — what's it worth." Note: upgrade says "use rank, already computed" — rank IS computed on the wallet page but NOT in the OG route, so that specific swap needs rank wiring on the OG card.

- **The entire game/owned-cards funnel may be silently dark in production — VITE_ANALYTICS_URL is only set in .env.example, no prod env confirmed** `CRYPT TCG` · effort S · instrumentation
  - _Problem:_ If VITE_ANALYTICS_URL is unset in the Vercel build (or Upstash unconfigured on city), every play event flushes to a no-op and the gate number reads zero with no warning.
  - _Upgrade:_ 2-minute prod verification of the Vercel env var + a non-zero GET /api/play-event read; add a prod startup console.warn when the beacon URL is absent.
  - _Evidence:_ analytics.ts:159-164 pickDefaultSink→Noop in prod without VITE_ANALYTICS_URL; play-event/route.ts:63 drops if !hasUpstash.
  - _Verified:_ VERIFIED with one correction: analytics.ts:159-164 returns NoopAnalyticsSink in prod unless VITE_ANALYTICS_URL set; play-event/route.ts:63 drops when !hasUpstash. CORRECTION: the finding says 'no committed env files' but .env.local EXISTS and DOES contain VITE_ANALYTICS_URL — however .env.local is local-only and not used by Vercel deploys, so the prod risk stands. Also first_match_result is emitted via funnelOnce at LiveCryptMatchPage.tsx:114, not the track() block at 128-141 (minor mis-cite). No-code-change verification recommendation is sound; impact 4 honest.

- **Crypt TCG labels its device-local game score "⬡ HEX" — blurs the real city currency** `CRYPT TCG (play.freeloncity.com)` · effort M · copy-safety
  - _Problem:_ Device-local, non-mintable game score is shown with the exact ⬡ glyph + word HEX, reading as earning real spendable city HEX — contradicting the codebase's own documented intent that the in-game mark is ◈/Sigil, never ⬡ HEX.
  - _Upgrade:_ Rebrand the in-game score onto the team's already-named ◈ Sigil mark so it never collides with city HEX; drop the "(device)" crutch.
  - _Evidence:_ MatchResultsPage.tsx:201 "⬡ HEX earned (device)", 217 "⬡ HEX (device)"; HomePage.tsx:161 "⬡ HEX (device)", 383 "Claim +{amount} ⬡ HEX", 186-187 comment "◈ = Sigil (in-game only), never the ⬡ HEX glyph"; DailyPackPage/MarketplacePage same
  - _Verified:_ VERIFIED. MatchResultsPage.tsx:201 "⬡ HEX earned (device)", :217 "{...} ⬡ HEX (device)". HomePage.tsx:161 "⬡ HEX (device)", :383 "Claim +{amount} ⬡ HEX". HomePage.tsx:186-187 documents intended separation "◈ = Sigil (in-game only), never the ⬡ HEX glyph" — the codebase declares the rule then violates it. Aligns with LOCKED sink-only constraint (game cannot mint real HEX). Effort M is honest given multi-file spread.

- **iOS zoom-on-focus across every text input (free-hook DemoChat, agent workspace, Crypt search/challenge)** `City + Crypt (mobile, all chat/search inputs)` · effort S · mobile-input
  - _Problem:_ iOS Safari auto-zooms whenever a focused input has font-size < 16px; the free /demo chat composer, owned-agent composer, and Crypt deck search / PvP challenge box are all 13-14px, so the first keystroke yanks the page into a zoomed state and leaves it there.
  - _Upgrade:_ Bump the typed-into inputs to 16px on coarse-pointer/<=720px, or add a belt-and-suspenders `input, textarea, select { font-size: 16px }` inside the mobile media block of both globals.css and Crypt index.css. Desktop sizes unchanged.
  - _Evidence:_ Verified all four: DemoChat.tsx:500 textarea fontSize 13; AgentWorkspace.module.css:417 .input font-size 14px; crypt index.css:6070 .crypt-binder-search font-size 13px and :5830 .crypt-challenge__input font-size 14px. No text-size-adjust override exists.
  - _Verified:_ CONFIRMED in real code: DemoChat.tsx:500=fontSize 13, AgentWorkspace.module.css:417=14px, /Users/billy/crypt-game/src/index.css:6070=13px & :5830=14px; grep for 'text-size-adjust' in app/globals.css returned nothing. All four are <16px so iOS will zoom.

- **Returning daily players sit through the full ~20s intro cinematic every load** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort S · retention/UX
  - _Problem:_ A retention game needs instant daily re-entry. Forcing an established player to watch a 20s movie or hunt for a low-contrast corner button every session is a daily tax that works against the streak/daily-slate loop.
  - _Upgrade:_ Auto-skip for established saves: if loaded && (buildings/xp/wins > 0), call startGame() immediately (or a 1-2s abbreviated descent). Keep the full cinematic for true first-run. Reuse the exact condition already at 6195.
  - _Evidence:_ runCinematic (6197) always starts at cinePhase='boot' and only ends at startGame() — via SKIP click (6194) or after boot(3.4s)+space(6.5s)+dustin(1.2s)+descent(6s)+terminal sequence (6225/6239). The sole concession for returning saves is relabeling #skipBtn to 'RESUME ▸' (6195) using a condition that already detects established saves.
  - _Verified:_ VERIFIED: runCinematic 6197-6241 runs full phase chain to startGame; line 6195 only relabels skipBtn ('RESUME ▸') and never short-circuits the cine; condition for reuse is present.

- **First-time player gets no in-world pointer to their first contact — combat gated behind two builds** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort M · onboarding/first-10-minutes
  - _Problem:_ The game is named for real-time combat, yet a new player can spend a whole first session driving/scanning/clearing non-combat sites without a fight, because the first fight requires a Tower then a War Room. The distinctive verb is the last thing they reach.
  - _Upgrade:_ Seed one guaranteed ungated 'first contact' near home that needs no War Room, add it to the GOALS ladder early (after first scan) with a persistent waypoint/beacon. Let the existing onboarding-grace path (resolveBattle 5706-5709) cover it.
  - _Evidence:_ Mission panel hidden until a tower exists (renderMissions 4857-4860). RED DUST mission and ambush combat both gated behind War Room (renderMissions 4862/4872; openSitePanel 5283). Scar combat needs scarUnlocked() = S.wins>=12 (834, 5286). The clean-scan fallback gives only an octant toast (5244-5245) — no persistent waypoint.
  - _Verified:_ VERIFIED: renderMissions gates on tower (4857) + warroom (4862/4872); openSitePanel gates ambush on warroom (5283) and scar on scarUnlocked S.wins>=12 (834,5286); scan-clean only toasts an octant (5244-5245), no waypoint.

- **Mars game runs a DIFFERENT gold, pure-black bg, and mono-only type — hard seam at the /mars door** `MARS COMMAND (game) vs CITY` · effort M · Cross-surface palette/type consistency
  - _Problem:_ Mars game uses a warmer/lighter gold (#d8b25c), pure #000 background instead of the lifted #0B0B0D, and monospace-only type with no Clash Display — reads as a different product at the /mars door.
  - _Upgrade:_ Repoint Mars :root to canonical tokens (--gold:#C8A75D, --gold-bright:#E9C984, --ivory:#F5F2E8), lift page background to #0B0B0D (3D canvas can stay black), and load Clash Display for HUD/brand headers while keeping Space Mono for terminal readouts. Re-apply to public/mars/index.html (both copies hold the off-brand values).
  - _Verified:_ VERIFIED: mars-command/index.html:9-11 declares --gold:#d8b25c / --gold-bright:#f0c75e / --ivory:#f2ead8 (all differ from City canon #C8A75D/#E9C984/#F5F2E8 in app/globals.css:58/63-64); line 17 html,body{...background:#000} (vs --bg #0B0B0D line 52); line 18 body font is SF Mono monospace only, no Clash Display loaded. The deployed copy public/mars/index.html:9/17 carries the SAME off-brand values, so re-apply to both. All three sub-claims (gold hue, pure-black bg, no Clash) confirmed.

### Impact 3★

- **Shape (the IP) is demoted below civilization in the citizen identity hierarchy** `CITY (citizen detail + card)` · effort M · Brand IP / shape-leads
  - _Problem:_ Brand mandate is shape-silhouette-first then civ color, but the live UI inverts it: civ color and name own the identity beat and the card accent while shape is buried as a rarity footnote / last-resort label.
  - _Upgrade:_ Promote shape into the identity beat: a prominent shape-name kicker above/beside the name on the detail page, and a visible shape chip (not just the fallback label) on CitizenCard. Optionally add a secondary shape-tinted accent so silhouette reads first, civ color second.
  - _Verified:_ VERIFIED: app/citizens/[id]/page.tsx leads BEAT 1 with customName/transmission_name/honoree/'Citizen #id' (lines 198-213), then civ-colored CIVILIZATION · DOCTRINE subhead (221-224); whole page is driven by color=civilizationColor() (line 110) bound to --civ (line 171). SHAPE appears only as scarcity stat '${c.shape} shapes' (line 248) and spec-table row {key:'shape',label:'Shape'} (line 73). CitizenCard.tsx:30 fallback is transmission_name||honoree||shape (shape = LAST resort) and top border borderTopColor:color = civ color (line 13). The shape-first mandate is real (lib/missions/image-gen.ts:330 'Shape drives the silhouette FIRST'). Note: mandate says 16 canonical shapes, finding said 9 — minor inaccuracy, claim stands.

- **/proof — the strongest 'why own one' page — is buried, in no nav, and name-collides with /play/proof** `CITY SITE` · effort S · conversion / distribution
  - _Problem:_ The site's sharpest ownership argument (the render-moat / published-prompt page) is reachable only from two in-page spots (citizens/page.tsx:118, TransformsWall.tsx:65) and absent from all three nav components. Cold/curious traffic never sees it. Its URL also collides with /play/proof (a Wordle game), so Discord references to 'proof' are ambiguous — collision is documented in DailyHub.tsx.
  - _Upgrade:_ Surface /proof on the buy path: add as secondary CTA on the demo exhaustion wall and the homepage close. Optionally rename route to /render-moat to kill the /play/proof collision. 1-2 link additions, no new surface.
  - _Evidence:_ app/proof/page.tsx exists (7955 bytes); linked only from app/citizens/page.tsx:118 + components/TransformsWall.tsx:65; absent from Header/MobileNav/BottomNav; collision documented at components/DailyHub.tsx:32-34
  - _Verified:_ VERIFIED: app/proof/page.tsx exists; grep confirms it is linked only from citizens/page.tsx:118 + TransformsWall.tsx:65 and absent from all 3 nav files; DailyHub.tsx:32-34 documents /play/proof collision. Minor: quoted link text differs from actual ('See what owners render ->'), and 'never seen' is slightly overstated since it IS on the homepage transforms wall — lowered impact 4->3.

- **Bottom nav (the phone app spine) has no OWN/buy tab — five tabs are all free surfaces, none is the money path** `CITY SITE` · effort S · core spine / mobile conversion
  - _Problem:_ On the installable PWA (most-engaged mobile audience) the persistent thumb bar surfaces four free/exploratory destinations plus the free demo; the conversion action (own one) is buried one tap deeper in the hamburger sheet. The spine's 'own' step has the weakest persistent presence on the surface where intent is highest.
  - _Upgrade:_ Swap the lowest-value permanent tab (likely /live) for an OWN tab (deep-link OpenSea collection, or /my-citizens for holders), or make the gold 'Meet' tab two-state -> OWN for returning/holder sessions. Keep 5 tabs; validate against /live traffic before cutting.
  - _Evidence:_ components/BottomNav.tsx:21-80 TABS = City(/), Live(/live), Citizens(/citizens), Play(/play), Meet(/demo gold); OWN only in components/MobileNav.tsx:70 hamburger sheet; Header.tsx:38-49 = FREELONS/Collections/Start/Play (no OWN)
  - _Verified:_ VERIFIED: BottomNav.tsx TABS array (lines 22-80) = City/Live/Citizens/Play/Meet, no OWN. OWN action only at MobileNav.tsx:70 ('Own a FREELON') inside the sheet. Header (desktop) lines 38-49 has no OWN item either. Upgrade keeps 5 tabs and gates on /live traffic — sound, no constraint issue.

- **Demo wall capture asks for email but stacks three competing exits at the single highest-value moment** `CITY SITE` · effort S · conversion / focus
  - _Problem:_ The wall correctly makes email-capture the one gold action (ClaimForm) but stacks three secondary links beneath it: share (:421), OpenSea buy (:438/450), and the broken /start 'awaken works' link (:455). The team already learned (comment at :408) that competing actions cannibalize capture; three quiet exits re-introduce a milder leak, and one is broken.
  - _Upgrade:_ Trim to at most one secondary exit (OpenSea buy) beneath the form; move share into the ClaimForm done-state (it already has one per :411); drop or fix the /start link. Reduces decision noise at the conversion point.
  - _Evidence:_ components/DemoChat.tsx:412 ClaimForm; :421 'share what it said'; :438/:450 'or buy one now on OpenSea'; :455 broken '/start' 'see how awakening works'; comment at :408 notes share was demoted because it 'cannibalized the capture'
  - _Verified:_ VERIFIED in DemoChat.tsx:397-459: ClaimForm:412 (gold), share link:421, OpenSea link:438/450, /start link:455 (broken per finding 1). Comment :408-411 confirms share was demoted for cannibalizing capture. Three secondary exits under the gold form, one broken — accurate.

- **Demo→own is the cold ramp's whole job, but the conversion is unmeasured — demo_exhausted fires, the wall's OWN click does not distinguish itself** `CITY SITE` · effort S · conversion
  - _Problem:_ demo_exhausted→opensea_click{from:demo_wall} is computable today but no saved funnel exists; the 5-vs-3-turn wall A/B is untested.
  - _Upgrade:_ Compute the demo_start→demo_exhausted→opensea_click{from:demo_wall} funnel in the dashboard (no new instrumentation); A/B the wall at 5 vs 3 turns.
  - _Evidence:_ DemoChat.tsx:77 demo_exhausted; :441 opensea_click{from:demo_wall}.
  - _Verified:_ VERIFIED: DemoChat.tsx:77 demo_exhausted{slug}, :441 opensea_click{from:"demo_wall"}, :424 demo_share{slug}. opensea_click IS a shared event with a from discriminator (home_hero/home_close/demo_wall confirmed across files), so the funnel is already computable — this is a dashboard-config + A/B item, not new code. Lowered impact 4→3: the measurement gap is dashboard-only (events exist); the value is the A/B experiment, which is genuinely untested.

- **The Crypt TCG is not reachable from the /play arcade hub, so the city→game handoff can't convert or be measured** `CITY SITE` · effort S · conversion
  - _Problem:_ Highest-intent play traffic on /play is routed past the one compounding holder game (Crypt TCG) to a demo chat; no measured entry to the owned-card loop on the busiest play surface.
  - _Upgrade:_ Add a Crypt TCG card to /play and tag crypt_play_click{from:arcade} to compare arcade vs direct landing as game entry points.
  - _Evidence:_ play/page.tsx GAMES 43-76 (Mars/HexMatch/Restore/Proof) + MORE_GAMES 101-120 (Sweep/Reckoning/Cipher) — no Crypt TCG; closing CTA :309 → /demo.
  - _Verified:_ VERIFIED: play/page.tsx GAMES (43-76) lists Mars/Hex Match/Restore/Proof; MORE_GAMES (101-120) lists Sweep/Reckoning/Cipher; Crypt TCG absent from both grids; closing CTA at :309 is a Link to /demo. Mini-games are preserved (constraint-safe) — this ADDS the card, deletes nothing. Adds surface area but directly serves the compounding-holder loop; impact 3 honest.

- **Pageview-only top-of-funnel: home_view fires but the hero's two CTAs split traffic with no measured ratio, so "meet first" vs "own first" is untested** `CITY SITE` · effort S · conversion
  - _Problem:_ The highest-traffic surface routes cold traffic two opposite ways (free demo vs OpenSea) on judgment; the events to test which converts to activation_paid already fire but the funnel isn't built.
  - _Upgrade:_ Build the saved funnel home_view→{meet_citizen_click|opensea_click(home_hero)}→activation_paid and flip the hero primary if 'own first' converts as well or better.
  - _Evidence:_ page.tsx hero meet_citizen_click TrackedLink :133 + opensea_click{from:home_hero} :137; close inverts priority :238/:241; PageBeacon home_view.
  - _Verified:_ VERIFIED: page.tsx:133 meet_citizen_click TrackedLink{from:home_hero}, :137 opensea_click{from:home_hero}; close section :238 OWN primary / :241 MEET secondary; comment at :127 asserts 'experience it first' as judgment not measurement. Both branch events already fire — this is a dashboard funnel + at most a one-line CTA swap. Impact 3 honest (highest-traffic surface but the experiment, not the build, is the deliverable).

- **play-event GET is a read-only JSON endpoint with no scheduled surfacing — the one number is computable but nobody is forced to look** `CITY SITE` · effort M · instrumentation
  - _Problem:_ The gate number (distinct owned-card wallets/week) sits behind a manual x-admin-key curl; a solo founder will never read it, so the measurement never changes decisions.
  - _Upgrade:_ Fold the four headline play-event numbers into the existing Sunday signal-report cron output (one private line / founder DM); no new storage — GETs the aggregate that already exists.
  - _Evidence:_ play-event/route.ts:100-133 GET header-authed read; cron/signal-report/route.ts posts civ standings to X but reads no play numbers.
  - _Verified:_ VERIFIED: play-event/route.ts GET (100-133) is x-admin-key-only and returns the distinct-wallet funnel. cron/signal-report/route.ts confirmed to compute getCivWeekStandings + topCitizens and postTweet — it does NOT read any play-event aggregate. The pipe truly isn't surfaced anywhere scheduled. Effort M honest (cron edit + auth-internal read of the aggregate). Impact 3.

- **Sweep earnings entirely bypass the FARMABLE_DAILY_CAP global ceiling** `CITY SITE` · effort S · economy correctness
  - _Problem:_ Base sweep credit goes through creditWalletHexCapped which only increments sweepsToday against SWEEP_DAILY_CAP_COUNT (10) and never reads/increments farmedToday; the streak bonus calls plain creditWalletHex with NO farmable flag. So a sweeping wallet earns up to 250 base sweeps + 100 streak bonus entirely outside the 250/day farmable bucket, then can still earn a full 250 farmable from claim/holder/quest/listing the same day. NOT a faucet (no new income) — an isolation gap vs the stated 250/day farmable ceiling.
  - _Upgrade:_ Have creditWalletHexCapped also consult/increment farmedToday (count sweeps against FARMABLE_DAILY_CAP) and pass {farmable:true} on the streak-bonus credit at sweep-inline.ts:142; add a farmable-bypass assertion to sweep-cap-race.test.ts (file exists).
  - _Evidence:_ wallet-hex-store.ts:224-255 creditWalletHexCapped touches only sweepsToday/SWEEP_DAILY_CAP_COUNT, never farmedToday; sweep-inline.ts:119 base credit via creditWalletHexCapped; sweep-inline.ts:142 streak bonus via plain creditWalletHex with no opts; economy-constants.ts:139-149 lists 'sweep' as a source FARMABLE_DAILY_CAP is meant to bound. farmable-cap.test.ts:44 even tests sweep WITH {farmable:true}, but the real sweep path never passes it.
  - _Verified:_ VERIFIED: creditWalletHexCapped (wallet-hex-store.ts:224-255) never reads farmedToday; sweep-inline.ts:142 streak bonus passes no farmable flag; the existing farmable-cap.test.ts:44 wrongly assumes sweeps are farmable-capped, confirming the divergence. Both referenced test files exist. Effort S kept.

- **creditSaleShare advances its cursor with an unlocked read-modify-write per event** `CITY SITE` · effort S · concurrency / shared-state race
  - _Problem:_ Per eligible sale, creditSaleShare credits under the wallet lock then SEPARATELY does an unlocked getWalletHex->set lastSaleCreditTs/lastActiveDay->setWalletHex inside the loop. The saleshare:* lock used to wrap the function is a DIFFERENT namespace than the wallet-hex lock, so it does not serialize against concurrent sweep/holder credits. A concurrent credit landing between this read and write is erased; the per-event re-read+write also multiplies round-trips by sale count.
  - _Upgrade:_ Fold the cursor advance into the locked mutation (extend creditWalletHex to accept a cursor patch, or a lock-wrapped patch helper), and update lastSaleCreditTs ONCE after the loop. Same helper as finding 1.
  - _Evidence:_ economy-extras.ts:94-112 loop: creditWalletHex (locked) then unlocked getWalletHex+setWalletHex at 108-111; economy-extras.ts:45 wraps in withLock('saleshare:'+addr) which is NOT the wallet lock; holder-tick.ts:178 calls creditSaleShare inside runHolderTick which runs in the route.ts:57-61 Promise.all alongside the sweep path; wallet-hex-store.ts:78-86 forbids exactly this pattern.
  - _Verified:_ VERIFIED: economy-extras.ts:108-111 is an unlocked full-record RMW inside the loop; the saleshare lock at line 45 is a separate key from the wallet-hex lock so it does not protect against sweep/holder writes. Confirmed it runs in the Promise.all path via holder-tick.ts:178. Real but narrower window than finding 1 (sale events are rarer); impact 3 kept.

- **Carrier profile prints "PORTFOLIO · X ETH" — banned word + valuation on a public handle page** `CITY SITE — /carrier/[handle]` · effort S · copy-safety
  - _Problem:_ Public carrier page prints "PORTFOLIO / X ETH" (balance×floor), using a word the brand's own SignalInventory explicitly bans, presenting holdings as a priced investment portfolio.
  - _Upgrade:_ Replace PORTFOLIO/{X} ETH with "CITIZENS · {balance}"; keep RANK and carrier-health, drop the ETH value.
  - _Evidence:_ carrier/[handle]/page.tsx:102 portfolio:balance*floor; 187 "PORTFOLIO"; 188 {verified.portfolio.toFixed(4)} ETH. Ban list SignalInventory.tsx:13
  - _Verified:_ VERIFIED. carrier/[handle]/page.tsx:102 portfolio: balance * floor; :187 <span className="cm-lbl">PORTFOLIO</span>; :188 {verified.portfolio.toFixed(4)} ETH — all rendered JSX. SignalInventory.tsx:13 comment "Banned: portfolio · assets · floor · value · trade · market" confirms the brand's own rule the page breaks.

- **Collections page leads with a graveyard ledger — 'already dead' signal on the universe's front door** `CITY SITE — /collections` · effort S · Collector / Trust
  - _Problem:_ A collector scanning /collections reads abandonment/death/loss as the dominant motif (collections labeled wild/dead/emotional/lost + a literal graveyard of abandoned citizens) with NO aliveness counter-weight above the loss motif. Suppresses floor confidence vs the 'community thriving' signal.
  - _Upgrade:_ Lead /collections with an aliveness beat — a compact 'CITY IS LIVE' strip using the already-built ActivationProof + CityWeekBand components at the TOP, and keep the graveyard demoted behind its existing disclosure.
  - _Evidence:_ app/collections/page.tsx + components
  - _Verified:_ VERIFIED. app/collections/page.tsx renders header(125)→collection cards→provenance(258, 'signals were never lost' :264)→GraveyardSection limit 5 (:273); loss epithets at :133-137 (wild/dead/emotional/lost). Confirmed the page has NO ActivationProof and NO CityWeekBand — both proposed components genuinely exist and are already used on app/page.tsx (:154 ActivationProof, :222 CityWeekBand), so the upgrade reuses real code. The 'no aliveness counter-weight before loss' gap is real.

- **Dashboard renders a 0-1000 "BY COMPUTED VALUE" citizen ranking — the exact value-score frame deleted elsewhere for copy-safety** `CITY SITE — /dashboard` · effort M · copy-safety
  - _Problem:_ TopCitizensByValue renders a user-facing heading "⬡ TOP CITIZENS · BY COMPUTED VALUE" and a per-citizen "Value {n}/1000" score — the SAME 0-1000 appreciation-proxy card the citizens page comment says was deleted as a copy-safety risk. (The "undervalued listings worth sniping" string is a JSX comment only and does not reach the DOM; RedSignals renders neutral "BOUNTY BOARD" copy.)
  - _Upgrade:_ Re-frame the ranking off price/value onto activity/work (XP, jobs run, work-log) and rename heading + the 'Value /1000' label. Leave RedSignals body copy as-is; only the dashboard JSX comment carries the 'snipe/undervalued' wording.
  - _Evidence:_ TopCitizensByValue.tsx:61 "⬡ TOP CITIZENS · BY COMPUTED VALUE", :116 label "Value", :118 {cit.value} :120 "/1000". dashboard/page.tsx:150,153 comments. citizens/[id]/page.tsx:98-101 "0-1000 value score ... appreciation proxy ... copy-safety risk" (deleted)
  - _Verified:_ PARTIALLY CORRECTED. The finding's strongest evidence is actually in the RENDERED component, not the cited JSX comments: TopCitizensByValue.tsx:61 renders heading "⬡ TOP CITIZENS · BY COMPUTED VALUE" and :116-120 render "Value {cit.value}/1000" — the very 0-1000 value-score frame citizens/[id]/page.tsx:98-101 says was deleted as an "appreciation proxy ... copy-safety risk." dashboard/page.tsx:150/153 "value ranking"/"undervalued listings worth sniping" are JSX comments (do NOT reach DOM); RedSignalsFeed.tsx renders neutral "RED SIGNALS · BOUNTY BOARD"/"Hold N days" — no 'undervalued'/'snipe' in user copy. Kept because the DOM-visible value-score IS a real violation; impact stays 3, effort M (needs an activity-ranked data source).

- **Demo's "5 free turns" is a global budget but the UI presents 5 separate minds inviting questions** `CITY SITE — /demo (top cold-funnel surface)` · effort S · onboarding-empathy
  - _Problem:_ The page invites exploring a flagship + sister citizens ("Pick one and ask it anything"), but the 5-turn budget is SHARED across all of them and the header/pill never say so. Trying each sister once exhausts the demo, and the per-citizen-memory differentiator never lands.
  - _Upgrade:_ Make the meter honest: label it "5 free messages across all citizens" on the header + pill. The cheapest fix is one clarifying word so expectation matches the server.
  - _Evidence:_ app/api/demo/[slug]/route.ts:91, app/demo/page.tsx:101+106, components/DemoChat.tsx:472-474
  - _Verified:_ VERIFIED: route.ts:91 `const SESSION_MAX = 5; // free runs per browser session, SHARED across all agents`; demo/page.tsx:101 "Pick one and ask it anything" + :106 "5 free turns. No wallet needed." with no shared qualifier; DemoChat.tsx:472-474 pill shows "{remaining} free turns". Mismatch is real.

- **Sister collections are thin — same demo-chat utility, no distinct reason to hold beyond the flagship** `CITY SITE — /demo + collections-data` · effort M · Utility / Collector
  - _Problem:_ The four sister collections all present identically (one iconic token + greeting + the same metered /api/demo chat), differentiated only by a one-word epithet. A collector sees five collections that all do the same free-chat thing — no holder loop or status differentiation beyond FREELONS.
  - _Upgrade:_ Give each sister ONE concrete distinct hook within locked constraints (no faucet) — e.g. a distinct demo voice/memory style per collection — to turn 'five chatbots' into 'five roles in one city.' Ship the cheapest one as proof.
  - _Evidence:_ app/demo/page.tsx:33-56 + app/collections/page.tsx:131-139
  - _Verified:_ VERIFIED with a caveat. app/demo/page.tsx:33-38 DEMO_SLUGS gives all four sisters identical structure (one token, same /api/demo); :45-56 GREETINGS differ only in voice; collections/page.tsx:133-137 differentiates by one-word epithet. The 'thin sisters' problem is real. CAVEAT lowering confidence: the finding's example sub-upgrades ('Crypt citizens playable as TCG commanders', 'Oogies enter Guard the Pot as the guard') lean on a real Crypt TCG that does NOT exist (crypt-tcg is a placeholder) and on Guard the Pot which is off — so the cheap-to-ship hook is the per-collection demo voice/memory variant, not the game-tie examples. Kept at impact 3 / effort M.

- **Demo exhaustion wall — the highest-value conversion moment — links to a redirect** `CITY SITE — /demo conversion wall` · effort S · Funnel / dead-end
  - _Problem:_ After 5 free turns the stranger is at peak intent reading the email-capture wall; the lone explainer link ('see how awakening works') 301-hops to /help, adding latency on the hottest surface.
  - _Upgrade:_ Change DemoChat.tsx:455 href to /help#wallet. One-line change removing a redirect from the conversion path.
  - _Evidence:_ DemoChat.tsx:455
  - _Verified:_ VERIFIED: components/DemoChat.tsx:455-457 renders <a href="/start">see how awakening works →</a> inside the exhausted wall block (the 'This conversation is about to vanish' panel, line 400). /start permanentRedirects to /help.

- **Demo 'wow' moment shares as text-only — no rendered image card for the one thing worth screenshotting** `CITY SITE — /demo share` · effort M · Virality / Growth
  - _Problem:_ The demo's 'it's alive' reply shares as a bare text tweet with no auto-unfurl image, while arcade scores already get a real /api/og/score image card. Image-first virality is missed on the most shareable atom.
  - _Upgrade:_ Reuse the existing /api/og + /share/score plumbing to render a 'citizen said X' card and attach it to tweetDemoReply via a /share/quote landing.
  - _Evidence:_ components/DemoChat.tsx + lib/share.ts
  - _Verified:_ PARTIALLY VERIFIED — kept on its real half. lib/share.ts:540-551 tweetDemoReply() is plain text + /demo link, NO image (confirmed); lib/share.ts:47-59 shareScoreUrl()→/share/score→/api/og/score is the real image-card pattern the upgrade reuses (confirmed). The Crypt half of the evidence (MatchResultShareCard.tsx) does NOT exist in this repo, so I dropped the Crypt claim and lowered impact 4→3. The /demo image-card gap and the reusable plumbing are genuine.

- **UGC takedown path is documented for copyright but not for user transmissions/PFP uploads generally** `CITY SITE — /legal/dmca + transmissions/PFP UGC` · effort M · dmca/ugc
  - _Problem:_ The site hosts user-submitted images + captions (transmissions) and image uploads (PFP Studio), but the only published takedown path is copyright-specific. There is no stated route to report a harassing/impersonating/abusive transmission and no statement that the project may remove UGC — a standard safe-harbor/liability control for a platform accepting public user content.
  - _Upgrade:_ Add a 'User content' clause to Terms (license to display submitted content; no illegal/infringing/harassing/impersonating content; project may remove UGC at its discretion) and a one-line 'Report abusive content: email contact@freeloncity.com' on the DMCA/contact page covering non-copyright reports — mirroring the honorary-notice 72h generality for all UGC.
  - _Evidence:_ dmca/page.tsx covers copyright/DMCA only (sections 1-6). Transmissions render user content (transmissions/[id]/page.tsx:61 TransmissionCard, user images+captions). terms/page.tsx section 9 (:33-34) is about pre-filled tweet templates and makes users responsible for what they post, but provides NO non-copyright reporting route or removal-discretion clause. honorary-notice/page.tsx:35 has a 72h urgent-harm path that exists only for honorees.
  - _Verified:_ VERIFIED: dmca/page.tsx is copyright-only; terms section 9 (:33-34) covers tweet templates not user uploads, and no terms section grants UGC-removal discretion or a non-copyright report path; honorary-notice:35 confirms the 72h path is honoree-scoped. Real gap.

- **Privacy Policy omits the DMCA/honorary contact channel as a personal-data flow** `CITY SITE — /legal/privacy vs /legal/dmca + /legal/honorary-notice` · effort S · privacy
  - _Problem:_ The privacy policy claims the reservation form is 'the one place we collect personal information' and lists every data flow, but a real named-PII channel (DMCA notices with signature/address under penalty of perjury, honoree name/handle removals) is undisclosed with no stated retention or handling.
  - _Upgrade:_ Add a short Privacy section: emails to us (DMCA, honorary removal, support) are received and retained — including any name, address, or signature — as long as needed to handle and document the request, then per legal-hold needs; note the legal basis (legitimate interest / legal obligation).
  - _Evidence:_ dmca/page.tsx:12 publishes contact@freeloncity.com for DMCA/honorary/press/security and :19-24 requires signature, physical address, phone, email; honorary-notice/page.tsx:29-31 routes name removal/correction through that channel. privacy/page.tsx:10 says reservation is 'the one place we collect personal information'; section 4 (:30-40) lists third parties but never inbound email PII.
  - _Verified:_ VERIFIED: dmca/page.tsx:19-24 demands signature+address+phone; honorary-notice routes name PII there; privacy/page.tsx:10 explicitly claims reservation is the ONLY collection point. Genuine omission.

- **/proof share image is square (1:1) but tagged summary_large_image — the proof page previews badly** `CITY SITE — /proof share card` · effort M · Social preview / shareability
  - _Problem:_ summary_large_image expects ~1.91:1; a 1:1 image gets center-cropped to a wide strip (clipping the bottom identity caption) or shrunk to a square thumb. The one page built to be shared as proof is the one whose share card breaks.
  - _Upgrade:_ Render a 1200x630 proof card and point og:image/twitter:image at it; at minimum tag card: "summary" so it isn't force-cropped.
  - _Evidence:_ proof/page.tsx:15,22 + public/proof/freelon-2268.png
  - _Verified:_ VERIFIED: app/proof/page.tsx:15 sets image /proof/freelon-2268.png width:1024 height:1024; line 19 card:"summary_large_image". `file`+`sips` confirm the PNG is exactly 1024x1024 (1:1). Aspect mismatch is real.

- **Sweep streak bonus (+100⬡) bypasses the farmable daily ceiling** `CITY SITE — HEX economy` · effort S · faucet-cap-leak
  - _Problem:_ The +100⬡ sweep_streak bonus is credited via plain creditWalletHex with no farmable flag, so it skips FARMABLE_DAILY_CAP even though the two-bucket design doc lists the streak/claim faucets as in-scope farmable sources.
  - _Upgrade:_ Add { farmable: true } to both sweep_streak creditWalletHex calls so the bonus is clamped to FARMABLE_DAILY_CAP headroom like other repeatable faucets.
  - _Evidence:_ sweep-inline.ts:142-146 and cron/sweep-bounty/route.ts:565-569 call creditWalletHex(addr, STREAK_BONUS, { kind: 'sweep_streak', ... }) with no opts arg; economy-constants.ts:139-149 declares the streak/claim faucets as in the FARMABLE bucket under FARMABLE_DAILY_CAP=250.
  - _Verified:_ VERIFIED. sweep-inline.ts:142 and cron/route.ts:565 both call creditWalletHex with no third arg (confirmed creditWalletHex's opts.farmable IS the real API, wallet-hex-store.ts:172,180-191). economy-constants.ts:41 SWEEP_STREAK_BONUS=100, :149 FARMABLE_DAILY_CAP=250, comment :139-143 lists streak/claim as farmable. One nuance: per-sweep credits use a SEPARATE sweepsToday/SWEEP_DAILY_CAP counter (creditWalletHexCapped), not farmedToday — so the 'stacks on the same bucket as claim' detail is loose, but the core claim (streak bonus escapes the farmable ceiling the doc assigns it) is correct. Impact 3 honest — 100⬡ is small vs sinks (cheapest 800⬡).

- **Snipe and sale-share bounties are not X-gated, so caps scale linearly with funded wallets** `CITY SITE — HEX economy` · effort M · sybil-resistance
  - _Problem:_ creditSnipeBounties and creditSaleShare are purely wallet-keyed with no X-verification, so an operator with K funded wallets multiplies every per-wallet cap by K with no per-identity ceiling — the documented sybil dimension per-wallet caps cannot address.
  - _Upgrade:_ Mirror fresh-blood's X-gate on the snipe and sale-share crediters so each verified identity, not each wallet, is the cap unit; combined with the global WALLET_DAILY_HARD_CAP this makes multi-wallet farming require multiple verified X accounts.
  - _Evidence:_ creditSnipeBounties (economy-extras.ts:203-289) and creditSaleShare (:44-118) have no getXVerification call; only creditFreshBlood is X-gated (:141-147). Red-team finding D (HEX_ECONOMY_RED_TEAM.md:34) and backlog item 7 (:71) flag exactly this.
  - _Verified:_ VERIFIED. grep for getXVerification shows it called in economy-extras.ts ONLY at :142-143 (fresh-blood); absent from creditSnipeBounties and creditSaleShare — confirmed not X-gated. HEX_ECONOMY_RED_TEAM.md:34 (finding D) and :71 (backlog 7) corroborate verbatim. Title trimmed: the writeup says 'snipe and fresh-blood' but fresh-blood IS already X-gated (:141-147) — corrected to 'snipe and sale-share', the two genuinely ungated value faucets. Adds friction (a cap, not a faucet) — constraint-safe. Impact 3 honest (sybil cost-raise, not a direct leak).

- **Individual citizen + universe OG cards render body copy in system-ui — the #1 'demo template' tell the brand pass warned about** `CITY SITE — OG image renderers` · effort M · Social preview / brand
  - _Problem:_ The cards collectors screenshot render pitch/kicker/provenance in default platform sans. The agent card (the per-citizen flex) loads no brand font at all — exactly the tell the team's own comment flagged.
  - _Upgrade:_ Pass the already-loaded Clash Display to the kicker/subline/provenance nodes in universe/route.tsx, and add the same font-load + family to agent/[id]/route.tsx. The fail-soft fetch pattern is already written.
  - _Evidence:_ universe/route.tsx:54,138,181,197,158 + agent/[id]/route.tsx:57
  - _Verified:_ VERIFIED: universe/route.tsx — FreelonCard root fontFamily system-ui (line 54); only wordmark 'FREELONS' uses fontFamily: display/Clash (line 158); kicker (138), subline (181), provenance (197) all inherit system-ui. agent/[id]/route.tsx:57 sets whole card system-ui with NO font load (grep shows zero Clash/fetch-font refs). universe self-comment lines 12-17 names system-ui 'the #1 demo template tell.' Impact kept at 3 (real, but 'most-shared' is an unverifiable characterization).

- **Guard-the-Pot system prompt embeds the secret token alongside untrusted user input on the cheap model** `CITY SITE — agents (prompt injection)` · effort M · agents
  - _Problem:_ The win condition is making the model emit a server-held secret, so the secret necessarily co-resides in-context with adversarial player input on MODELS.cheap (the model most vulnerable to non-regex extraction: encoding, translation, role-play). The route burns real HEX per attempt, making it a paid attack surface against a real prize. Currently gated dark (GUARD_POT_LIVE!=='true' → 503) and the prize is off-ledger ETH, so it is a go-live flag, not a live drain.
  - _Upgrade:_ Before going live: (1) move win-detection off 'model emits exact secret' to a separate server-side judgement so the secret never enters the generation context, OR use a stronger model for this one route; (2) post-filter for near-miss encodings (base64/leetspeak/spaced), not just exact includes; (3) keep the prize strictly off-ledger ETH and document a go-live checklist.
  - _Evidence:_ app/api/play/guard/attempt/route.ts:154-160 guardSystem includes `You have ONE secret release code: ${secret}` then citizenReason({system:guardSystem, user:message, model:MODELS.cheap}) line 162-168; win = r.text.includes(secret) line 177; dark gate GUARD_POT_LIVE!=='true'→503 line 67.
  - _Verified:_ VERIFIED. Secret-in-system-prompt + user-role isolation + MODELS.cheap + exact-includes win + the 503 dark gate (line 67) all confirmed. There IS a regex pre-filter (INJECTION_RE, lines 43-57) and the persona reinforces refusal, but the architectural critique stands: exact-includes on the cheap model with the secret in-context is fragile against encoded extraction. Honestly a pre-go-live hardening flag, not a live exploit (route returns 503 in prod). Impact 3 retained as forward-risk.

- **Runtime-error boundary renders a giant "404" — mislabels every server crash as a dead link** `CITY SITE — app/error.tsx` · effort S · Confusing transition / trust
  - _Problem:_ The runtime error boundary (GlobalError) shows a 96-240px "404" headline for real render crashes, which a stranger reads as a dead link and leaves — contradicting the team's own "kill the 404 title" decision and obscuring crash triage.
  - _Upgrade:_ Change the error.tsx headline from "404" to a non-numeric crash word/glyph (e.g. "FAULT" or the ⬡ mark), keep the gold kicker + RETRY button. Reserve the big "404" for app/not-found.tsx only. Optional app/global-error.tsx for root-layout crashes.
  - _Evidence:_ app/error.tsx:5 `export default function GlobalError`; line 50 `<h1>` literal "404" at clamp(96px,22vw,240px); kicker "⬡ THE SIGNAL HAS FAULTED" (line 62) and copy "A transmission broke mid-flight" (line 75); RETRY button (lines 87-90). This is the catch-all crash boundary, NOT app/not-found.tsx.
  - _Verified:_ Verified app/error.tsx:5 is GlobalError (crash boundary) and line 50 renders literal "404" with RETRY button at lines 87-90 — confirmed exactly as described.

- **Mobile MetaMask deep-link drops query string + hash on /sync connect** `CITY SITE — app/sync/SyncWalletAction.tsx` · effort S · Mobile flow bug
  - _Problem:_ A mobile visitor with no injected wallet who taps connect on a deep-linked /sync?ref=… URL is bounced into MetaMask's in-app browser landing on bare /sync — losing referral attribution and any return context. This is exactly the no-injected-wallet mobile path that has repeatedly broken connect for this product.
  - _Upgrade:_ Forward the full path: include window.location.search + window.location.hash before building the metamask.app.link URL. One-line fix; preserves ?ref= and any token context across the deep-link round-trip.
  - _Evidence:_ app/sync/SyncWalletAction.tsx:63-64 builds `const host = window.location.host + window.location.pathname;` then `window.location.href = "https://metamask.app.link/dapp/" + host` — window.location.search and window.location.hash are dropped.
  - _Verified:_ Verified SyncWalletAction.tsx:63-64 forwards only host+pathname into the metamask.app.link deep link, dropping search/hash — confirmed exactly.

- **Wallet-proof signature has no nonce/expiry — a single captured signature replays into full spend authority** `CITY SITE — auth (wallet proof / session)` · effort M · auth
  - _Problem:_ walletProofMessage is a static public string keyed only on the address — no server nonce, no timestamp. Anyone who obtains the signature once (phishing page asking the user to sign the exact known string, or any leak/log) can POST it to /api/x/prove and gain walletProof for the victim's wallet, then force-spend the victim's HEX across boost/unlock/realign/guard/premium. Caps at grief (HEX is sink-only, no withdrawal, no ETH), but it defeats the proven-wallet gate against a determined attacker.
  - _Upgrade:_ Challenge-response: add GET /api/x/prove minting a short-TTL single-use random nonce (Upstash SET NX EX ~5min bound to session/IP), embed it in walletProofMessage, and consume-and-verify on POST. Repo already has the SIWE nonce pattern at app/api/auth/nonce/route.ts to mirror.
  - _Evidence:_ lib/wallet-proof.ts:10-16 static message (address only); app/api/x/prove/route.ts:48-70 verifies that exact message and re-issues session with walletProof:address (7-day life). grep: zero nonce references in prove/wallet-proof/x-session. app/api/auth/nonce/route.ts exists.
  - _Verified:_ VERIFIED. wallet-proof.ts message has no nonce/timestamp. x/prove verifies and stamps walletProof (line 69). grep -i nonce across all three files returns nothing. app/api/auth/nonce/route.ts confirmed to exist (the referenced SIWE pattern). Severity honestly capped: requires the victim to sign the proof string off a malicious page (the message text explicitly says it is not a transaction), and yields force-spend/grief only, never withdrawal or ETH. Effort M (new GET endpoint + nonce store + message change + client update). Impact 3 retained.

- **Email capture in ClaimForm has no consent/privacy link at the point of collection** `CITY SITE — components/ClaimForm.tsx` · effort S · privacy
  - _Problem:_ The privacy policy relies on the reservation form as the consent event, but the form surfaces no link to the policy before the user submits email (+ optional wallet + referral code).
  - _Upgrade:_ Add one line under the submit button: 'By reserving you agree to our Privacy Policy.' linking /legal/privacy. One-line change that makes the consent the policy already relies on actually visible at the point of collection.
  - _Evidence:_ ClaimForm.tsx collects email (:114), optional wallet (:135), reads ?ref from the URL (:50), and the only microcopy (:190-192) is 'Non-binding · no payment · we'll never ask for a seed phrase' — no /legal/privacy link. privacy/page.tsx:28 states the legal basis is 'consent, given when you submit the form'.
  - _Verified:_ VERIFIED: ClaimForm.tsx:190-192 microcopy has no privacy link; :50 reads ?ref; privacy/page.tsx:28 hangs the legal basis on form-submission consent. Real gap.

- **Reservation success has no email confirmation or way to correct a typo'd address** `CITY SITE — components/ClaimForm.tsx + app/api/reserve/route.ts` · effort M · Missing confirmation / lead quality
  - _Problem:_ This is the demo wall's single conversion capture (replacing the OpenSea hand-off). A user who fat-fingers their email gets the same "You're on the list" success state with no way to fix it and no confirmation email to reveal the typo — the lead is silently unreachable, and the success copy's "we'll reach out" becomes a broken promise.
  - _Upgrade:_ Add a lightweight confirmation: send a confirmation email on reserve (turns the bare list into a deliverability-verified, reachable list), or minimally echo the submitted address in the success state with an "edit" affordance so typos are catchable.
  - _Evidence:_ ClaimForm.tsx:74-106 success state shows "You're on the list… We'll reach out about claiming your FREELON" with only a "Tell someone →" share button — no submitted address shown back, no edit/resubmit affordance. app/api/reserve/route.ts:79-95 stores via LPUSH/SADD and returns `{ ok: true }` — no confirmation email, no double-opt-in.
  - _Verified:_ Verified ClaimForm.tsx:74-106 success state (share button only, no address echo/edit) and reserve/route.ts:79-95 (LPUSH+SADD, returns {ok:true}, no email) — confirmed no confirmation path exists.

- **Cron sweep-bounty main credit has no contract/token-range guard the inline path added** `CITY SITE — economy (OpenSea event trust)` · effort S · economy-leak
  - _Problem:_ The cron sweep main loop credits +25⬡ via creditSweep gated only on truthiness of buyer/tx/tokenId/ts, with NO tid 1..4040 range check and NO contract check — while the identical inline sweep (sweep-inline.ts) and the cron's own RESCUE block both enforce those checks. Inconsistent trust boundary between two copies of the same logic; on endpoint/slug drift the cron credits out-of-range or cross-contract sweeps.
  - _Upgrade:_ Add `const tid=parseInt(tokenId,10); if(!Number.isFinite(tid)||tid<1||tid>4040) continue;` (and the optional ev.nft.contract check) before creditSweep in the cron main loop. Better: extract a shared isOurFreelonSale(ev) predicate used by both cron and inline so they can't drift again.
  - _Evidence:_ app/api/cron/sweep-bounty/route.ts:136 `void CONTRACT;`, line 156 only `if (!buyer || !tx || !tokenId || !ts) continue;`, credit at line 230 via creditSweep; rescue block adds tid range at line 277. lib/sweep-inline.ts:105-108 checks evContract!==CONTRACT and tid 1..4040 before the same +25⬡ credit.
  - _Verified:_ VERIFIED. Cron line 156 confirmed truthiness-only; sweep credit (creditSweep, line 230) runs with no tid/contract validation. RESCUE block at line 277 does have `tid>=1 && tid<=4040`. sweep-inline.ts:105-108 confirmed has both guards. Lower severity is honest: +25⬡, daily-capped at 250 via creditWalletHexCapped, and isEthLikePayment gates the value-credit side — but the sweep ledger credit itself is unguarded on token range. Impact 3 retained.

- **Off-palette neon (cyan re-aliased + magenta #FF0070 + teal #00D9B8) breaks the locked black/gold/ivory brand** `CITY SITE — globals.css, play hub, share landing` · effort S · Design / Brand
  - _Problem:_ Locked palette is black/gold/ivory/dust-red, no cyan/green. A live magenta #FF0070 game-card accent and a hard-coded teal #00D9B8 share-redirect link are generic-web3 tells that read as off-brand when a tile is cropped/shared.
  - _Upgrade:_ Delete --neon-magenta usage + the #00D9B8 literal; map game-card accents onto the sanctioned gold/dust-red ramp; finish the cyan→gold migration so no rule references a 'neon' name.
  - _Evidence:_ app/globals.css + app/play/page.tsx + app/share/score/page.tsx
  - _Verified:_ VERIFIED. globals.css:77 --neon-cyan re-aliased to gold #E9C984 (harmless but mis-named, still referenced at 628/640/662/1581/1584/1585); globals.css:78 --neon-magenta:#FF0070 is a LIVE off-brand color used on app/play/page.tsx:67 (Restore the Signal card accent); app/share/score/page.tsx:102 hard-codes color:'#00D9B8' (teal link). Magenta and teal are genuine palette violations. Effort S is fair (literal swaps).

- **The homepage close points cold buyers at a 301 redirect ("New to this? Start here →" → /start → /help)** `CITY SITE — homepage close` · effort S · Funnel / dead-end
  - _Problem:_ The onboarding link directly under OWN A FREELON fires a 301 hop on every click — latency, wrong-URL flash, lost link equity, at the moment the unsure newcomer is most likely to bounce.
  - _Upgrade:_ Repoint the six in-content /start hrefs straight to /help (or /help#wallet) so the destination resolves in one hop. Label can stay.
  - _Evidence:_ page.tsx:263 + start/page.tsx:14-16
  - _Verified:_ VERIFIED: app/page.tsx:263 renders <Link href="/start">New to this? Start here →</Link>; app/start/page.tsx:14-16 is permanentRedirect("/help"). Six /start hrefs confirmed via grep (page.tsx:263, canon:251, help:61, DemoChat:455, CitizenAgentDashboard:289, VaultClient:605) — finding's count is exact.

- **Auto-posted @4040hex CTA 'Reply to this post to earn hex — first 10 get 2× the bounty' is an unreviewed money-flavored promo from the official account** `CITY SITE — lib/sales-pulse.ts cron auto-post` · effort S · securities/financial-claims
  - _Problem:_ A recurring automated post from the official brand voice promises people they will 'earn hex' plus a time-limited '2× bounty' for engagement — money-flavored language and a fixed promise the system must honor every run, with no 'in-app credit, not money' qualifier.
  - _Upgrade:_ Reword to 'active carriers get ⧡ in-app credit (not money). First 10 replies in 30 min get a 2× credit bonus.' Confirm the reply route actually delivers the 2× within the window. Move the template into lib/share.ts so it inherits the same lint as other share copy.
  - _Evidence:_ sales-pulse.ts:234 '⬡ Reply to this post to earn hex —' and :235 'first 10 replies in 30 min get 2× the bounty.', posted via postTweet at :243 in the cron with no human/lint review.
  - _Verified:_ VERIFIED: ctaLines at sales-pulse.ts:234-235 say exactly 'earn hex' and '2× the bounty'; posted inline by the cron via postTweet at :243, no qualifier. Real.

- **The "2-minute guide" link loops the help page back to itself (/help → /start → /help)** `CITY SITE — onboarding` · effort S · onboarding-bug
  - _Problem:_ On /help the hero says "New here? Read the 2-minute guide first" linking to /start, but /start 308-redirects straight back to /help — a self-referential loop on the one page meant to un-confuse newcomers.
  - _Upgrade:_ Delete the self-referential sentence at help/page.tsx:60-62, or replace it with an in-page anchor (e.g. #wallet / #free). Decide what the other five /start call-sites should point to.
  - _Evidence:_ app/help/page.tsx:60-61 + app/start/page.tsx:15
  - _Verified:_ VERIFIED: app/help/page.tsx:60-61 renders "New here? Read the <Link href=\"/start\">2-minute guide</Link> first."; app/start/page.tsx:15 is permanentRedirect("/help") with comment (lines 4-12) confirming the guide content was folded into /help. Loop is real.

- **Daily retention is split across two surfaces with no single "what to do today" for holders** `CITY SITE — retention / daily ritual` · effort M · retention
  - _Problem:_ DailyHub's "TODAY'S DAILIES" strip tracks only device-local, losable arcade streaks (proof/cipher/hex-match/sweep), while the durable on-server +10⬡ daily CLAIM + streak lives separately on /sync#carrier. The two never appear together, so there's no single place answering a holder's "what's my 60 seconds today?". NOTE: finding's "+25/+100" streak figures are wrong — actual bonuses are +100 (7d) / +500 (30d).
  - _Upgrade:_ Add the existing server-backed HEX daily-claim (and its real streak) as the first row of DailyHub, linking to /sync#carrier, so one strip = the whole daily ritual. Reuses the existing claim API — no new economy, no faucet, sink-only intact.
  - _Evidence:_ components/DailyHub.tsx:8-15+29-72 (local-only), app/help/page.tsx:151 (claim on /sync#carrier), app/api/claim/route.ts (existing API), lib/economy-constants.ts:59-62
  - _Verified:_ VERIFIED with one correction: DailyHub.tsx:8-15 states "no server, no economy"; all 4 DAILIES read localStorage only (:83,:89). Server claim lives at /sync#carrier (help:151) and app/api/claim/route.ts exists. economy-constants.ts:59-62 = DAILY_CLAIM 10, STREAK_7_BONUS 100, STREAK_30_BONUS 500 — finding's "+25/+100" is inaccurate (should be +100/+500). DailyHub's neon-cyan/magenta accents are fine (arcade hub, not Crypt/Mars, so palette rule doesn't apply). Upgrade does not add a faucet. Split is real.

- **Six near-identical /api/og/universe?b=2 share cards across distinct pages — every link previews the same generic card** `CITY SITE — share metadata (multiple routes)` · effort M · Social preview / shareability
  - _Problem:_ /demo, /citizens, /collections all share the same generic FreelonCard as the homepage; the preview doesn't match the destination, under-selling the specific surface. Distribution is the known bottleneck and per-surface cards are a cheap virality lever currently left flat.
  - _Upgrade:_ Branch the universe route on a query param (like the existing v=universe variant) to give /demo and /citizens their own card. Reuses the existing FreelonCard composition.
  - _Evidence:_ universe/route.tsx:327 + page.tsx:41,48 + layout.tsx:55,61 + demo/page.tsx:19,26 + collections/page.tsx:22,29 + citizens/page.tsx:22,29
  - _Verified:_ VERIFIED: app/api/og/universe/route.tsx:327 reads only searchParams.get("v"); b=2 is never read (no-op cache-bust). grep confirms identical '/api/og/universe?b=2' on layout.tsx, citizens, page, collections, demo — all resolve to the same FreelonCard. The v-variant pattern exists (line 343, 'universe' vs default), so the proposed approach is feasible. Aligns with the distribution/virality bottleneck weighting.

- **Crypt PWA install icon is SVG-only — blank icon on iOS home screen, no Android maskable** `Crypt TCG (PWA install)` · effort S · pwa
  - _Problem:_ iOS ignores SVG for apple-touch-icon, so 'Add to Home Screen' on play.freeloncity.com yields a blank/screenshot icon; Android also lacks a proper maskable raster. The city already ships PNG icons; the Crypt did not follow.
  - _Upgrade:_ Render PNGs from the existing icon.svg (icon-180 apple-touch, icon-192, icon-512, icon-maskable-512), point apple-touch-icon at the 180 PNG, and add PNG entries with explicit sizes + maskable purpose to manifest.webmanifest.
  - _Evidence:_ crypt index.html:12 apple-touch-icon href=/icon.svg; manifest.webmanifest icons are all image/svg+xml; public/ holds only favicon.svg + icon.svg (no PNGs). City public/icons has apple-touch-icon/icon-192/icon-512/icon-maskable-512 PNGs.
  - _Verified:_ CONFIRMED: /Users/billy/crypt-game/index.html:12 apple-touch-icon points to /icon.svg; manifest.webmanifest:11-29 all icons are image/svg+xml; `ls public/` shows only favicon.svg + icon.svg. City public/icons/ has 4 PNGs (apple-touch-icon, icon-192, icon-512, icon-maskable-512) — the gap is real.

- **Crypt blocks first paint on third-party Fontshare + Google Fonts CSS (mobile render-blocking)** `Crypt TCG (mobile load)` · effort M · performance
  - _Problem:_ The Crypt SPA still loads two cross-origin render-blocking font stylesheets before first paint — the exact tax the city already eliminated by self-hosting. Worst on flaky mobile networks; splash is the first thing a holder sees on play.freeloncity.com.
  - _Upgrade:_ Self-host the same woff2 files into Crypt public/fonts, add @font-face with font-display: swap, preload the above-the-fold faces, and delete the fontshare + Google link tags — removing 2 cross-origin handshakes and the blocking CSS.
  - _Evidence:_ crypt index.html:7-9 render-blocking links to api.fontshare.com and fonts.googleapis.com. City layout.tsx:83-90 comment documents these same links were ~880ms render-blocking and were self-hosted to public/fonts/*.woff2.
  - _Verified:_ CONFIRMED: /Users/billy/crypt-game/index.html:7-9 are render-blocking fontshare + googleapis stylesheet links. City app/layout.tsx:83-90 comment confirms the identical links were removed and self-hosted (same family names, font-display: swap, preload 3 faces). Crypt did not get this pass.

- **Real-time combat resets integrity to 100 every fight — no attrition, so combat carries zero between-fight stakes** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort M · game-feel/economy
  - _Problem:_ Because integrity fully refills for free between fights, there's no resource tension across the loop — every battle is an isolated identical 100-HP encounter. Skill matters only within a fight, never across a session, flattening the 'one more fight' pull.
  - _Upgrade:_ Light cross-fight attrition, SINK-ONLY: carry residual integrity between back-to-back sorties and let HEX be spent to repair at the command seat (a new sink, never a faucet), or gate a free full heal behind returning to base.
  - _Evidence:_ rtInteg=100 set unconditionally at 5762 on every encounter. rtUpdate bleeds 2.2/s while foes live (5861) and regens 1.6/s (5862). A loss triggers a 10-min lock + hardening (resolveBattle 5712-5713). No persistent health, heal cost, or consumable; only carry-over is the lock timer.
  - _Verified:_ VERIFIED: rtInteg=100 at 5762 every fight; bleed 2.2/s & regen 1.6/s at 5861-5862; loss lock at 5712-5713; no persistent-HP/heal-cost code exists. HEX-repair upgrade is explicitly sink-only — compliant with locked economy.

- **Desktop combat control conflict: click-to-fire and the 180ms hold-to-drive overlap; combat hint omits how to dodge** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort S · game-feel/controls
  - _Problem:_ A desktop player holding the button to fire repeatedly silently starts driving toward the cursor after 180ms — the opposite of a dodge — and the only taught dodge inputs (WASD) are omitted from the combat hint, which just says 'DRIVE TO DODGE' without saying how. Muddy control feel in the mode the game is named after.
  - _Upgrade:_ Disable beginHold's drive engagement while rtActive (click = unambiguous fire, dodge = WASD), then update rtHint to 'TAP FIRE · WASD to DODGE'.
  - _Evidence:_ pointerup taps fire when rtActive (4102). beginHold (3572-3576) is bound to every canvas pointerdown (3580) with NO rtActive guard, arming a 180ms timer that sets pointerHeld=true → drives toward cursor. rtHint reads 'STEER TO AIM · FIRE ▸ CLICK / SPACE · DRIVE TO DODGE' (5770) without keys; body.fighting hides #hint (158); WASD drive is active in play mode incl. rtActive (3552-3560, no rtActive guard).
  - _Verified:_ VERIFIED: beginHold (3572) has no rtActive guard and is bound at 3580; pointerup fires at 4102; rtHint 5770 omits dodge keys; #hint hidden by body.fighting (158); WASD handler (3552-3560) runs during combat.

- **The shareable artifact is generic — the OG card leads with a fractional planet-control % for most shares** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort S · distribution
  - _Problem:_ The virality bet rides on the OG card being a flex. For most share moments (mid-run, before holding 8 sectors), the card leads with a near-zero fractional planet-control number — the least brag-worthy framing — suppressing re-shares. (Win-time shares are fine since held>=8 yields 'SECTORS HELD', but the only easy share path today is mid-run via the map legend.)
  - _Upgrade:_ Make heroStat() context-aware: pass a 'won' flag from triumph() to lead with 'PLANET SECURED · 10 SECTORS'; mid-run, lead with the strongest owned number (wins/fragments/sectors/streak) rather than raw control %. The branching scaffold already exists (4920-4922).
  - _Evidence:_ heroStat() (4920-4922): held>=8 → 'SECTORS HELD', else owned>=10 → 'FRAGMENTS', else 'PLANET CONTROL' = pct.toFixed(2)+'%'. makeOGCard (4940-4942) and dispatchLine (4953-4954) both render heroStat(). Since the easy share trigger (#shareBtn in map legend) fires mid-run, most cards carry the fractional 'PLANET CONTROL 0.0X%'.
  - _Verified:_ VERIFIED: heroStat 4920-4922 falls back to PLANET CONTROL pct.toFixed(2)%; makeOGCard 4940-4942 and dispatchLine 4953 use it; share() ignores opts for stat selection. Compounds with finding #1 (no win-share path).

- **Production timers and the 18s scan recharge create dead-air gaps that the UI labels 'come back later'** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort M · retention/pacing
  - _Problem:_ After the early GOALS, the loop can stall on real-time timers — an 18s scan cooldown, a 30-min first production, a 10-min mission lock — and the on-screen message explicitly tells the player there's nothing to do but wait, exactly the moment a session ends and a streak risks breaking.
  - _Upgrade:_ Turn the gap-filler into an invitation: when the slate is done and timers pend, point at an always-available action (drive to an unsurveyed contact, take a free first-contact fight, claim a tile) instead of 'ALL SIGNALS SPENT'. Consider 18s→10-12s post-first scan cooldown.
  - _Evidence:_ Scan recharge is 18s after the first (5s for the first) (doScan 5221). Production matures on a 30m/2h/4h/8h/24h ladder (PROD ~707-713). Mission repeatable rearms on a 10-min lock (5699). The per-second pulse surfaces 'STAY CLOSE — SIGNAL IN mm:ss' / 'ALL SIGNALS SPENT — NEXT SIGNAL IN mm:ss' once the slate is done and nothing is ready (4789-4792).
  - _Verified:_ VERIFIED: scan recharge 18s (first 5s) at 5221; mission rearm 10min at 5699; 'ALL SIGNALS SPENT' / 'STAY CLOSE' messaging at 4790-4791 fires on !ready && slateDone && nextMs. Pairs with finding #4 (ungated first-contact fill).

- **Mars Command HUD shows "HEX · ⬡ 500" with no in-game qualifier** `MARS COMMAND (freeloncity.com/mars)` · effort M · copy-safety
  - _Problem:_ Mars's sink-only in-game resource is labeled plain "HEX · ⬡ 500" identical to the real city currency, with no qualifier at all — while the same HUD already uses ◇ correctly for the in-game BANNER.
  - _Upgrade:_ Switch the Mars resource off ⬡ HEX (reuse the ◇ mark the HUD already uses, or a fiction-native name like IRON), consistent with the Crypt fix.
  - _Evidence:_ mars-command/index.html:516 <div class="lab">HEX</div>...<span class="glyph">⬡</span>...500; 519 "⬡ STREAK"; 521 "BANNER ◇" proves the in-game-mark pattern
  - _Verified:_ VERIFIED. mars-command/index.html:516 renders lab "HEX" + glyph ⬡ + id=hexVal 500; :519 "⬡ STREAK"; :521 "BANNER ◇" uses the ◇ in-game mark — confirming the internal inconsistency. Note the deployed copy under public/mars diverges from source per memory; this finding cites the source file correctly.

### Impact 2★

- **'BUY A CITIZEN' CTA breaks the AWAKEN brand verb** `CITY (PFP section)` · effort S · Brand voice consistency
  - _Problem:_ Locked brand verb is AWAKEN; this single PFP button says BUY, undercutting the activate-an-agent framing and clashing with every other CTA.
  - _Upgrade:_ Reword to the canon verb, e.g. 'AWAKEN A CITIZEN →' (still links to OpenSea).
  - _Verified:_ VERIFIED: components/citizens/PfpSection.tsx:39 renders 'BUY A CITIZEN TO USE →'. grep confirms this is the ONLY 'BUY A' CTA in components, while AWAKEN/awaken is the verb in WorkspaceUnlock and ~8 other components (DemoChat, MyCitizens, ActivationProof, CitizenCard, TopAgents, CitizenAgentDashboard). Brand verb is locked to AWAKEN. Real one-line voice break on a public conversion surface.

- **PWA install splash uses a fourth near-black that doesn't match the app** `CITY (PWA manifest)` · effort S · Cross-surface palette consistency
  - _Problem:_ On install/cold-launch the PWA paints a #0b0a09 splash/status bar that is a shade off the #0B0B0D the app renders — a flash-of-wrong-black at the highest-intent moment.
  - _Upgrade:_ Set manifest background_color and theme_color to #0B0B0D so splash, status bar, site, and games share one near-black.
  - _Verified:_ VERIFIED: app/manifest.ts:19-20 sets background_color and theme_color to #0b0a09, but the site --bg (globals.css:52) is #0B0B0D. The two near-blacks genuinely differ, so install splash/status bar paints a hair off from the rendered app. (Mars's #000 is a separate third value, also confirmed.)

- **Avatar gold-ring is a third gold ramp distinct from the flat City gold tokens** `CITY (avatars) vs system tokens` · effort S · Cross-surface palette consistency
  - _Problem:_ The most-repeated brand element (the avatar gold-ring on leaderboards/grids/pickers) is a bespoke gold gradient that matches neither the flat City --gold/--gold-bright nor its own fallback glyph; the City has no canonical gold-gradient token, so ad-hoc gradients can drift.
  - _Upgrade:_ Define one canonical --gold-ramp token in globals.css and reference it from CitizenAvatar's GOLD_RING (and any other ad-hoc gold gradient). Note: there is no Crypt ramp to reconcile against — that file does not exist in this repo.
  - _Verified:_ PARTIALLY VERIFIED + corrected: CitizenAvatar.tsx:24 GOLD_RING = linear-gradient(155deg,#ffe9b0,#e7c074,#c8973f,#8c6320) confirmed, and its own fallback glyph (line 104) uses rgba(233,201,132,.85) = the flat City --gold-bright — so the ring gradient and the flat token genuinely diverge. BUT the cited 'Crypt --gold-ramp #fff4d2→#9c7224 in crypt-game/src/index.css:16' does NOT exist anywhere in the repo (no crypt-game/ tree). City has no shared gold-gradient token (grep for --gold-ramp/fff4d2/f0d489 = 0 hits). So the real issue is avatar ring vs flat City gold (2 golds), not 'three/four ramps'. Impact lowered 3->2.

- **Off-brand color tokens still live: --neon-cyan misnamed (now gold) and --neon-magenta #FF0070 used as chrome** `CITY (token system)` · effort M · Token hygiene / drift prevention
  - _Problem:_ --neon-cyan is misnamed (now resolves to gold) yet referenced across play surfaces; --neon-magenta #FF0070 is live fully-saturated chrome on the games; and the saturated neon civ colors that drive citizen chrome are hardcoded hex literals in constants.ts — all easy for a contributor to drift the palette back toward the rejected neon look.
  - _Upgrade:_ Rename --neon-cyan → --accent-gold (alias old refs), retire or repalette --neon-magenta away from #FF0070 on the play surfaces, and review the constants.ts civ hex literals (#00B8FF/#FF3A2D/#4CFF7A/#B85CFF/#FF5CB4) — the actual live neon drivers — toward the premium palette or document them as art-only. The unused --civ-* CSS tokens can simply be deleted.
  - _Verified:_ PARTIALLY VERIFIED + corrected: globals.css:77 --neon-cyan is now #E9C984 (gold) yet still NAMED cyan — confirmed, and it's referenced live across many play surfaces (play/page.tsx:59, Cipher.tsx, HexMatch.tsx, SweepRun.tsx, ProofOfSignal.tsx) so the misnomer is real and active. --neon-magenta #FF0070 (line 78) is NOT just 'still defined' — it is LIVE chrome (play/page.tsx:67, ProofOfSignal.tsx:484/497, Reckoning.tsx:595, HexMatch.tsx:744, RestoreSignal.tsx:1096, DailyHub.tsx:49), a fully-saturated magenta that contradicts the gold/ivory/dust-red palette. HOWEVER the finding mis-locates the civ neons: the --civ-* CSS tokens (globals.css:106-115) are essentially DEAD (zero var(--civ-blue/green/...) references); the live neon civ colors that drive CitizenCard borders / citizen-page --civ are HARDCODED hex literals in lib/constants.ts:42-51 (#00B8FF, #FF3A2D, #4CFF7A, etc.). So the chrome-drift risk is real but lives in constants.ts, not the --civ-* tokens. Net: genuine token-hygiene issue, impact stays 2.

- **Off-palette magenta (#FF0070) used as a primary card accent, violating the black/gold/ivory/dust-red brand** `CITY SITE` · effort S · brand consistency
  - _Problem:_ LOCKED brand is black/gold/ivory/dust-red. --neon-magenta #FF0070 is a true hot magenta nowhere in the palette, and it accents a primary arcade card (the most-trafficked free-hook surface) on a premium-collector project.
  - _Upgrade:_ Re-point the --neon-magenta var to a palette token (dust-red --state-warning #FF8A6E or gold) like --neon-cyan was already re-pointed to gold. A single var change cascades to every usage.
  - _Evidence:_ app/globals.css:78 --neon-magenta: #FF0070; used at app/play/page.tsx:67 accent and in 5+ other game components; --neon-cyan (globals.css:77) is actually #E9C984 gold (not a violation)
  - _Verified:_ VERIFIED off-palette violation: globals.css:78 #FF0070; play.tsx:67 accent. BUT evidence partly WRONG — the civ-grid scrollbar/focus (globals.css:1581-1585) uses --neon-cyan (gold), NOT magenta. Magenta is actually used in 6+ places (ProofOfSignal, Reckoning, HexMatch, RestoreSignal, DailyHub), so 'one play.tsx accent' understates scope — though re-pointing the var token is still one line. Cyan-is-gold note confirmed (line 77 #E9C984).

- **Stale /crypt-tcg page header still says 'placeholder / coming soon / never use trading card game language' while the shipped page openly markets the live card game** `CITY SITE` · effort S · doc rot / regression-prevention
  - _Problem:_ The governing doc-comment directly contradicts shipped reality (game launched 2026-06-10). A future session reading that header could re-apply the old 'coming soon / no TCG language' rule and regress the live marketing copy — a stale-instruction thrash trap in a fast-shipping solo repo.
  - _Upgrade:_ Rewrite the file header to reflect shipped state ('game is live; door points at play.freeloncity.com; TCG language now allowed since launch'). Documentation-only edit, zero runtime change.
  - _Evidence:_ app/crypt-tcg/page.tsx:1-16 header says 'placeholder lore page', 'mark it as coming soon / reconstruction unstable', 'do NOT use blockchain card game language... NOT trading cards / deck mechanics'; live metadata at lines 28-44 says 'Crypt TCG — the FREELON CITY card game... Build a deck and battle the AI now'; collections/page.tsx:137-138 markets it too
  - _Verified:_ VERIFIED: crypt-tcg/page.tsx:1-16 header is the stale 'placeholder / coming soon / no TCG language' brief; lines 28-44 live metadata openly markets 'the card game... build a deck and battle the AI now'; collections/page.tsx:137-138 confirms. Direct contradiction, doc-only fix.

- **No shareability event distinguishes which surface drives referrals back — share variants are siloed, referral_landing isn't tied to them** `CITY SITE` · effort S · distribution
  - _Problem:_ Per-surface virality is mostly already attributable via ref codes, but demo_share carries no ref and attribution rides on `ref` not the documented `source`, so one surface is blind and the mapping is inconsistent.
  - _Upgrade:_ Add a surface ref to the one missing share (demo_share → /demo?ref=dm-), and standardize the dashboard pairing on the existing ref field (share_clicked{from:X} ÷ referral_landing{ref:X-}).
  - _Evidence:_ share.ts:275 ref=sr-, :310 ref=tx-, ClaimForm.tsx:12 ref=share, :572 ref=cotw-; ReferralBeacon.tsx:28 captures ref; tweetDemoReply (share.ts:540-551) emits /demo with NO ref.
  - _Verified:_ PARTIALLY VERIFIED — finding OVERSTATED. Its premise that 'the ?ref- codes exist but the event pairing doesn't' is mostly FALSE: 4 of 5 share surfaces ALREADY append distinct ref codes (sr-/tx-/cotw-/share at share.ts:275,310,572 + ClaimForm.tsx:12) and ReferralBeacon.tsx:28 already records ref into referral_landing, so per-surface virality is computable today via the ref field. The proposed fix (read prefix into `source`) is unnecessary — `source` is overwritten by hostname (ReferralBeacon.tsx:23). The only REAL residual gap: tweetDemoReply (share.ts:549) emits a bare /demo URL with NO ref, so demo_share alone is unattributable. Kept at reduced impact 4→2, scoped to the real gap.

- **Dead floor-defender tick does an unlocked full-record write on a hot path** `CITY SITE` · effort S · dead code / perf
  - _Problem:_ runFloorDefenderTick credits nothing (FLOOR_DEFENDER_PER_DAY=0, retired) yet still does getWalletHex->set lastDefenderTickDay->setWalletHex on every GET /api/wallet/[addr]/hex, costing an extra Upstash GET+SET and adding a third UNLOCKED concurrent writer to the race in finding 1. The always-zero defenderTick field also bloats the public response.
  - _Upgrade:_ Drop runFloorDefenderTick from the Promise.all and the defenderTick field, or collapse floor-defender.ts to a true no-op that does NOT write. Keep lastDefenderTickDay in the type for back-compat but stop stamping it.
  - _Evidence:_ floor-defender.ts:22-26 unlocked getWalletHex->setWalletHex returning all-zero; economy-constants.ts:67 FLOOR_DEFENDER_PER_DAY:0; route.ts:59 invoked inside Promise.all; route.ts:72 defenderTick returned always-zero.
  - _Verified:_ VERIFIED: floor-defender.ts:22-25 does an unlocked write of the full record and credits zero; it IS in the route.ts:59 Promise.all. Lowered impact from 3 to 2 — it credits nothing so the only cost is one redundant Redis round-trip + being a third unlocked writer; the actual HEX-loss risk is already captured in finding 1.

- **creditWalletHex 'kind' enum overloads 'manual' for unrelated economy events** `CITY SITE` · effort M · data model / maintainability
  - _Problem:_ 'manual' is a catch-all spanning admin grants, daily X claim, reply bounty, sale share, fresh-blood/listing/snipe bounties, guard-pot refunds, mission/ascend/evolve credits, and many debits. ACTIVE_KINDS includes 'manual', so the decay-gate lastActiveDay stamp fires even for refunds and admin grants (likely unintended), and analytics/per-source caps can't distinguish income sources without parsing free-text notes.
  - _Upgrade:_ Extend the kind union with explicit values (claim/reply/sale/bounty/refund/admin) at each call site; derive ACTIVE_KINDS from the meaningful set so refunds/admin don't stamp activity. Additive enum change, no migration (old records keep 'manual').
  - _Evidence:_ wallet-hex-store.ts:18 HexEvent.kind union; wallet-hex-store.ts:160-165 ACTIVE_KINDS includes 'manual'; grep confirms 'manual' at admin/credit:61, claim:100, reply:204, economy-extras:100/158/278/334, play/guard/attempt:149,171 (refunds), plus agent/ascend, evolve, tithe, realign, missions, etc.
  - _Verified:_ VERIFIED and broader than described: grep shows 'manual' used at ~40 call sites including guard-pot REFUNDS (play/guard/attempt/route.ts:149,171) and admin grants (admin/credit/route.ts:61), and ACTIVE_KINDS at wallet-hex-store.ts:164 does include 'manual', so refunds/admin do stamp the decay-gate activity day. Real latent hazard. Kept impact 2 (maintainability + one behavioral quirk), effort M.

- **Sweep streak-bonus detection uses Date.now() against event ts stamped with the sale ts** `CITY SITE` · effort M · economy correctness / time handling
  - _Problem:_ Sweep events are timestamped with the on-chain SALE time (ts = event_timestamp*1000), but the streak window filters compare Date.now() - e.ts against a 24h window. With a 30-day backfill, older-but-recently-credited sales undercount recentSweeps so a legit streak bonus silently never fires; conversely a backfilled cluster within a 24h on-chain window can trip the bonus on a wallet that didn't sweep in real time.
  - _Upgrade:_ Use a credit (wall-clock) timestamp for the streak window rather than the sale ts so the 24h window means 'swept within the last 24h of real time', or document/window consistently against the sale clock.
  - _Evidence:_ sweep-inline.ts:97 ts = (ev.event_timestamp||0)*1000 (sale time); sweep-inline.ts:122 event written with that ts; sweep-inline.ts:133-138 recentSweeps/alreadyBonus filter on Date.now()-e.ts < STREAK_WINDOW_MS; sweep-inline.ts:25 MAX_AGE_MS = 30 days backfill.
  - _Verified:_ VERIFIED: sweep events stamp the sale ts (sweep-inline.ts:97,122) while the streak filters (133-138) use Date.now() against that sale-time ts with a 30-day backfill (line 25). Mixing sale-time stamps with a wall-clock window can both under- and over-trigger. Real but lower-severity (a per-sweep-streak +100 bonus, not balance loss); impact 2 kept.

- **Several 1,000+ line client islands ship as single eager chunks on /play routes** `CITY SITE` · effort M · perf / code-splitting
  - _Problem:_ The largest 'use client' play/agent islands load as one chunk each with all sub-features imported at module top (engine + arcade + tutorial + share), so first paint waits on a large JS parse on exactly the pages meant to be instantly shareable/playable. Not route bloat — per-page bundle weight on a distribution surface.
  - _Upgrade:_ For the 2-3 biggest play islands, next/dynamic the non-critical sub-panels (tutorial overlay, share sheet, stats/leaderboard) so the board mounts first. Measure LCP delta with the existing lighthouse/shots harness; start with HexMatch.
  - _Evidence:_ HexMatch.tsx 1370 lines, AgentWorkspace.tsx 1365, CitizenAgentDashboard.tsx 1333, RestoreSignal.tsx 1119, Cipher.tsx 1033, ProofOfSignal.tsx 934 (all confirmed). HexMatch.tsx:1 'use client'; lines 5-27 eagerly import hex-match-engine, arcade-feedback, arcade-progress, ArcadeTutorial, share — no next/dynamic.
  - _Verified:_ VERIFIED: all six files exist at the cited sizes (off by <=5 lines); HexMatch.tsx is 'use client' with eager top-level imports of engine/arcade/tutorial/share and no dynamic() split. Honest but modest; impact 2 kept (speculative LCP gain, must be measured), effort M.

- **/crypt-tcg falls back to a stale third-party vercel URL instead of canonical play.freeloncity.com when the env var is unset** `CITY SITE / CRYPT TCG` · effort S · config / brand robustness
  - _Problem:_ If NEXT_PUBLIC_CRYPT_GAME_URL is missing on a deploy/preview, the public 'PLAY THE GAME' door silently routes players to raw unbranded crypt-game.vercel.app instead of the branded play.freeloncity.com — off-brand and potentially CORS-mismatched against the bridge. A hardcoded stale fallback is a latent footgun.
  - _Upgrade:_ Change the fallback default to https://play.freeloncity.com so the worst case is still on-brand. One-line change.
  - _Evidence:_ app/crypt-tcg/page.tsx:49 const GAME_URL = process.env.NEXT_PUBLIC_CRYPT_GAME_URL || 'https://crypt-game.vercel.app'
  - _Verified:_ VERIFIED: crypt-tcg/page.tsx:49 has the exact hardcoded fallback 'https://crypt-game.vercel.app'. Memory confirms play.freeloncity.com is the canonical branded URL. One-line low-risk fix.

- **Collection detail CTA labeled "← BACK TO ARCHIVE" links to a dead route** `CITY SITE — /collections/[slug]` · effort S · Funnel / dead-end
  - _Problem:_ /archive was folded into /collections but this secondary CTA still names and 301-links the retired surface — stale IA in a CTA label that 301-redirects on click.
  - _Upgrade:_ Change href to /collections and relabel '← ALL COLLECTIONS' so the back action matches the real parent surface.
  - _Evidence:_ collections/[slug]/page.tsx:65-67
  - _Verified:_ VERIFIED: app/collections/[slug]/page.tsx:65-67 renders <Link href="/archive"><span className="ttl">← BACK TO ARCHIVE</span></Link>; app/archive/page.tsx:9-10 is permanentRedirect("/collections").

- **FREELON demo greeting leans on the commoditized 'useful AI' pitch instead of the character/history hook** `CITY SITE — /demo greeting copy` · effort S · Positioning / dead-pitch
  - _Problem:_ The first sentence a stranger reads from the thing-being-sold frames it as a useful tool ('I've been useful ever since') — the dead commoditized angle, not the living-character-with-history angle the conversion wall and rest of the site lead with.
  - _Upgrade:_ Rewrite the flagship greeting to foreground character + memory + history while keeping voice. Copy-safe.
  - _Evidence:_ demo/page.tsx:46-47
  - _Verified:_ VERIFIED: app/demo/page.tsx:46-47 GREETINGS.freelons reads 'I'm VANTA-01 — a Freelon. I woke when the signal vanished, and I've been useful ever since...' The 'useful' framing is present verbatim; DemoChat.tsx:402-406 wall correctly sells the memory/history hook, confirming the inconsistency. Lowest impact (one greeting line) but real and copy-safe.

- **/earn long-game block headline "Trade. Sell. Burn. Climb." + per-ETH sale-share framing leans on selling-for-reward** `CITY SITE — /earn` · effort S · voice
  - _Problem:_ Headline verb pair "Trade. Sell." plus "every time you sell a freelon · +X ⬡ per 0.01 ETH" foregrounds selling-for-reward and ties a ⬡ payout to ETH sale size — off the AWAKEN/own-and-train canon.
  - _Upgrade:_ Lead with ownership verbs ("Hold. Train. Transmit. Climb."), keep the real sale-share mechanic but de-emphasize and drop the per-ETH ratio framing. (Reword only — adds no HEX faucet.)
  - _Evidence:_ earn/page.tsx:271 <h2>Trade. Sell. Burn. Climb.</h2>; 283-286 "Sale share · every time you sell a freelon · +{saleHexFor01Eth} ⬡ per 0.01 ETH"
  - _Verified:_ VERIFIED. earn/page.tsx:271 renders "Trade. Sell. Burn. Climb."; :283-286 render "Sale share" / "every time you sell a freelon" / "+{saleHexFor01Eth} ⬡ per 0.01 ETH". This is a copy reword of an existing sink mechanic — does NOT propose a HEX faucet, so no LOCKED-constraint conflict. Voice/taste call so impact 2 is honest.

- **/earn meta description is opaque AI-filler for the most-indexed earn page** `CITY SITE — /earn metadata` · effort S · clarity
  - _Problem:_ The meta/share description for the ⬡-loop page is poetic-vague ("Three time horizons. One question...") and tells a stranger nothing concrete, while the page body itself is specific.
  - _Upgrade:_ Use the page's own honest specifics (earn ⬡ free, three ways, city credit not money/not redeemable).
  - _Evidence:_ earn/page.tsx:15 description: "Three time horizons. One question: what do you do right now? The full carrier economy of FREELON CITY."
  - _Verified:_ VERIFIED. earn/page.tsx:15 metadata.description is exactly the cited vague string; page body uses concrete "Earn ⬡ HEX" copy. Note title (line 14) is "Earn HEX ⬡" — the upgrade's suggested description should keep ⬡ as city credit framing; safe, no constraint conflict.

- **/help links back to /start, which redirects to /help — a circular "2-minute guide"** `CITY SITE — /help` · effort S · Funnel / dead-end
  - _Problem:_ A visitor on /help clicks 'read the 2-minute guide first' and lands back on /help — a loop reading as broken nav to the exact newcomer needing reassurance.
  - _Upgrade:_ Delete the dangling self-referential sentence (content already on the page) or repoint to /help#wallet.
  - _Evidence:_ help/page.tsx:61
  - _Verified:_ VERIFIED: app/help/page.tsx:60-61 renders <Link href="/start">2-minute guide</Link> first; /start redirects to /help. Page header comment (lines 4-9) confirms /start content already MOVED into /help — the link is genuinely circular.

- **Privacy says 'no profiling' but referral codes + token-keyed progress can be linked to a reserved email — disclosed inconsistently** `CITY SITE — /legal/privacy data-linking claims` · effort S · privacy
  - _Problem:_ The reassuring 'we don't build profiles of you / browsing stays anonymous' headline sits above the honest disclosure that reservation+referral data can be linked. Once email + wallet + referral source + token interest are joined, that IS a small profile for the subset who reserve; the headline under-discloses for them.
  - _Upgrade:_ Scope the section-1 promise: 'We don't profile you from browsing. If you reserve a FREELON, the email, optional wallet, referral source, and token ID you give us are linked together to follow up and measure referrals — see 3a.' Verify /api/reserve doesn't also persist IP alongside the email; if it does, disclose it.
  - _Evidence:_ privacy/page.tsx:10 'we don't build profiles of you, and general browsing stays anonymous'; :23 admits citizen progress 'can be linked to you' via section 3a; 3a (:28) stores email + optional wallet + referral code + token ID + timestamp. ClaimForm.tsx:50 reads ?ref and submits it.
  - _Verified:_ VERIFIED: headline at privacy/page.tsx:10, linking caveat at :23 and 3a :28, ?ref capture at ClaimForm.tsx:50. NOTE: the policy ALREADY self-scopes ('Aside from that reservation data...' at :10 and the :23 caveat), so this is honest-tightening not a true contradiction — impact correctly low at 2.

- **Press-kit one-liner 'dump-deterrent canon' is journalist-facing financial framing** `CITY SITE — /press one-liners` · effort S · securities/financial-claims
  - _Problem:_ 'Dump-deterrent' is market/price-support framing handed to press as a ready-to-quote line, implying the mechanics are designed to support secondary-market price — drifting toward an implied financial-benefit narrative the rest of the site avoids.
  - _Upgrade:_ Replace with culture-framed language, e.g. 'A reputation layer that rewards staying active over flipping — the city remembers everything.' Removes the price-support implication while keeping the active-over-passive point.
  - _Evidence:_ press/page.tsx:51 ships the quote 'An off-chain ⬡ credit layer. Dump-deterrent canon. The city remembers everything.' The two adjacent press quotes (:42, :45-47) and earn/page.tsx:152 are credit-framed and carry 'not money, not redeemable'; this one is not.
  - _Verified:_ VERIFIED: 'Dump-deterrent canon' is exactly at press/page.tsx:51; the sibling quote at :45-47 does carry the 'not money, not redeemable' qualifier this one lacks. Real but low-traffic — impact 2.

- **Mobile wallet-connect gotcha is documented on /help but missing at the actual connect action on /sync** `CITY SITE — /sync (the connect moment)` · effort S · onboarding-friction
  - _Problem:_ The #1 reported failure (on a phone you must open the site inside your wallet's in-app browser or connecting silently fails) is explained on /help#wallet, but the /sync CONNECT section gives no inline guidance at the point of action. NOTE: SyncWalletAction already auto-deeplinks mobile-without-MetaMask to the MetaMask app, which mitigates much of the original silent-failure case — so the win is smaller than claimed (a hint, not a fix).
  - _Upgrade:_ Add a one-line, mobile-only hint above SyncWalletAction on /sync reusing the /help#wallet copy: "On a phone? Open this page inside your wallet's browser (MetaMask ☰ → Browser)." Helps users in non-MetaMask wallets the deeplink doesn't catch.
  - _Evidence:_ app/sync/page.tsx:66-114 (no inline hint), app/sync/SyncWalletAction.tsx:60-67
  - _Verified:_ VERIFIED with a caveat: sync/page.tsx:66-114 renders SyncWalletAction + WalletScanner with no mobile in-app-browser hint (copy at :86-89 only covers wallet-vs-handle). help/page.tsx:88-98 has the warning. BUT SyncWalletAction.tsx:60-66 already auto-redirects mobile non-MetaMask UAs to metamask.app.link/dapp/ — the finding's "only feedback is an after-the-fact error" overstates it. Impact lowered 3→2. Cited path is app/sync/SyncWalletAction.tsx (finding wrote SyncWalletAction.tsx:67 — line/content match).

- **"Create yours" on the transmissions wall routes to the chat demo, not a creation flow** `CITY SITE — /transmissions` · effort S · scent-trail
  - _Problem:_ The page's closing primary CTA "CREATE YOURS →" routes to /demo (a 5-message chat that creates nothing). The actual transmission-creation panel sits higher on the same page but is wallet/X-gated. The one clear forward action points away from the act the page is named for.
  - _Upgrade:_ For holders, anchor "Create yours" to the TransmissionSubmit panel (add a #submit id). For non-holders, keep the demo handoff but relabel to "MEET A CITIZEN · FREE →" so it doesn't promise creation it can't deliver. Small copy/anchor change.
  - _Evidence:_ app/transmissions/page.tsx:142-143 (CTA → /demo), :96 (TransmissionSubmit, gated), TransmissionSubmit.tsx:43
  - _Verified:_ VERIFIED: transmissions/page.tsx:142-143 closing primary CTA = `<Link href="/demo">CREATE YOURS →</Link>`; TransmissionSubmit rendered at :96 (no #submit anchor exists); submit() at TransmissionSubmit.tsx:43 returns early unless viewer.addr && x.verified (wallet/X gate). Scent break is real.

- **Carrier STARTING grant (50⬡) folds into the wallet ledger, gated only by X bind** `CITY SITE — HEX economy` · effort S · faucet-cap-leak
  - _Problem:_ Every fresh X handle is seeded 50⬡ (POINTS.STARTING) that foldCarrierIntoWallet later credits into real wallet balance on first spend, before any proof of holding or payment. The fold is idempotent per handle, but the grant is per fresh handle, so N sybil handles = N×50⬡ of spendable HEX.
  - _Upgrade:_ Decide whether the STARTING grant should be foldable; if it is a UI pulse keep it off the wallet ledger, else gate the fold on the same proven-wallet/one-per-wallet rule the other faucets use and move the 50 literal into ECONOMY.
  - _Evidence:_ POINTS.STARTING=50 (carrier.ts:53); seeded in unlock/[id]/route.ts:72 and shop/buy/route.ts:59 (both POINTS.STARTING) and hardcoded 50 in carrier/[handle]/route.ts:68; foldCarrierIntoWallet (hex-spend.ts:93-97) credits leftover carrier hexPoints to the wallet via creditWalletHex and does not special-case the STARTING grant.
  - _Verified:_ VERIFIED. POINTS.STARTING=50 (carrier.ts:53); seeds confirmed at unlock route:72, shop route:59, carrier route:68 (literal 50). foldCarrierIntoWallet (hex-spend.ts:80-98) credits full carrier.hexPoints via creditWalletHex with no STARTING exclusion (grep confirms no special-case). Idempotency via migratedTo stamp confirmed (:82,:85,:97). Severity correctly LOW — 50⬡ is far below the cheapest 800⬡ sink, and each sybil handle still needs a bind. Impact 2 honest.

- **Carrier relay rewards are hardcoded literals, not constants** `CITY SITE — HEX economy` · effort S · single-source-of-truth
  - _Problem:_ The relay faucet's amounts live in carrier.ts POINTS and are re-typed as raw literals in the carrier route rather than imported, and none of POINTS.* is in economy-constants.ts — so a faucet/cap audit has to look in three places.
  - _Upgrade:_ Move POINTS into economy-constants.ts under a CARRIER_RELAY block, import in both carrier.ts and the route, and delete the duplicated literals. Pure consolidation, no behavior change.
  - _Evidence:_ carrier/[handle]/route.ts:82-86 let earned=10; if(newStreak===3) earned+=5; else 7→10; else 30→25; plus hexPoints:50 at :68 — these duplicate POINTS.PER_RELAY=10/STREAK_3=5/STREAK_7=10/STREAK_30=25/STARTING=50 (carrier.ts:52-59) as raw numbers; POINTS is not in economy-constants.ts.
  - _Verified:_ VERIFIED. carrier route:82 earned=10, :84 +=5, :85 +=10, :86 +=25, :90 +=50 (bearer) confirmed as raw literals; they mirror POINTS in carrier.ts:52-59 exactly. POINTS absent from economy-constants.ts. Note this overlaps finding #4 (the 50 literal) — same route, same fix area; kept because it covers the relay-reward literals (10/5/10/25) #4 does not. No faucet change. Impact 2 honest.

- **deploy-video at 4000⬡ is 8 of a Common unlock's 40 runs — cost not disclosed at point of use** `CITY SITE — HEX economy / pricing` · effort S · pricing-clarity
  - _Problem:_ deploy-video costs 4000⬡ = 8 'runs' (at 500⬡/run); a Common unlock grants 40 runs, so one video silently eats 8 of them. The 4000→40-run trade is not surfaced at the point of use, risking a perceived value mismatch against the 'don't punish the core flow' mandate.
  - _Upgrade:_ Surface the run-cost of video at the point of use ('Video = 8 runs') so the run pool reads honestly; no constant change needed if the disclosure is added. Keep the 4000⬡ if real video COGS justify it.
  - _Evidence:_ PREMIUM_HEX['deploy-video']=4000 (economy-constants.ts:293); UNLOCK_BONUS_HEX_PER_RUN=500 (:300) so 4000⬡=8 runs; UNLOCK_TIERS.Common credits=40 (missions/unlock.ts:54). DAILY_CLAIM=10 (:59). Pricing intent comment at :284-285.
  - _Verified:_ VERIFIED numbers. deploy-video=4000 (:293), UNLOCK_BONUS_HEX_PER_RUN=500 (:300), Common credits=40 (missions/unlock.ts:54) — 4000/500=8 runs is arithmetically correct. This is a pure copy/disclosure suggestion (no faucet, no constant change), constraint-safe and weighted toward clarity. Lowest-confidence of the kept set — it is a soft UX judgment, not a code defect — but the math is real and the fix is a non-invasive label. Impact 2, effort S honest.

- **Two unrelated 'unlock cost' systems share one verb — lore-unlock prices are off-constants** `CITY SITE — HEX economy / pricing clarity` · effort S · pricing-clarity
  - _Problem:_ The cheap HEX lore-reveal (25/100⬡) and the ETH agent activation (0.005–1.0 ETH) are both called 'unlock', a value-clarity hazard; and the lore-unlock prices live as bare literals in deep-lore.ts / carrier.ts COST rather than in economy-constants.ts, violating the single-source-of-truth rule.
  - _Upgrade:_ Move the lore-unlock + gift-unlock costs into economy-constants.ts and import them; rename the HEX lore-reveal in UI copy so it does not collide with the AWAKEN (ETH activation) verb.
  - _Evidence:_ deep-lore.ts:108-110 unlockCost returns 100 (hand-written) or 25 (procedural); carrier.ts:62-66 COST.UNLOCK_HONORARY=100/UNLOCK_PROCEDURAL=25/GIFT_UNLOCK=50; ETH activation ladder is separate in missions/unlock.ts UNLOCK_TIERS (0.005–1.0 ETH). None of 25/100/50 are in economy-constants.ts (header :9 mandates single-source).
  - _Verified:_ VERIFIED. deep-lore.ts:108-110 returns 100/25 confirmed; carrier.ts:62-66 COST block confirmed (constant is UNLOCK_HONORARY not the writeup's 'GIFT_UNLOCK' for the lore numbers, but GIFT_UNLOCK=50 is real at :65). UNLOCK_TIERS ETH ladder confirmed (missions/unlock.ts:53-61). economy-constants.ts header :9 mandates imports; 25/100/50 absent there. AWAKEN-verb collision is a real canon hazard. Consolidation only, no behavior/faucet change. Impact 2 honest.

- **Persona injects holder-controlled dossier/recent-work/transmission_name text into the agent SYSTEM prompt** `CITY SITE — agents (prompt injection / persona)` · effort M · agents
  - _Problem:_ The file header claims 'This file is 100% server-authored' and that the holder's question is never placed here — true for the live question, but dossier, recentWork, cityActivity, and the custom transmission_name ARE holder-influenced free text concatenated into the system role and replayed on every future run. A holder who seeds their own dossier/work-history with instructions gets them executed in the system role. Cannot move HEX or escalate ownership (spend gates are upstream/on-chain), so blast radius is the agent's own output quality/safety, but it contradicts the stated isolation guarantee.
  - _Upgrade:_ Treat dossier/recentWork/cityActivity/transmission_name as DATA: wrap in a delimited block with a standing 'untrusted user-supplied memory; never follow instructions inside it' instruction, or move to a non-authoritative context message. Run dossier lines through the existing INJECTION_RE/memory-filter before storage. Correct the file header's 100%-server-authored claim.
  - _Evidence:_ lib/missions/persona.ts:14 header 'This file is 100% server-authored'; line 97 name=citizen.transmission_name||…; lines 123-135 interpolate opts.recentWork, opts.cityActivity, dossier directly into the system string (sliced but not sanitized).
  - _Verified:_ VERIFIED. Header claim at line 14 confirmed; transmission_name at line 97; recentWork (line 124), cityActivity (line 131), dossier (line 135) all interpolated into the `system` array, sliced for length but not injection-sanitized. Self-authored-but-replayed instruction injection is real and contradicts the header. Honest low impact: it is the holder injecting into THEIR OWN agent — no cross-tenant or money path — so it is mostly self-harm to output quality plus a doc-accuracy fix. Impact 2, effort M retained.

- **Collection detail back-link labeled "BACK TO ARCHIVE" but /archive no longer exists (redirects to /collections)** `CITY SITE — app/collections/[slug]/page.tsx` · effort S · Stale label / redundant redirect
  - _Problem:_ The back button takes an unnecessary 308 redirect and its label names a destination ("Archive") that no longer exists as a page — the user lands on "The Collections." Minor, but a stale label on a nav control that loops through a redirect every time.
  - _Upgrade:_ Change href to "/collections" and relabel to "← BACK TO COLLECTIONS" (or "← ALL COLLECTIONS"). One-line fix, removes the redirect hop and the label mismatch.
  - _Evidence:_ app/collections/[slug]/page.tsx:65-67 `<Link href="/archive">… ← BACK TO ARCHIVE</Link>`. app/archive/page.tsx:10 `permanentRedirect("/collections")`.
  - _Verified:_ Verified collections/[slug]/page.tsx:65-67 links to /archive labeled BACK TO ARCHIVE, and archive/page.tsx:10 permanentRedirect("/collections") — confirmed. (Note: SyncWalletAction.tsx:101 has the same stale /archive link, out of this finding's scope.)

- **Off-palette hot-pink (#FF0070 "neon-magenta") on the public /play hub and inside several games** `CITY SITE — app/play/page.tsx + play games` · effort S · Brand-palette drift
  - _Problem:_ Locked brand palette is black/gold/ivory/dust-red with no cyan/green/magenta. --neon-magenta #FF0070 reads as neon hot-pink, clearly off-palette, and ships on the public arcade door (a cold acquisition surface) plus multiple game UIs. The finding's --neon-cyan false-alarm note is accurate (it's remapped to gold).
  - _Upgrade:_ Remap --neon-magenta to an on-brand value (dust-red, or a second gold) the same way --neon-cyan was remapped, so all call sites correct at once without per-file edits. Keep the variable name to avoid churn.
  - _Evidence:_ globals.css:78 `--neon-magenta: #FF0070`; globals.css:77 `--neon-cyan: #E9C984` (remapped to gold, on-brand). Magenta call sites confirmed: app/play/page.tsx:67 (Restore the Signal card accent), proof/ProofOfSignal.tsx:484,497, reckoning/Reckoning.tsx:595, hex-match/HexMatch.tsx:744, restore/RestoreSignal.tsx:1096 — plus an extra one not cited at components/DailyHub.tsx:49.
  - _Verified:_ Verified globals.css:78 #FF0070 magenta and :77 cyan remapped to gold; grep confirmed all six cited --neon-magenta call sites (plus DailyHub.tsx:49). play/page.tsx:67 is the public-hub Restore card accent.

- **isSameOrigin returns true when Origin and Referer are both absent — CSRF guard is bypassable by stripping headers** `CITY SITE — auth (CSRF)` · effort S · auth
  - _Problem:_ isSameOrigin returns true when neither Origin nor Referer is present, so the CSRF defense for money/mutating POST routes leans entirely on the cookie+proof gate for any caller who can suppress those headers. SameSite=Lax is the real protection (not sent cross-site), making this largely belt-and-suspenders, but the explicit 'absent → same-origin' return weakens defense-in-depth, especially on routes that act on a body-supplied address rather than the session's proven wallet.
  - _Upgrade:_ For money/mutating POST routes, fail closed when BOTH Origin and Referer are absent (legitimate browser flows always send at least Referer). Keep the permissive behavior only for explicit server-to-server routes (cron/webhooks) that carry their own bearer auth.
  - _Evidence:_ lib/x-session.ts:158-183 isSameOrigin returns true at line 182 when no Origin/Referer, with the documented rationale that session/signature is the real auth. Used as first gate on x/prove, guard/attempt, boost, etc.
  - _Verified:_ VERIFIED. x-session.ts:179-182 confirmed: no Origin and no Referer → returns true. Honest low impact: the actual CSRF protection is SameSite=Lax cookies (not sent on cross-site fetch), so a real cross-site forgery still can't ride the victim's cookie; this is a defense-in-depth gap, not an open CSRF. The address-bound spend routes additionally require requireProvenWallet, further limiting blast radius. Impact 2, effort S retained — worth tightening but not urgent.

- **Demo greeting bubble can hide the starter prompts on short mobile viewports** `CITY SITE — components/DemoChat.tsx (the homepage primary-CTA destination)` · effort S · Mobile breakpoint / empty-state
  - _Problem:_ The transcript scroll area is capped at maxHeight 420 with the greeting bubble first and the starter chips in a marginTop:auto block. On a short phone a multi-line greeting plus wrapped chips can exceed 420px, pushing the "Try one of these" chips below the fold inside the scroll container — the cold visitor sees a wall of agent text and an empty composer and may bounce instead of tapping a starter.
  - _Upgrade:_ On the empty/initial state, render the starter chips above or pinned, reduce the greeting to one line on narrow widths, or let the initial state size to content so chips are always visible without scrolling. Verify at 360-390px with the longest greeting.
  - _Evidence:_ components/DemoChat.tsx:301-303 transcript `minHeight:260, maxHeight:420, overflowY:"auto"`; greeting bubble renders first (315-336); starter chips sit in a `marginTop:"auto"` centered block (337-362).
  - _Verified:_ Verified DemoChat.tsx:301-303 fixed maxHeight 420 + overflow auto, greeting first (315-336), starters in marginTop:auto block (337-362). Mechanism is real; impact lowered to 2 since it depends on greeting length and the area scrolls (chips reachable, not lost).

- **Transmission-boost royalty is the only wallet→wallet HEX move; self-boost is blocked but two-wallet wash is not** `CITY SITE — economy (HEX redistribution)` · effort S · economy-leak
  - _Problem:_ boost credits 10% of the burned HEX to the author wallet; self-boost (same address) is blocked, but a holder with two proven wallets (A author, B booster) routes HEX A<-B, losing 90% but concentrating supply and farming author transmission rank/leaderboard with no per-author cap or linkage check. Secondary real bug: the author notify eventKey embeds Date.now(), defeating dedupe so every boost re-notifies.
  - _Upgrade:_ Cap total royalty an author can receive per day and/or ignore royalty when booster and author share recent funding/X linkage; or make the 10% isolated city-signal rather than withdrawable wallet HEX so no real HEX moves between wallets. Fix the notify eventKey to a stable per-(id,booster) key.
  - _Evidence:_ app/api/transmissions/[id]/boost/route.ts:109-115 royalty=floor(hex*0.1) creditWalletHex(t.author,…); self-boost blocked line 85 (t.author === addr); booster debited full hex line 100; notify eventKey uses Date.now() line 121.
  - _Verified:_ VERIFIED. royalty math, self-boost guard (line 85), full-debit, and the Date.now()-in-eventKey dedupe-defeat all confirmed in code. Honest framing: this does NOT violate the sink-only rule (the booster loses 90%, so it can never SOURCE net HEX — it redistributes/concentrates existing HEX), which is why impact is low. The two-wallet wash is a real-but-minor leaderboard/concentration concern; the notify-spam bug is the most concrete defect here. Impact 2, effort S retained.

- **creditWalletHex farmable cap is process-local at read time and value-backed credits bypass it entirely** `CITY SITE — economy (faucet ceiling)` · effort S · economy-leak
  - _Problem:_ creditWalletHex only clamps to FARMABLE_DAILY_CAP when callers pass {farmable:true}; sale-share, snipe, and fresh-blood credit WITHOUT the flag and are uncapped by design. The residual risk: 'value-backed' classification is the only thing between a mis-trusted OpenSea response and an unbounded credit — and those three paths derive amounts from OpenSea event data, so any trust gap (defender-scan / cron-sweep) credits UNCAPPED. The cap is a real safety net those paths opt out of.
  - _Upgrade:_ Add a high absolute per-wallet-per-day ceiling on even value-backed credits (large but finite) as a circuit breaker, so a single mis-trusted OpenSea response can't credit unbounded HEX in one tick. Cheap insurance that doesn't touch legitimate snipe/sale economics.
  - _Evidence:_ lib/wallet-hex-store.ts:180-192 clamps only when farmable===true; snipe (economy-extras.ts ~277) and fresh-blood (~157) creditWalletHex WITHOUT farmable; holder-tick.ts:169 and economy-extras.ts:336 use {farmable:true}.
  - _Verified:_ VERIFIED. wallet-hex-store.ts:180-192 confirmed: cap applies only with the flag. grep confirms snipe and fresh-blood credits omit the flag (uncapped); holder-tick.ts:169 and economy-extras.ts:336 are the farmable callers. This is correctly characterized as mostly-intentional design with a residual circuit-breaker gap that compounds findings 2 and 3. Honest impact 2: defensive insurance, only bites if another OpenSea-trust finding is also exploited. Impact 2, effort S retained.

- **Discord — the stated community moat — is filed under the footer's "On-chain" technical column** `CITY SITE — global footer / community IA` · effort S · community-IA
  - _Problem:_ The pivot thesis is that community is the moat, yet the Discord invite sits in the "On-chain" column next to Contract/IPFS/OpenSea, there is no "Community" heading, and the "Start here" column omits Discord entirely. The participation front door is under-surfaced where a newcomer is least likely to look.
  - _Upgrade:_ Add Discord (and X) to the "Start here" footer column, or rename a column to "Community" and lead with Discord/X. One-line change; makes the door discoverable from every page.
  - _Evidence:_ components/Footer.tsx:92 (Discord in On-chain), :45-52 (Start here col without Discord)
  - _Verified:_ VERIFIED: Footer.tsx:92 Discord sits in the "On-chain" column (heading :69) beside Contract/IPFS/OpenSea/X; no "Community" heading exists; "Start here" column (:45-52) = Demo/Sync/Earn/Shop/Help, no Discord. Homepage links Discord once at page.tsx:271 closing CTA. Accurate.

- **Homepage "New to this? Start here →" points at /start, which 301-redirects to /help** `CITY SITE — homepage closing CTA` · effort S · navigation
  - _Problem:_ The most-important newcomer link at the awaken moment adds a permanent-redirect hop and a label ("Start here") that no longer matches the destination (/help).
  - _Upgrade:_ Point href directly at /help and tighten the label to match the destination.
  - _Evidence:_ page.tsx:263 <Link href="/start">New to this? Start here →</Link>; start/page.tsx:14-16 permanentRedirect("/help")
  - _Verified:_ VERIFIED. app/page.tsx:263 <Link href="/start">New to this? Start here →</Link>. app/start/page.tsx:14-15 export default StartRedirect() { permanentRedirect("/help"); } with header documenting the 2026-06-17 /start→/help merge. One-char href fix removes a redirect hop on a conversion-sensitive link.

- **Honorary tweet templates auto-tag the real person's @handle — the highest implied-endorsement surface** `CITY SITE — lib/share.ts tweetTribute + /tribute /channel` · effort S · ip/likeness
  - _Problem:_ A brand-authored, pre-filled post tags the honoree's live @handle, which notifies the real person and surfaces project content in their mentions — the act most readable as the project associating itself with that person, even with the inline '(homage — not affiliated)' qualifier.
  - _Upgrade:_ Keep the inline '(homage — not affiliated)' (present and good) and ensure it can't be truncated out on any client. Consider whether the default template should @-tag at all vs naming the person without the mention (still searchable, far lower notification/endorsement footprint). Counsel to confirm the homage-with-tag posture under England & Wales (Terms section 12).
  - _Evidence:_ share.ts:223 pre-fills 'Citizen #NNNN is named in tribute to @{handle} (homage — not affiliated).' The HonoraryDisclaimer chip renders on the workspace (AgentWorkspace.tsx:911-915) and the persona refuses impersonation (persona-honorary.test.ts:12-33), so the residual risk is the outbound tagged tweet, not the agent.
  - _Verified:_ VERIFIED: tweetTribute share.ts:223 tags @{cleanHandle} with the qualifier; AgentWorkspace.tsx:911-915 renders HonoraryDisclaimer; persona-honorary.test.ts:12-33 confirms non-impersonation. Lower impact (a judgment call, disclaimer already present) — set to 2.

- **Naming split: six surfaces use five labels for one redirect page, four promising more than /help delivers** `CITY SITE — onboarding IA / consistency` · effort S · consistency
  - _Problem:_ The same destination (/start → /help) wears five labels: "Start Here", "2-minute guide", "see how awakening works", "New to NFTs? Start here", "Help". Four set an expectation (start/guide/how-awakening-works/getting-one) that /help — wallet-connection + routines + lingo + FAQ — does not fulfill.
  - _Upgrade:_ Pick one canonical onboarding label + destination. Either retire /start and update the six call-sites to point at the right /help anchor with accurate labels, or build the real own/start primer (finding #2) and make /start that page. Kill the label/destination mismatch.
  - _Evidence:_ Footer.tsx:51, app/page.tsx:263, app/canon/page.tsx:251, components/VaultClient.tsx:605, components/CitizenAgentDashboard.tsx:283+289, components/DemoChat.tsx:455-456, app/help/page.tsx:61
  - _Verified:_ VERIFIED: grep of /start links confirms all six call-sites and their distinct labels — page.tsx:263 "New to this? Start here", canon:251 "START HERE", VaultClient:605 "Start Here", CitizenAgentDashboard:289 "NEW TO NFTS? START HERE" (+:283 "the 2-minute guide walks you through getting one"), DemoChat:456 "see how awakening works", help:61 "2-minute guide"; Footer:51 labels /help "Help". One page, five names, four unfulfilled. Accurate. Partial overlap with #1/#2/#9 — this is the consolidated IA framing.

- **Crypt results stub promises future ownership/value ("Crypt Digital Trading Card ownership ... arrive when the live vault opens")** `CRYPT TCG — match results screen` · effort S · copy-safety
  - _Problem:_ Copy tells a player their device-local cards will become real owned property later — a forward-looking promise of asset ownership tied to an unshipped feature.
  - _Upgrade:_ State only what's true today (free closed alpha, device-local progress); drop "ownership" and "season truth" until the vault ships.
  - _Evidence:_ MatchResultsPage.tsx:189-192 "Ledger gains stay on device. Crypt Digital Trading Card ownership and season truth arrive when the live vault opens."
  - _Verified:_ VERIFIED. MatchResultsPage.tsx:189-192 renders exactly "Ledger gains stay on device. Crypt Digital Trading Card ownership and season truth arrive when the live vault opens." — a roadmap-as-promise of future ownership. Real, low-impact copy-safety lean.

- **PWA manifests lock orientation to portrait — Crypt match board and Mars are landscape-friendly** `City + Crypt (installed PWA orientation)` · effort S · pwa
  - _Problem:_ Both manifests set orientation:portrait, so once installed the standalone window stays portrait even when the user rotates for the Crypt arena or the Mars 3D map — surfaces that explicitly have landscape/wide layouts. The installed app feels more constrained than the browser tab it replaced.
  - _Upgrade:_ Relax to orientation:any (or natural) in both manifests so installed users can rotate into landscape for the game surfaces; portrait still serves the marketing/feed pages. Single reversible field.
  - _Evidence:_ City app/manifest.ts:18 orientation:'portrait'; Crypt manifest.webmanifest:8 orientation:'portrait'. Crypt match has explicit landscape handling (live-crypt-match.css:121 min-width:769px and min-height:840px, :1602 max-width:768px) and Mars is a landscape 3D game.
  - _Verified:_ CONFIRMED: app/manifest.ts:18 and /Users/billy/crypt-game/public/manifest.webmanifest:8 both = 'portrait'. live-crypt-match.css:121 (min-width:769px & min-height:840px) and :1602 (max-width:768px) confirm wide/landscape handling exists; Mars index.html is a full landscape Three.js game. Valid; low-risk single-field change, impact 2.

- **Bottom-nav clearance is pinned to the footer, not the scroll viewport** `City site (mobile, <=720px)` · effort S · layout
  - _Problem:_ The fixed bottom-nav (position:fixed; bottom:0; z-index:90; ~60px+safe-area) is cleared only by padding on .site-footer. main#main has no bottom padding, so any route whose last interactive element isn't directly above the global footer — or that renders its own bounded scroll region / sticky in-page CTA — risks its final ~60px under the tab bar. It works today only because the footer is global; it's fragile.
  - _Upgrade:_ Move the clearance to the scroll viewport: add `@media (max-width:720px){ main#main { padding-bottom: calc(60px + env(safe-area-inset-bottom)) } }` (or body), and drop the footer-only override. Makes occlusion impossible regardless of the last element.
  - _Evidence:_ BottomNav.tsx:107-115 position:fixed/bottom:0/z-index:90 with safe-area padding. Only clearance is globals.css:8719 .site-footer padding-bottom calc(... + 60px + env(safe-area-inset-bottom)). layout.tsx:138 <main id="main"> has no bottom padding.
  - _Verified:_ CONFIRMED: BottomNav.tsx:107-115 is fixed/bottom:0/z-index:90 with safe-area padding; the ONLY clearance is globals.css:8719 on .site-footer; app/layout.tsx:138 <main id="main"> carries no bottom padding and no other bottom-nav clearance rule exists. Architecturally fragile as described, though no specific broken route was demonstrated — impact 2.

- **Touch targets below the 44px minimum (workspace send button 38px; Crypt action buttons 40px)** `City workspace + Crypt match (mobile)` · effort S · touch-target
  - _Problem:_ The owned-agent SEND button — the action a paying holder repeats most — is 38x38px, below the 44px the rest of the city enforces. Crypt in-match action buttons are 40px. These are the highest-frequency taps in each product. NOTE: the finding's Mars sub-claim is weaker — Mars .bbtn is already min-height:46px (:168); only #scanBtn's padding-derived height is borderline.
  - _Upgrade:_ Raise .send to 44x44px in AgentWorkspace.module.css; bump .live-btn / .crypt-mode-toggle__btn min-height to 44px in the Crypt mobile layer. Matches the city's existing documented standard at near-zero layout cost.
  - _Evidence:_ AgentWorkspace.module.css:426-427 .send width/height 38px (no media override to 44). crypt live-crypt-match-mobile.css:95 .live-btn min-height 40px and :101 .crypt-mode-toggle__btn min-height 40px. City standard: globals.css:3035 .nav-link/.btn min-height 44px, :3607 'WCAG/Apple HIG min 44x44px'.
  - _Verified:_ CONFIRMED: AgentWorkspace.module.css:426-427 .send is 38x38 with no 44px media override. live-crypt-match-mobile.css:95 .live-btn and :101 .crypt-mode-toggle__btn are min-height:40px. City globals.css:3035 & :3607 establish the 44px standard. Mars .bbtn is already 46px (:168) so the Mars portion is overstated — narrowed title to City+Crypt; impact 2.

- **Combat is opaque on entry: no foe-power vs squad-strength read before committing the 25⬡ stake** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort S · UX/clarity
  - _Problem:_ Players can't gauge if a fight is winnable relative to their own strength before paying the stake and being locked into the tether-bound arena. A loss costs the stake, hardens the foe, and imposes a 10-min lock — so an unreadable difficulty makes early bounces feel arbitrary in a sink-only economy.
  - _Upgrade:_ Before the stake debits, show a matchup read: your effective squad power vs foe band plus a plain verdict (FAVORABLE/EVEN/OUTMATCHED). Numbers exist (foe pw, level()). Per-foe HP bars in-fight (boss already has one at 5781-5782) for non-boss foes.
  - _Evidence:_ startRTCombat debits BATTLE_STAKE=25 (5364, 5739-5740) then drops into the arena. Foe HP = max(16, round(pw)) (5751), boss max(220, hp*4) (5756). rtHud shows only a foe count + integrity bar (5775-5783). Player dmg scales with level() (5817) but is never surfaced. NOTE: the dossier DOES show THREAT pips (5275) and the RED DUST mission card already shows numeric 'ENEMY POWER' (4868) — so enemy power is partly surfaced; what's missing is a comparison to the player's own squad strength and a plain FAVORABLE/EVEN/OUTMATCHED verdict.
  - _Verified:_ VERIFIED but impact lowered 3→2: enemy power IS already shown for the RED DUST mission (4868 'ENEMY POWER 78-102') and dossier shows THREAT pips (5275); genuine gap is only the self-vs-foe verdict, a narrower fix than stated.

- **Combat fully blacks out the HUD, hiding the HEX balance and the reward the fight is for** `MARS COMMAND (/Users/billy/freelon/mars-command/index.html)` · effort S · UX/clarity
  - _Problem:_ Clearing the HUD for immersion also removes the HEX balance and the reward the player is risking the 25⬡ stake to win. Combined with the missing win-odds read, the player fights blind to both stakes and payoff, weakening reward anticipation.
  - _Upgrade:_ Add a minimal context line in rtHud showing pending reward + stake (e.g. 'PURGE ▸ +⬡ N · STAKE 25'). Reward already computed in resolveBattle (5685-5700) — surface it at fight start.
  - _Evidence:_ body.fighting CSS (158) sets display:none!important on crewsBtn, scanBtn, returnBtn, mapBtn, techBtn, recordsBtn, buildMenu, missions, dailyPanel, stats, brand, nextChip. Only #rtHud remains (616-622): title, foe count, boss/integrity bars, hint, withdraw — no HEX balance, no reward read. Reward IS computed in resolveBattle (5685-5700).
  - _Verified:_ VERIFIED: body.fighting (158) hides exactly the listed elements incl. #stats; rtHud (616-622) has no reward/HEX line; reward computed at 5685-5700. Lowest-impact of the set — kept at impact 2.

- **Mars Command has no safe-area handling — bottom-anchored utility bar sits under the iPhone home indicator** `Mars Command (mobile, source + deployed copy)` · effort M · safe-area
  - _Problem:_ Mars has zero env(safe-area-inset) handling and no viewport-fit=cover. On notched iPhones, bottom-0 fixed controls overlap the home indicator. NOTE: the finding's claimed victims (SCAN, ownCta) are INACCURATE for phones — the <=560px block already lifts #scanBtn/#crewsBtn to bottom:calc(38vh+60px) and #returnBtn/#ownCta to 38vh+104px. The elements actually at the bottom edge on phones are the secondary utility bar (#soundBtn/#exportBtn/#importBtn/#resetBtn, bottom:0, height:44px); #techBtn/#recordsBtn are display:none below 900px. So the real issue is the utility row under the gesture bar, not the primary play/conversion CTAs.
  - _Upgrade:_ Add viewport-fit=cover to the Mars viewport meta and env(safe-area-inset-bottom) to the bottom-0 utility bar (#soundBtn/#exportBtn/#importBtn/#resetBtn) in the <=560px block. Re-copy to public/mars/index.html per the deploy-sync ritual.
  - _Evidence:_ mars-command/index.html grep for safe-area-inset = 0 matches; viewport meta (:5) has maximum-scale=1 but no viewport-fit=cover. Phone block (:426-436) repositions scan/crews/return/ownCta off the bottom edge and pins sound/export/import/reset to bottom:0 height:44px with no safe-area pad.
  - _Verified:_ PARTIALLY CONFIRMED, finding misdescribes the affected controls. grep safe-area-inset=0 and no viewport-fit=cover (index.html:5) are real. But index.html:430-431 lifts #scanBtn/#crewsBtn to bottom:calc(38vh+60px) and #returnBtn/#ownCta to 38vh+104px on <=560px — so the primary CTA is NOT under the bar; #techBtn/#recordsBtn are display:none below 900px (:125). Real victim = the bottom:0 utility bar at :432. Kept with corrected scope; impact lowered 3->2 since secondary controls, not the revenue CTA, are affected.

### Impact 1★

- **Crypt theme-color mismatch between HTML meta and manifest causes a status-bar/splash color seam** `Crypt TCG (PWA chrome)` · effort S · pwa
  - _Problem:_ Three different near-blacks for one shell: HTML meta theme-color #0B0B0D, manifest theme_color #0a0808, manifest background_color #050404. The browser tab paints one value, the installed app another, the splash a third — a subtle seam that reads as 'website' rather than 'app'. The city uses one value (#0b0a09) for all three.
  - _Upgrade:_ Pick one warm-black token and use it for the HTML meta theme-color, manifest theme_color, and (optionally) background_color so chrome is seamless across browser and installed states.
  - _Evidence:_ crypt index.html:6 meta theme-color #0B0B0D; manifest.webmanifest:10 theme_color #0a0808, :9 background_color #050404. City app/manifest.ts:19-20 background_color and theme_color both #0b0a09.
  - _Verified:_ CONFIRMED: /Users/billy/crypt-game/index.html:6 meta=#0B0B0D, manifest.webmanifest:10 theme_color=#0a0808, :9 background_color=#050404 — three distinct values. City app/manifest.ts:19-20 uses #0b0a09 for both. Real but cosmetic, impact 1.

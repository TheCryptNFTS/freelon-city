# 100 Improvements — grounded backlog + implementation loop

Assembled 2026-06-27 by a 5-agent research swarm (backlog-harvest, bug-hunt,
security-redteam, perf/a11y/SEO/quality, conversion/UX). Every item is grounded in
a real bug, an established standard (WCAG 2.1 AA, Core Web Vitals, OWASP, Nielsen),
or a prior audit doc — no speculative feature sprawl (per the project's own
"distribution-not-sprawl" rule). `[x]` = shipped, `[ ]` = open, `[FLAG]` = needs
Billy/counsel sign-off before implementing (legal or economy-policy).

Web reuse rule: permissively-licensed (MIT/Apache-2.0/CC0/public-domain) code/
assets only, with attribution — never copyrighted material.

---

## BATCH 1 — crash bugs + revenue instrumentation (highest value, safe) — SHIPPED
- [x] 1. HexNetWorth crashes on API error/429 — guard `r.ok` + shape before `.civs.length`. components/HexNetWorth.tsx:22-52. (real bug; reachable via 30/min rate limit)
- [x] 2. HexEarningsLog crashes on API error/429 — guard `r.ok` + numeric balance/array events. components/HexEarningsLog.tsx:89-155. (real bug)
- [x] 3. `/undervalued` redirect → dead `#snipes` anchor — repoint to `/dashboard#heat`. next.config.ts:90. (dead anchor verified)
- [x] 4. activation_paid never fires on the LIVE awaken path — fire in WorkspaceUnlock claim() success. components/WorkspaceUnlock.tsx:112. (revenue event is dark)
- [x] 5. unlock_blocked reasons not fired live — fire at setErr branches (quote_error/pay_rejected/no_wallet). WorkspaceUnlock.tsx:94,113,129.
- [x] 6. awaken_quote_shown unmeasured — fire when quote resolves + pay panel renders. WorkspaceUnlock.tsx:88.
- [x] 7. wallet_connected misses cookie-rehydrated holders — fire `wallet_present {source:rehydrate}`. WalletConnect.tsx:166.
- [x] 8. awaken_no_wallet_browser unmeasured — fire on noWallet branch. WorkspaceUnlock.tsx:70.
- [x] 9. buy_intent_return unmeasured — fire when readBuyIntent() non-null on later load. IdentityGreeting.tsx:37.

## BATCH 2 — security hardening (additive, OWASP) — SHIPPED
- [x] 10. Rate-limit unthrottled wallet GETs (net-worth/tokens/portfolio/featured/balance) — burns RPC/OpenSea quota. OWASP API4. SEVERITY High.
- [x] 11. Rate-limit sister-collection agent GET. app/api/agents/[slug]/[id]/route.ts:50. OWASP API4.
- [x] 12. Rate-limit admin/credit before auth check. app/api/admin/credit/route.ts:36. OWASP A07.
- [x] 13. mission reward bypasses farmable cap — add `{farmable:true}`. app/api/mission/claim/route.ts:140. (matches BLUEPRINT:56 invariant)
- [x] 14. isSameOrigin fail-closed when Origin AND Referer both absent — new isSameOriginStrict applied to 3 proven-wallet HEX-spend POSTs (tx/boost, tithe, city/boost). lib/x-session.ts. (defense-in-depth; scoped to browser-only value-moving routes)

## BATCH 3 — accessibility (WCAG 2.1 AA) — SHIPPED
- [x] 15. AgentWorkspace `<img onClick>` lightbox triggers → `<button>` (keyboard). SC 2.1.1/4.1.2. AgentWorkspace.tsx:1034,1222.
- [x] 16. Lightbox focus trap + focus restore. SC 2.4.3. AgentWorkspace.tsx:1382.
- [x] 17. Visible focusable close button on lightbox. SC 2.1.1. AgentWorkspace.tsx:1385.
- [x] 18. Meaningful images with empty alt — transmission preview given real alt. civ face left as-is (already correctly decorative: wrapped in aria-hidden span, civ name in adjacent text). SC 1.1.1. TransmissionSubmit.tsx:210.
- [x] 19. Add app/global-error.tsx branded fallback (self-contained html/body, inlined brand styles). (Next.js convention; layout-level errors)
- [x] 20. Touch targets — workspace SEND 38→44px. AgentWorkspace.module.css:426. (Crypt buttons live in the SEPARATE crypt-game repo, not this codebase — out of scope for this pass.)
- [x] 21. Bottom-nav clearance on scroll viewport — added html scroll-padding-bottom (≤720px) so anchor jumps clear the fixed nav; footer padding kept for the resting case. app/globals.css.

## BATCH 4 — performance (Core Web Vitals) — SHIPPED
- [x] 22. logo.png 296KB served at 36px → re-encoded IN PLACE (sharp, 256-colour palette, 296→65KB). Kept .png (next/image Header + OG-universe Satori render + manifest all reference /logo.png; Satori needs PNG). Header.tsx:21.
- [x] 23. og/art PNGs downscaled+recompressed IN PLACE (sharp; PIECES 1024²→480², hero 760²→720²; ~7.1MB→1.04MB total, −85%). Kept .png NOT WebP — these feed @vercel/og Satori where WebP support is unreliable; .webp companions already serve the web UI. terminal-bg-{1,2,3}.png are ORPHANED (0 code refs) → defer deletion to Batch 7, not convert. app/api/og/universe/route.tsx.
- [x] 24. dns-prefetch blob.vercel-storage + seadn.io + ipfs/dweb fallbacks (preconnect reserved for pinata; blob subdomain is per-store/dynamic so dns-prefetch only). app/layout.tsx:109.
- [x] 25. Already satisfied — TransmissionLoop has a poster (the still it was generated from) AND preload="metadata" (NOT "auto"); it's an autoplay-on-scroll loop so browsers only fetch full bytes once in-viewport. preload="none" is a no-op with autoPlay. TransmissionLoop.tsx:23.
- [x] 26. Code-split HexMatch tutorial island via next/dynamic (ssr:false, client component). HexMatch.tsx.
- [x] 27. Defer below-fold TransformsWall on homepage via next/dynamic (server component, ssr stays on). app/page.tsx.

## BATCH 5 — SEO / metadata — SHIPPED
- [x] 28. Site-wide self-referencing canonical via `alternates:{canonical:"./"}` in root layout (relative "./" resolves per-route to each page's own path; collapses vanity rewrites onto their real URL; per-page metadata overrides). app/layout.tsx.
- [x] 29. Sitemap: added VERIFIED indexable routes /demo,/proof,/report,/live,/carrier-of-the-week,/mars + all /collections/[slug] (COLLECTION_SLUGS). EXCLUDED on verification: /remember,/start,/archive (now redirects), /world/city (noindex). app/sitemap.ts.
- [x] 30. Per-page JSON-LD on citizens/[id]: CreativeWork (name/image/isPartOf collection) + BreadcrumbList (Home›Citizens›#NNNN). app/citizens/[id]/page.tsx.
- [x] 31. Static-game index policy: /mars (polished, full meta) → +canonical link + added to sitemap; /world/city ("Slice 1" prototype) → meta robots noindex,nofollow. public/mars/index.html, public/world/city/index.html.

## BATCH 6 — UX clarity & conversion polish (Nielsen) — SHIPPED
- [x] 32. Already satisfied — awaken copy leads with abilities ("switches on every premium ability — strategy, research, red-team, dossier & branded image generation"), NOT "it remembers you". ("forever" durability claim left untouched — FLAGGED L2.) WorkspaceUnlock.tsx:172.
- [x] 33. my-citizens empty state: added "just bought? ownership takes a few min" line + "I JUST BOUGHT ONE — RE-CHECK" button (re-runs portfolio load via extracted loadPortfolio) so a returning buyer isn't dead-ended into buying again. MyCitizens.tsx, globals.css.
- [x] 34. Demo wall OWN CTA promoted from a dim underline (equal to share/proof) to a distinct gold-outline secondary; email ClaimForm stays the single primary. DemoChat.tsx.
- [x] 35. Demo memory panel: the "demo forgets / owned keeps" contrast now persists while the panel is POPULATED (it previously only showed in the empty state — gone exactly when loss-aversion bites). DemoChat.tsx.
- [x] 36. Trust line at the non-refundable pay checkbox: "Official awakening wallet — verify it on Etherscan ↗" linking etherscan.io/address/{toWallet}. WorkspaceUnlock.tsx.
- [x] 37. Already satisfied — demo share routes to personalized /share/quote (unfurls citizen's own words), not generic universe OG (done earlier as audit #115). lib/share.ts:540.
- [x] 38. Proactive mobile in-app-browser hint on /sync connect — shown when mobile + no injected wallet, before the user taps and bounces. app/sync/SyncWalletAction.tsx.
- [x] 39. ClaimForm done-state echoes the submitted email + "Not right? Fix it" reset, to catch typo'd addresses at capture instead of silently losing the lead. ClaimForm.tsx.

## BATCH 7 — dead code & cleanup — SHIPPED (44 deferred, see note)
- [x] 40. NOT dead — CityFeedTicker IS rendered on /dashboard (dashboard/page.tsx:64); the layout comment only records its removal from SITE-WIDE mounting. Kept. (Verify-first caught a false "never rendered" premise.) Instead cleaned the REAL orphans: deleted public/generated/terminal-bg-{1,2,3}.png (~5MB, 0 code refs — deferred from #23).
- [x] 41. Deleted redundant /api/cron/carrier-of-week route — resolveCarrierOfWeek() already runs every 15min piggybacked on the sweep-bounty cron (deliberate Hobby cron-slot constraint; see sweep-bounty/route.ts:310), and the route was never in vercel.json. Work is covered; route was dead.
- [x] 42. Spotlight/EasterEggCode/Ghost404 moved into a GlobalListeners client wrapper that dynamic-imports them with ssr:false — pulls their JS off the SSR + initial hydration path on all ~54 routes (all three render null at rest, so zero visual change). components/GlobalListeners.tsx, app/layout.tsx.
- [x] 43. Already fixed — boost notify eventKey is `transmission-boost:${id}:${addr}` (stable per id+booster), not Date.now(). Doc audit was stale. boost/route.ts:124.
- [ ] 44. DEFERRED (not shipped). Shared `<CitizenImage>` over next/image for the 4040-grid is a real WebP win BUT carries unverified production risk: no citizen IPFS thumb currently routes through Vercel's image optimizer anywhere, so migrating the highest-visibility grids would be the first at-scale on-demand optimization of slow pinata-gateway images (optimizer-timeout → broken thumbs + image-optimization quota exposure) plus layout-regression risk across 3 differently-styled grids. Needs browser QA + quota monitoring before shipping — flagged for Billy, not auto-implemented blind.

## BATCH 8 — deeper code-quality (verify-first)
- [ ] 45. Wallet page can exceed Vercel 10s — add wall-clock budget + AbortController to fetchLongestHeld. wallet/[address]/page.tsx:98.
- [ ] 46. Audit over-applied "use client" (125/258) — demote static islands to server components.
- [ ] 47. Segment error boundaries around heavy islands (GamePreview, CitizenAgentDashboard). 
- [ ] 48. Resolve TODO(M2) markers. lib/match-store.ts:138, lib/crypt-demo-decks.ts:19.
- [ ] 49. ts-prune/knip pass for dead exports in 166-file lib/.
- [ ] 50. Trim globals.css (8,842 lines) decoration tax → component modules.
- [ ] 51. /unlock/success page showing ETH→HEX math (also serves pricing-clarity). 
- [ ] 52. Surface deploy-video run-cost ("Video = 8 runs") at point of use. AgentWorkspace.

---

## FLAGGED — needs Billy / counsel sign-off (NOT auto-implemented)
- [FLAG] L1. Terms: "Awakening (paid activation)" section — final/non-refundable/AS-IS/not-a-security. terms/page.tsx. (lawyer review)
- [FLAG] L2. Resolve "forever" durability claim vs Terms §4 removable-benefits. WorkspaceUnlock.tsx:150,164.
- [FLAG] L3. Terms UGC license + non-copyright takedown clause. terms + dmca.
- [FLAG] L4. Privacy: disclose inbound-email PII channel. privacy/page.tsx.
- [FLAG] L5. Privacy-consent link at email capture. ClaimForm.tsx.
- [FLAG] L6. Guard-the-Pot prompt hardening before GUARD_POT_LIVE flips. play/guard/attempt.
- [FLAG] E1. Wallet-proof nonce/expiry (replay hardening) — touches auth. wallet-proof.ts.
- [FLAG] E2. Per-wallet daily HEX hard cap circuit breaker. economy-constants + wallet-hex-store.
- [FLAG] E3. X-gate snipe + sale-share faucets (sybil) — policy: blocks non-X holders.
- [FLAG] E4. Carrier STARTING 50⬡ grant folding into spendable wallet HEX. carrier.ts:53.
- [FLAG] E5. Sweeps + streak bonus count against farmable ceiling. wallet-hex-store, sweep-inline.ts:142.
- [FLAG] S1. Delete v1 legacy API surface (confirm no external consumer). app/api/v1/*.
- [FLAG] S2. Collapse passport/my-citizens into one /profile. (structural, L effort)

## ALREADY-CLEAN (verified by swarm — do not re-file)
Internal links resolve; civ banners present; fetched API endpoints all have handlers;
localStorage JSON.parse all try/catch'd; money path (spender-from-session, locks,
idempotency, SIWE nonce, prompt-injection guards, SSRF allowlist) thoroughly hardened;
net-worth valuation leak already removed; fonts self-hosted with swap; robots/sitemap/
manifest present; skip-link present; no prod console.log.

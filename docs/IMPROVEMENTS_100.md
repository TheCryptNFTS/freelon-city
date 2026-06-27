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

## BATCH 2 — security hardening (additive, OWASP)
- [ ] 10. Rate-limit unthrottled wallet GETs (net-worth/tokens/portfolio/featured/balance) — burns RPC/OpenSea quota. OWASP API4. SEVERITY High.
- [ ] 11. Rate-limit sister-collection agent GET. app/api/agents/[slug]/[id]/route.ts:50. OWASP API4.
- [ ] 12. Rate-limit admin/credit before auth check. app/api/admin/credit/route.ts:36. OWASP A07.
- [ ] 13. mission reward bypasses farmable cap — add `{farmable:true}`. app/api/mission/claim/route.ts:140. (matches BLUEPRINT:56 invariant)
- [ ] 14. isSameOrigin fail-closed when Origin AND Referer both absent (value-moving POSTs only). lib/x-session.ts:182. (defense-in-depth; scope carefully)

## BATCH 3 — accessibility (WCAG 2.1 AA)
- [ ] 15. AgentWorkspace `<img onClick>` lightbox triggers → `<button>` (keyboard). SC 2.1.1/4.1.2. AgentWorkspace.tsx:1034,1222.
- [ ] 16. Lightbox focus trap + focus restore. SC 2.4.3. AgentWorkspace.tsx:1382.
- [ ] 17. Visible focusable close button on lightbox. SC 2.1.1. AgentWorkspace.tsx:1385.
- [ ] 18. Meaningful images with empty alt — civ face, transmission artwork. SC 1.1.1. civilizations/page.tsx:105, TransmissionSubmit.tsx:210.
- [ ] 19. Add app/global-error.tsx branded fallback. (Next.js convention; layout-level errors)
- [ ] 20. Touch targets <44px — workspace SEND 38px, Crypt buttons 40px → 44. AgentWorkspace.module.css:426; live-crypt-match-mobile.css:95,101.
- [ ] 21. Bottom-nav clearance on scroll viewport not footer. app/layout.tsx:138 main padding-bottom.

## BATCH 4 — performance (Core Web Vitals)
- [ ] 22. logo.png 296KB served at 36px → re-encode small WebP. Header.tsx:21.
- [ ] 23. terminal-bg-{1,2,3}.png (~1.7MB ea) + og/art PNGs → WebP. public/generated, public/og/art.
- [ ] 24. preconnect/dns-prefetch blob.vercel-storage + ipfs/dweb fallbacks. app/layout.tsx:103.
- [ ] 25. transmission-still MP4s preload="none" + poster. public/transmission-stills.
- [ ] 26. Code-split heavy play islands (HexMatch tutorial/share sheets). next/dynamic. HexMatch.tsx:23.
- [ ] 27. Defer below-fold TransformsWall on homepage. next/dynamic. app/page.tsx:7.

## BATCH 5 — SEO / metadata
- [ ] 28. Add `alternates:{canonical}` site-wide (0 today; vanity rewrites dup content).
- [ ] 29. Sitemap omits indexable routes (/remember,/proof,/demo,/collections/[slug],...). app/sitemap.ts:18.
- [ ] 30. Per-page JSON-LD (CreativeWork on citizens/[id], BreadcrumbList). app/layout.tsx:105.
- [ ] 31. Index policy for static games (/mars,/world/city): sitemap+title or noindex.

## BATCH 6 — UX clarity & conversion polish (Nielsen)
- [ ] 32. Awaken copy leads with abilities, not "it remembers you" — reorder. WorkspaceUnlock.tsx:149.
- [ ] 33. my-citizens empty state has no "just bought, awaiting index" path → dead-ends a returning buyer. MyCitizens.tsx:127.
- [ ] 34. Demo exhaustion-wall OWN CTA is dim equal-weight link → make primary. DemoChat.tsx:476.
- [ ] 35. Demo memory panel buries the "forgets when you leave" contrast → lead with it. DemoChat.tsx:173.
- [ ] 36. Trust line at the non-refundable pay checkbox ("official wallet · verifiable on Etherscan"). WorkspaceUnlock.tsx:169.
- [ ] 37. Demo share routes to generic universe OG, not the personalized /share/remember card. DemoChat.tsx:459.
- [ ] 38. Mobile in-app-browser hint at /sync connect action. app/sync/page.tsx:66.
- [ ] 39. Reservation confirmation / address echo to catch typo'd emails. ClaimForm.tsx.

## BATCH 7 — dead code & cleanup
- [ ] 40. Delete orphaned CityFeedTicker (never rendered). components/CityFeedTicker.tsx.
- [ ] 41. carrier-of-week cron: wire into vercel.json or delete. app/api/cron/carrier-of-week.
- [ ] 42. Lazy-mount global listeners (EasterEggCode/Ghost404/Spotlight) per-page not all 54 routes.
- [ ] 43. transmission-boost notify dedupe uses Date.now() eventKey → stable per-(id,booster). boost/route.ts:121.
- [ ] 44. Shared `<CitizenImage>` wrapper over next/image; migrate citizen-grid `<img>` (removes ~62 lint disables, WebP for 4040 thumbs). citizens/page.tsx:164, CitizensBrowser.tsx:256, CollectionBrowser.tsx:189.

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

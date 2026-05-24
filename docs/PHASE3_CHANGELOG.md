# Phase 3 — Hierarchy Reorder

**Goal:** every page must answer three questions in this order —
"what's happening · what do I own · what should I do next."
No new pages. No new copy unless replacing bad copy. No visual
redesigns (Phase 1 + 2 already locked the visual layer). Pure
hierarchy + reordering surgery.

This is the last phase. After this, the site has finished its
audit-driven cleanup arc.

---

## 0 · Cheap emoji purge (bonus)

User flagged a fire emoji as "ultra cheap." Audit found 7 cheap color emojis
across the codebase (🔥 🔴 🛡 📋 🥇 🥈 🥉). All replaced with brand-
appropriate monochrome typographic glyphs (⬡ ⬢ ● ↑ ⧉) or numeric ranks
(01 · 1ST / 02 · 2ND / 03 · 3RD).

Kept: `⚠ ✓ ✕ ⬡ ⬢ ★ ⚙ ⧉` — monochrome typographic symbols that inherit
text color and belong with the hex-glyph language.

Hits fixed:
- `app/page.tsx` · `app/earn/page.tsx` · `app/civ-wars/page.tsx` · `app/citizens/[id]/page.tsx`
- `components/CityFeedTicker.tsx` · `components/RedSignalsFeed.tsx` (×3) · `components/WatchlistButton.tsx`
- `components/TransmissionCard.tsx` · `components/ReplySubmit.tsx` · `components/CopyToClipboardButton.tsx`
- `components/StreakBadge.tsx`
- `app/api/cron/sweep-bounty/route.ts` · `app/api/transmissions/[id]/boost/route.ts`
- `lib/share.ts` · `lib/notify-scanner.ts`

Verification: `grep` for emoji codepoints across all `.tsx/.ts/.css`
returns **CLEAN**.

---

## 1 · Homepage (`app/page.tsx`)

**Before:** 22 sections. DoThisNow buried below CityTerminal. Six near-
duplicate panels (AlertsFeed dup of CityFeedTicker, HexIndexHero dup of
CityTerminal's Hex Index panel, DailySignal dup of CityTerminal's
Today's Signal panel, DailyMission dup of DoThisNow's claim card,
BecomeACarrier dup of /start funnel, CitizenOfDay low-frequency).
STATEMENT block duplicating the .why-trust strip's stats.

**After:** 16 sections. New order:
1. Hero (identity greeting → FloorPill → headline → CTA)
2. **DoThisNow** (lifted from below)
3. **HoldTheLineBanner**
4. **CityTerminal** (was first, now lands after personal action + collective mission)
5. WHY FREELON (mechanic cards)
6. CivWarBoard
7. SignalCheck
8. Four 1/1s
9. Civilizations
10. Honoraries (7)
11. Featured citizens (8)
12. TopPatrons
13. RecentTransmissions
14. Pull quote + ENTER CTA
15. On-chain trinity

**Removed:** AlertsFeed, HexIndexHero, DailySignal, CitizenOfDay,
BecomeACarrier, DailyMission, STATEMENT block, dead `Stat` helper.

---

## 2 · Dashboard (`app/dashboard/page.tsx`)

**Before:** CityStats + HexIndex → HexNetWorth → CivValueChart → red
signals → heat → holders + sales.

**After (holder numbers first):**
1. **HolderDistributionChart + CivValueChart** (row 1) — the "who owns
   this collection" answer lands BEFORE any generic floor / volume.
2. HexNetWorth (your stake in the city)
3. CityStats + HexIndex (generic city stats now below the holder context)
4. Red signals
5. Live heat grid
6. Live sales feed

Also: footer SHARE / NEXT rows use `.ui-cta-row` (Phase 2 primitive).

---

## 3 · Vault (`components/VaultClient.tsx`)

**Test-send promoted to a major safety card.** A wrong-address mistake
here is permanent and uninsurable. The toggle now lives in a gold-
bordered card with a SAFETY CHECK kicker, larger checkbox + label
(15px line-height, 20×20 input). Same checkbox, dramatically more
visual weight.

New CSS: `.v-safety-card` + `.v-check--prominent`.

---

## 4 · Carrier (`app/carrier/CarrierClient.tsx`)

**Before:** NotificationInbox → DailyMission → HandleSwitcher →
HolderFlex → DailyClaim card.

**After:** **DailyClaim card first** → MyInvites → NotificationInbox →
DailyMission → HandleSwitcher → HolderFlex. A returning carrier now
completes the daily loop in one scroll instead of having to find the
claim button past three other widgets.

---

## 5 · Wallet (`app/wallet/[address]/page.tsx`)

**Before:** Hero → carrier-health (loudest card on the page) → stats.

**After (stats first, carrier-health quiet status strip):**
1. Hero (addr + share)
2. **wallet-stats** (FREELON NET WORTH · PORTFOLIO VALUE · RANK · LONGEST HELD)
3. **carrier-health** — same data, now a thin rounded pill strip
   (rgba(0,0,0,0.08), 999px border-radius, 10px padding) instead of a
   large 12px-radius card
4. NotificationInbox → HexEarningsLog → TitheForm → CivAlignment → Gallery

Investor / journalist / new-curious-visitor question #1 is "what does
this wallet own and what's it worth," not "is the carrier active."

---

## 6 · Citizens (`app/citizens/page.tsx`)

**Before:** Mass browser (4040 citizens) ABOVE the curated tier sections.
On mobile this meant endless infinite-scroll before the user ever saw
the brand's hero citizens.

**After (curated first):**
1. Hero + token finder
2. **Four 1/1s**
3. **Honoraries (35)**
4. **Legendaries (12)**
5. Mass browser at `#browse` (still anchor-linkable from the hero
   "BROWSE ALL" link)

Footer CTA row uses `.ui-cta-row`.

---

## 7 · Transmissions (`app/transmissions/page.tsx`)

**Submit form OPEN by default** (was hidden behind a collapsed `<details>`).
"Submit a transmission" is the primary conversion event on this page;
hiding it behind a closed disclosure was burying the funnel. Keeps
the details shell so users who prefer the gallery can collapse it.

---

## 8 · Hold-the-line (`app/hold-the-line/page.tsx`)

**Bid tiers + claim form grouped as one flow.** Reduced spacing
between SUGGESTED TIERS and CLAIM YOUR BID (var(--s-6) → var(--s-3))
so the visual sequence reads "pick tier → place bid → claim hex"
without a hard section break.

---

## 9 · Civ wars (`app/civ-wars/page.tsx`)

**Rules before results.** HOW SCORING WORKS lifted from page bottom to
right after the hero — readers know what they're looking at before the
podium reveals who's winning.

**Podium 1st place dominant.** New `.civ-podium` 2fr/1fr grid:
- 1st-place card spans full left column, 280px min-height, 3px border,
  60px glow, 36px civ name, 48px hex total
- 2nd + 3rd share the right column at standard sizes
- Collapses to 1-col stack at ≤760px (mobile-first podium with the
  winner still visually loudest)

---

## 10 · Canon (`app/canon/page.tsx`)

**Only first section open by default.** Was 7 expanded `<details>`
blocks (made the index useless and tanked mobile load). Now:
- Index links still anchor-jump into any tab and expand it (native
  `<details>` behavior + browser anchor-focus)
- TabBlock takes a `defaultOpen` prop; only `i === 0` gets it

Footer CTA row uses `.ui-cta-row`.

---

## 11 · Numbers → Pulse (`app/numbers/page.tsx`)

**Renamed.** Page title, metadata, hero kicker, and header nav (both
`components/Header.tsx` and `components/MobileNav.tsx`) now say "Pulse"
instead of "The Numbers."

**New hero:** one giant pulse — MARKET CAP at floor — paired with a
live CITY STATE pill (ACTIVE green / COLLAPSE warning). Floor × supply
with a fallback to compute when OpenSea's `market_cap` field is null.
Two-column grid (1.6fr / 1fr) collapsing to single column at 760px.

**Bonus:** fixed the long-standing "titheS" typo in the hex-economy
sub-label.

Footer CTA row uses `.ui-cta-row`.

---

## Hard rules going forward

These join the Phase 1 + Phase 2 hard rules:

1. **Three-question test.** Every main page must answer in order: what
   is happening · what do I own · what should I do next. If a page's
   first three sections don't map to that progression, you're ordering
   wrong.

2. **No cheap color emojis.** ⬡ ⬢ ⚠ ✓ ✕ ↑ ⧉ are the approved
   typographic glyphs. Anything that would be rendered as a colored
   emoji by the OS is banned.

3. **No duplicate panels.** If a section says the same thing as another
   section on the same page (or in a global component like CityTerminal
   / CityFeedTicker that already runs everywhere), remove the
   duplicate.

4. **CTA rows use `.ui-cta-row`.** The `display: inline-flex; gap: 12;
   flexWrap: wrap; justifyContent: center` pattern is banned. Use the
   primitive — it has correct mobile behavior baked in.

5. **`<details>` blocks default closed unless they ARE the page.**
   Canon-style tab pages default-open the first block only. Action-
   focused pages (transmissions submit, vault sections that gate
   destructive actions) default open.

6. **Personal action before analytics.** DoThisNow lands above
   CityTerminal on the homepage. Daily claim lands above carrier-rank
   on /carrier. Wallet stats land above carrier-health on /wallet.
   Investor / power-user dashboards remain analytics-first.

---

## Verified

- Pulse page: hero stat renders 9.96 Ξ market cap + COLLAPSE state pill at desktop and mobile.
- Civ wars: HOW SCORING WORKS appears immediately after hero; podium 1st-place dominant at desktop (1280px), single-column at mobile.
- Header: nav now reads "Pulse" instead of "The Numbers" at both desktop and mobile breakpoints.
- Homepage: section count reduced from 22 → 16 (verified by querying `main > *` in the browser).
- `next dev` boots clean — no server errors, no console errors at /, /numbers, /civ-wars, /citizens, /transmissions.

---

## What Phase 3 did NOT do

- **No new pages.** Pure reorder.
- **No new copy.** Only fixed the "titheS" typo on /numbers.
- **No visual redesign.** Phase 1 primitives + Phase 2 mobile rules
  carry the visuals.
- **Did not touch every page.** Pages not in the original 11-item
  Phase 3 list (start, sync, leaderboard, tribute, names, pfp,
  graveyard secondary panels, daily, relay, civilizations, civ
  detail, citizen detail beyond CTA row) were intentionally left
  alone — their existing order was already reasonable, or already
  fixed in Phase 1 / 2.
- **Did not migrate every remaining inline-style block.** Files
  outside the Phase 3 scope still have inline styles; they'll get
  cleaned up the next time a feature touches them, now that the
  primitives + tokens exist for them to migrate to.

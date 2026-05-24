# Refactor: 3-phase controlled UI cleanup (design system + mobile + hierarchy)

## Summary

A controlled 3-phase refactor that addresses the root cause of the site's visual sprawl: every feature had invented its own mini-design system, with 322 inline `style={{...}}` blocks bypassing the existing token system. Same brand direction (Bloomberg Terminal for a digital civilization), same lore, same features — but a single visual language, real mobile behavior, and a clean information hierarchy on every main page.

No new pages. No new copy (except fixing the "titheS" typo). No visual redesign — just the structural cleanup the audit called for.

## What changed

**Phase 1 — Design System Surgery**
- New tokens in `globals.css`: state colors (`--state-active/surge/warning/...`), tints, panel surfaces, radii, shadows, mono type scale, tracking
- 10 new primitives in `components/ui/`: `Panel`, `Pill`, `StatusDot`, `Kpis`, `ActionCard`, `SectionHeader`, `LiveIndicator`, `ResponsiveGrid`, `MobileStack`, `Banner`
- 8 worst offenders refactored onto primitives. Inline-style block count across those files: **~150 → ~6**. Net LOC: CityTerminal 362→198, FloorPill 100→70, CollapseBanner 48→19, HoldTheLineBanner 66→21.

**Phase 2 — Mobile System (real 375px breakpoint pass)**
- 3 hard rules enforced: no fixed-px grid columns under 540px, no tap target under 44px, no body text under 12px on mobile
- 8 new utility classes (`ui-table-stack`, `ui-cta-row`, `ui-row-stack`, `ui-chip`, `ui-filter-bar`, `ui-auto-fit-cards`, `ui-tap`, global mobile body floor)
- All 9 audit-flagged mobile-broken surfaces fixed: civ-wars standings, hold-the-line counters/tiers/leaderboard, graveyard tables, citizens filter (no more sticky-eats-half-screen), relay cards, transmissions grid, citizen detail CTA row, vault grid, dashboard heat/holders charts
- Bonus: fixed FloorPill wrapping bug found during verification

**Phase 3 — Hierarchy Reorder + Cheap-Emoji Purge**
- Homepage: **22 → 16 sections**. DoThisNow lifted above CityTerminal. Killed 6 duplicate panels (AlertsFeed/HexIndexHero/DailySignal/CitizenOfDay/BecomeACarrier/DailyMission) + dead STATEMENT block
- Dashboard: holder numbers first
- Vault: test-send promoted to gold-bordered SAFETY CHECK card
- Carrier: DailyClaim card now first
- Wallet: stats first, carrier-health demoted to a quiet pill strip
- Citizens: curated 1/1s + Honoraries + Legendaries before mass browser (massive mobile improvement)
- Transmissions: submit form open by default
- Hold-the-line: bid tiers + claim form visually grouped
- Civ wars: rules right after hero, 1st-place podium dominant (2fr/1fr grid, 3px border, 60px glow)
- Canon: only first tab open by default (was all 7)
- **Numbers → Pulse:** renamed everywhere, new hero (MARKET CAP + CITY STATE pill), fixed long-standing "titheS" typo
- Emoji purge: 7 cheap color emojis replaced with brand-appropriate monochrome glyphs or numeric ranks across 14 files. `grep` confirms zero color emojis in `.tsx/.ts/.css`

## Changelogs

Full per-phase changelogs (tokens, primitives, every file touched, going-forward hard rules):
- `docs/PHASE1_CHANGELOG.md`
- `docs/PHASE2_CHANGELOG.md`
- `docs/PHASE3_CHANGELOG.md`

## Build status

`next build` succeeds — all 70+ routes compile clean, no new warnings or errors.

## Test plan

- [ ] Open Vercel preview deployment for this branch
- [ ] Desktop sweep: `/`, `/numbers`, `/civ-wars`, `/citizens`, `/dashboard`, `/wallet/<an-address>`, `/vault`, `/transmissions`, `/hold-the-line`, `/canon`, `/carrier`, `/graveyard`, `/relay`
- [ ] Mobile sweep (375px) of same pages — verify civ-wars standings stack, citizens filter horizontal-scrolls, citizen detail CTA row stacks vertically tap-44, vault checkboxes selectable
- [ ] Confirm header nav reads "Pulse" instead of "The Numbers"
- [ ] Confirm `/numbers` Pulse hero renders market cap + CITY STATE pill
- [ ] Confirm Civ wars 1st-place podium is visually dominant at ≥760px
- [ ] Confirm DoThisNow lands above CityTerminal on homepage
- [ ] Confirm Vault test-send card has gold border + larger checkbox
- [ ] Verify no regressions on `/start`, `/sync`, `/leaderboard`, `/tribute`, `/civilizations/[slug]` (untouched but on critical paths)

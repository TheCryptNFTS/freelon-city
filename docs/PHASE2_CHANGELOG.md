# Phase 2 — Mobile System

**Goal:** real 375px breakpoint pass. Fix the 9 named mobile-broken
surfaces without redesigning them — same desktop layout, sane mobile
layout. Enforce three hard rules:

1. **No fixed-px grid columns under 540px.** Collapse to stacks.
2. **No tap target under 44px on mobile.**
3. **No body / stat text under 12px on mobile.**

Phase 1 primitives carry the load. Phase 2 adds mobile-aware utilities
that work in concert with those primitives.

---

## 1 · Tokens + utilities added to `app/globals.css`

### New CSS variables

| Token | Value | Use |
|---|---|---|
| `--bp-mobile` | `540px` | the canonical breakpoint for "collapse to stack" |
| `--bp-narrow` | `375px` | for the rare cases that need an even smaller breakpoint |
| `--tap-min` | `44px` | minimum tap target on mobile |
| `--row-h` | `44px` | minimum row height in tables |
| `--t-mobile-min` | `12px` | minimum body text on mobile |

### New utility classes

| Class | Purpose | Replaces |
|---|---|---|
| `.ui-table-stack` + `.ui-table-stack__row` + `.ui-table-stack__cell` + `.ui-table-stack__label` | Grid table that collapses to stacked card list on mobile, with hidden-on-desktop labels | civ-wars standings 4-col grid, graveyard headers |
| `.ui-cta-row` | Row of CTA buttons that becomes a full-width column on mobile, all tap-44 | All "row of 3-6 buttons" patterns (citizens detail, civ-wars footer, relay cards, transmissions footer) |
| `.ui-row-stack` | Horizontal label/value row that becomes vertical on mobile | Hold-the-line leaderboard rows |
| `.ui-chip` + `.ui-chip--active` | Single approved filter chip, 44px tap on mobile | CitizensBrowser ad-hoc 24px chip |
| `.ui-filter-bar` | Horizontal scroll strip on mobile (no sticky-eats-half-screen) | CitizensBrowser sticky filter sidebar |
| `.ui-auto-fit-cards` | Responsive card grid with sane mobile-collapses-to-1-col, customizable via `--min-w` | hold-the-line counter + tier grids, relay prompt grid, transmissions grid |
| `.ui-tap` | Slap on any button/link to enforce 44px min-height | Relay POST TO X btn-sm |

### Global mobile body floor

```css
@media (max-width: 540px) { body { font-size: max(14px, 1rem); } }
```

Floors all body text at 14px on mobile, regardless of bespoke inline styles.

---

## 2 · Surfaces fixed

| Surface | File | Fix |
|---|---|---|
| **Civ Wars standings** | `app/civ-wars/page.tsx` | `<ol>` got `.ui-table-stack`; each row got `.ui-table-stack__row` + `--row-cols: 32px 1fr 100px 80px`. Hidden labels (`Rank` / `Hex` / `Share`) become visible-on-mobile-only. Footer CTAs use `.ui-cta-row`. |
| **Hold-the-line counters + tiers** | `app/hold-the-line/page.tsx` | Both grids swapped from inline `repeat(auto-fit, minmax(220px, 1fr))` to `.ui-auto-fit-cards` with `--min-w` set lower (180px / 200px). Counters now fit 2-cols on tablet, 1-col on phone instead of stacking-with-empty-margin. |
| **Hold-the-line leaderboard rows** | `app/hold-the-line/page.tsx` | Rows use `.ui-row-stack`; on mobile the wallet address line wraps to its own line, bid-count drops underneath. Font bumped from 12→13px. |
| **Graveyard transfer + dump tables** | `app/graveyard/page.tsx` + `app/globals.css` | Inline header rows extracted to `.grave-headrow` / `.grave-headrow--5` classes (display:none on mobile). Existing `.grave-row` / `.defender-row` got a mobile rule that collapses 4-col / 5-col grids into a 2-area grid (image + stacked address/stats). Includes a `[style*="56px 1fr auto auto auto"]` override so the inline 5-col row gets collapsed too. |
| **Citizens browser filter** | `components/CitizensBrowser.tsx` + `app/globals.css` | Inline sticky `<div>` swapped for `.citizens-filter-bar` (no negative margin on mobile that was overflowing the viewport). Search input → `.citizens-search` (tap-44 min-height). `ChipRow` → `.citizens-chip-row` (chip strip becomes horizontal scroll on mobile). `Chip` → `.ui-chip` (tap-44 on mobile). |
| **Relay prompt cards** | `app/relay/page.tsx` | Card grid swapped from `repeat(auto-fit, minmax(340px, 1fr))` (was forcing 1-col + overflow) to `.ui-auto-fit-cards` with `--min-w: 300px`. CTA row uses `.ui-cta-row` (full-width column on mobile). POST TO X btn-sm gets `.ui-tap` so it reaches 44px on mobile. |
| **Transmissions grid + footer** | `app/transmissions/page.tsx` | Card grid → `.ui-auto-fit-cards` with `--min-w: 260px`. Footer CTA row → `.ui-cta-row`. |
| **Citizen detail CTA row** | `app/citizens/[id]/page.tsx` | `.cta-row` gets `.ui-cta-row`. All 5-6 buttons become full-width tap-44 column on mobile instead of wrapping chaotically. |
| **Vault citizen grid** | `components/VaultClient.tsx` | Checkbox grew from 6×6 to 18×18 (still small, but selectable). Mini buttons got 32px min-height, 44px on mobile. Citizen id labels bump from 10→11px on mobile. |
| **Dashboard heat grid** | `components/LiveHeatGrid.tsx` | `gridTemplateColumns` lowered from 120px → 110px minmax; given `.heat-grid` class for future targeting. |
| **Dashboard holder distribution** | `app/globals.css` (`.holders-chart .hc-row`) | Added 540px breakpoint collapsing the 3-col label/bar/count grid to a single column with subtle border separators. |

Also fixed during verification:
- **FloorPill** was wrapping all 4 stats inside a single non-wrapping inner `<span>`, causing the whole strip to overflow on mobile. Pulled them out as direct flex children of the pill so `.ui-pill { flex-wrap: wrap }` actually works.

---

## 3 · Verified at 375px

Confirmed via `preview_resize` mobile preset + screenshots:
- **/civ-wars** — standings stack cleanly, RANK / HEX / SHARE labels surface on each card, no horizontal overflow.
- **/citizens** — filter strip becomes horizontal scroll, ALL CIV / TIER / SHAPE / CASTE / SUB-ARCH / AURA / RARITY chips all tap-44, no sticky sidebar eating screen.
- **/hold-the-line** — counters + tier cards stack 1-col, no overflow. Banner wraps inside viewport.
- **/transmissions** — grid renders 1-col at 375px, scrolls cleanly.
- All headers respect the 980px → mobile-nav handoff.
- City feed marquee intentionally overflows (animation) — not a bug.

---

## 4 · Hard rules going forward

These rules belong in the same lineage as the Phase 1 hard rules:

1. **No `gridTemplateColumns` inline with fixed px under 540px.** If you need a multi-column table that compresses well, use `.ui-table-stack` + `--row-cols`. If you need a card grid, use `.ui-auto-fit-cards` + `--min-w`.
2. **No `padding: 4px 10px` ad-hoc chips.** Use `.ui-chip`.
3. **No row of N CTA buttons inside a `display: flex; flex-wrap: wrap` div.** Use `.ui-cta-row`.
4. **Every interactive element gets at least 44px tap target on mobile.** If your base component is below that, add `.ui-tap` or extend the component class to hit `--tap-min` in a `@media (max-width: 540px)` block.
5. **Every new column layout must collapse cleanly at 540px.** Test at 375px before considering it shipped.

---

## 5 · What Phase 2 did NOT do

- **No per-page hierarchy reorder.** That's Phase 3.
- **No new copy.** Wording untouched.
- **No new pages.**
- **Did not migrate every inline-style block.** Only the surfaces from the audit list. Other files (carrier dash, dashboard sub-sections, civ wars secondary panels) still have inline styles — they get cleaned up as Phase 3 touches each page for hierarchy work.
- **Did not change tablet (760-920px) layouts.** Existing breakpoints there were already sane.

# Phase 1 — Design System Surgery

**Goal:** one visual language. Stop every feature from inventing its own
mini-design system. Replace inline-style sprawl in the worst offender
components with shared primitives + tokens.

This is the foundation layer. Phase 2 (mobile system) and Phase 3
(hierarchy reorder) build on top of these primitives.

---

## 1 · Tokens added to `app/globals.css`

Single source of truth for everything below. All primitives MUST read
from these tokens. No hex literals in component files.

### State colors (system states)

| Token | Value | Use |
|---|---|---|
| `--state-active` | `#7AE08D` | healthy / online / live |
| `--state-surge` | `#E8B247` | gold surge / earning event |
| `--state-unstable` | `#FFD27A` | yellow caution |
| `--state-warning` | `#FF8A6E` | collapse / red warning |
| `--state-danger` | `#FF5A4D` | hard alert |
| `--state-offline` | `#3a3a3a` | dim / no signal |

### State tints (translucent surfaces)

| Token | Value |
|---|---|
| `--tint-active` | `rgba(122,224,141,0.10)` |
| `--tint-surge` | `rgba(232,178,71,0.10)` |
| `--tint-warning` | `rgba(255,138,110,0.16)` |
| `--tint-danger` | `rgba(255,90,77,0.18)` |
| `--tint-gold` | `rgba(200,167,93,0.10)` |
| `--tint-gold-2` | `rgba(200,167,93,0.20)` |

### Panel surfaces

- `--panel-bg` `rgba(8,10,14,0.95)` — opaque dark card canvas
- `--panel-bg-2` `rgba(255,255,255,0.02)` — secondary card
- `--panel-bg-3` `rgba(255,255,255,0.03)` — tertiary card

### Radii

`--r-1` 4px · `--r-2` 8px · `--r-3` 12px · `--r-4` 14px · `--r-pill` 999px

### Shadows

`--sh-1` `0 12px 40px -12px rgba(0,0,0,0.6)`
`--sh-glow-gold` `0 12px 40px rgba(245,242,232,.16)`

### Dot sizes

`--dot-sm` 5px · `--dot-md` 6px · `--dot-lg` 8px

### Mono typography (Pill / KpiRow / kicker variants)

`--t-mono-xxs` 9px · `--t-mono-xs` 10px · `--t-mono-sm` 11px · `--t-mono-md` 13px

### Tracking (repeated letter-spacing values)

`--tr-tight` 0.06em · `--tr-loose` 0.14em · `--tr-pill` 0.22em
`--tr-kicker` 0.28em · `--tr-mono` 0.32em

---

## 2 · Primitive components (`components/ui/`)

Single import surface: `@/components/ui`. Feature files never reach
into individual files.

| Primitive | Renders | Replaces |
|---|---|---|
| `<Panel />` | Bordered card with state strip, label/state header, primary, secondary, KPI rows, optional CTA | 6× inline `<Panel>` in CityTerminal, 38 inline style blocks |
| `<Pill />` | Rounded inline pill (default / gold / warning / civ variants, sm / md sizes) | IdentityGreeting pill, FloorPill, HoldTheLine pill, EARN HEX hand-rolled pill |
| `<StatusDot />` | Small pulsing color dot tied to system state | Every `width:6px;height:6px;border-radius:50%;background:...` inline div |
| `<Kpis />` / `<KpiRow />` | Label · value grid (uppercase k, mono ink-2 v, tabular nums) | Inline 2-col grids in CityTerminal panels |
| `<ActionCard />` | Clickable funnel card (default + hero variants) | DoThisNow primary, both BackupAction tiles |
| `<SectionHeader />` | Kicker bar with optional right-side live indicator | CityTerminal `<header>` |
| `<LiveIndicator />` | Small inline "status · LIVE" badge with dot | CityTerminal status text |
| `<ResponsiveGrid />` | Auto-collapsing 3→2→1 grid (default = joined edges, cards = gapped) | CityTerminal `.city-terminal-grid`, DoThisNow `.dtn-grid` |
| `<MobileStack />` | Single-column vertical stack with token gap | DoThisNow backup container |
| `<Banner />` | Top or block urgency strip (CollapseBanner + HoldTheLineBanner share one shape) | CollapseBanner styles, HoldTheLineBanner styles |

Also exported: `STATE_COLOR` map + `SystemState` union type for cases
where dynamic colors must be passed to inline styles (civ colors).

---

## 3 · Components refactored

All chrome moved off inline style blocks onto primitives + CSS classes
that read tokens.

| Component | Before | After |
|---|---|---|
| `components/CityTerminal.tsx` | 362 LOC · ~38 inline `style={{...}}` blocks · local `Panel` function · hardcoded `#7AE08D` / `#FF8A6E` / `#E8B247` / `#3a3a3a` literals | 198 LOC · 1 inline style (section wrapper) · imports `Panel`, `ResponsiveGrid`, `SectionHeader` · state colors via `var(--state-*)` |
| `components/DoThisNow.tsx` | 216 LOC · 24 inline blocks · BackupAction local component | 178 LOC · imports `ActionCard`, `MobileStack` · primary states extracted into small local PrimarySync/Claim/Snipe components · zero hardcoded colors |
| `components/HeaderArchives.tsx` | 203 LOC · 15 inline blocks on portal menu, divider, items | 159 LOC · all chrome in `.nav-archives-*` classes reading tokens · zero inline styles except dynamic top/right positioning |
| `components/IdentityGreeting.tsx` | 223 LOC · nested `<PillStyle />` with `identity-greeting--*` modifiers reinvented `<Pill />` from scratch | 168 LOC · uses `<Pill variant="civ" civColor={...} />` for known viewers, `<Pill />` for anon · only ig-handle / ig-cta inline-anchor classes remain |
| `components/Header.tsx` | 89 LOC · 10 inline blocks on `<header>`, brand, brand-text | 119 LOC · classes only (`.site-header`, `.brand`, `.brand-text`) · all numeric tokens via `var(--t-mono-*)` / `var(--tr-*)` |
| `components/FloorPill.tsx` | 100 LOC · self-contained .floor-pill class system · hardcoded `rgba(200,167,93,0.10)` etc. | 70 LOC · uses `<Pill variant="gold" />` · only floor-pill-usd accent + arrow remain as local tweaks |
| `components/CollapseBanner.tsx` | 48 LOC · 1 enormous inline style block | 19 LOC · uses `<Banner variant="top" />` + `ui-banner__title` / `ui-banner__accent` class slots |
| `components/HoldTheLineBanner.tsx` | 66 LOC · inline rgba + hand-rolled CTA pill | 21 LOC · uses `<Banner variant="block" />` + `<Pill variant="warning" />` |

**Inline-style block count for these 8 files: ~150 → ~6.** The remaining
inline styles are all dynamic data (`background: civColor`, fixed
portal position math), which is correct usage — never reach for inline
styles for static visual rules.

---

## 4 · Hard rules going forward

These rules exist because Phase 1 wouldn't have been necessary if they
had been followed from the start. Every contribution after this point
must honor them.

1. **No hex literals in `components/*.tsx`.** All color values must
   read from `var(--*)` tokens, period. If a color isn't tokenized,
   add a token first, then use it. Civ palette + state palette + ink
   ramp + gold ramp already cover ~99% of real cases.

2. **No raw `border-radius` numbers.** Use `var(--r-1)` ... `var(--r-pill)`.

3. **No bespoke `padding: 8px 14px` etc.** Spacing must read from the
   `--s-1` ... `--s-10` scale, OR sit inside a primitive class.

4. **No new pill / panel / card / banner reinventions.** Extend a
   primitive — add a variant — instead. If you find yourself writing
   `display: inline-flex; align-items: center; gap: 8px; padding: ...
   border-radius: 999px`, you are reinventing `<Pill />`. Stop.

5. **No nested `<style jsx>` / inline `<style>` blocks larger than
   ~15 lines.** Those almost always belong in `globals.css` so they
   participate in cascade order properly and don't ship JS for
   styling.

6. **State colors are semantic.** `--state-warning` means "the system
   is in a degraded state." It is NOT "the color orange." Don't reach
   for it for unrelated emphasis.

---

## 5 · Verified locally

- `next dev` boots clean on 3000 (no errors in server or console logs).
- Home page renders all 6 City Terminal panels with correct state strips,
  KPIs, and CTAs (FLOOR · HEX INDEX · CIV LEADER · HOLD THE LINE ·
  LAST SALE · TODAY'S SIGNAL).
- `<Pill variant="gold" />` FloorPill renders gold ring + tabular-num
  floor + USD + holder + 24h sales.
- `<Banner variant="block" />` HoldTheLineBanner renders defenders/bids
  counts + warning CTA pill.
- `<ActionCard variant="hero" />` DoThisNow primary renders gold-bordered
  hero card with SYNC + CLAIM CTA.
- ResponsiveGrid collapses 3 → 2 → 1 col across 1280 / 920 / 540
  breakpoints (verified at 375px: single column, 333px wide grid).

---

## 6 · What Phase 1 did NOT do

(So future-me / future-Claude doesn't think it's free to skip Phase 2/3.)

- **No mobile system.** 375px breakpoint, grid collapse rules for
  civ-wars standings, hold-the-line leaderboard, graveyard tables,
  citizens filter, etc. — all still TODO in Phase 2.
- **No page hierarchy reorder.** Homepage section order, dashboard
  section order, vault grouping, carrier daily-first reorder, etc. —
  all still TODO in Phase 3.
- **No new copy.** Wording changes were not in scope.
- **No new pages.** Pure refactor.
- **Other components still have inline styles.** The other ~6 worst
  offenders (citizens grid, civ-wars page, transmission cards,
  carrier dash, dashboard charts, vault client) were intentionally
  not touched in Phase 1 — they get migrated as part of Phase 2/3 work
  on each page, now that the primitives exist for them to migrate to.

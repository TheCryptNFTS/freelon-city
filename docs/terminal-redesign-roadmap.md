# Terminal redesign — phased roadmap

The brief: *"Bloomberg Terminal for a digital civilization. Every
screen should answer: what is happening RIGHT NOW in the city?"*

Reference: Bloomberg / Apple restraint / war room / high-end trading /
premium occult minimalism / Dune UI restraint.

## Principles (the contract for every panel from here)

1. **Live > documentation.** Anything that auto-updates renders with a
   small `system state` dot (`active`, `unstable`, `warning`, `offline`,
   `surge`). Static lore visually recedes.
2. **Density contrast.** Sparse padding + dense data per panel. No
   ornament without information.
3. **Hierarchy by weight, not color.** Primary number is display font,
   tabular numerics. Labels are mono 9px uppercase. Stop using gold for
   "important" — use it for `surge` state only.
4. **Cards > lists.** Anything currently a paragraph or bullet list
   becomes a panel.
5. **Wallet-bound holders are the center.** When a wallet is detected,
   the page transforms — civ-colored borders, personal stats panel up
   top, defender status shown if active.
6. **Mobile-first.** Every grid collapses to vertical stack at ≤540px
   with the most urgent panel on top.
7. **System state colors** (single source of truth):
   - `active` → #7AE08D
   - `surge`  → #E8B247 (gold)
   - `unstable` → #FFD27A
   - `warning` → #FF8A6E
   - `offline` → #3a3a3a

## What's shipped (Phase 1 — proof of architecture)

| Surface | Shape |
|---|---|
| `<CityTerminal />` on homepage | 6-panel Bloomberg grid: Floor / Hex Index / Civ Leader / Hold the Line / Last Sale / Today's Signal. Each panel has a state dot, terse label, primary display number, secondary line, 2-4 row data grid, optional CTA hint. |
| Archives dropdown reshape | Groups renamed to LIVE / MARKET / HOLDER / COMMUNITY / CANON. Labels shortened to single words, nowrap + ellipsis. Glyph `⬡` reserved for static, `⬢` for live, `⚠` for warning. |
| Defender auto-detection | OpenSea collection offers scanned in sweep-bounty cron. +500 ⬡ per qualifying bid (≥1.4× floor), +2,000 ⬡ + DEFENDER badge on 7-day hold. SETNX dedupe means safe at any cron frequency. |

## Phase 2 — apply the pattern (next session)

Replace these surfaces with terminal-style panel grids:

| Surface | What changes |
|---|---|
| `/dashboard` | Becomes a HOLDER COMMAND TERMINAL — 8 panels: your hex / claim status / sweep streak / defender bid / civ rank / red signals you can snipe / your top citizen / recent earnings. |
| `/numbers` | Already half-terminal. Apply the panel system, drop the kicker-headline-paragraph repetition, add state dots, tighten typography. |
| `/civ-wars` | Live war-room — civilization scoreboard becomes a tabular trading terminal with sortable columns, sparklines, "in-play" / "leading" / "fading" states. |
| `/hold-the-line` | Mission ops room — current bid wall depth as a visualisation, defender leaderboard as a hand-of-cards layout, your bid as a personal panel. |
| `/civilizations/[slug]` | Civ HQ — population, current standings, top carriers, war status, identity colors as primary signal. |

## Phase 3 — typography + spacing system (one focused session)

Codify a single typography + spacing system, replace ad-hoc styles
across every page:

- Token set: 4 spacing values (xxs/xs/sm/md/lg/xl), 5 type sizes
  (caption/body/lead/display/hero), 5 state colors.
- New utility classes: `.panel`, `.panel--surge`, `.panel--warning`,
  `.kpi`, `.kpi-row`, `.kpi-label`, `.kpi-value`.
- Replace inline styles in pages built before this redesign.

## Phase 4 — lore demotion (small)

Pages currently treated like main attractions but actually static
reference: `origin`, `lore`, `manifesto`, `lexicon`, `shapes`,
`castes`, `rebuild`, `names`.

Migration:
- Remove from any primary CTA position.
- All link only from `/canon` and footer.
- Visual treatment: serif display + plenty of whitespace + zero
  state-dots — they're not live, they shouldn't pretend to be.
- The reading experience stays good, it just stops competing for
  attention against live surfaces.

## What this is NOT

- Not a typography rewrite of every page in one PR. Phased.
- Not removing pages. Demoting visual weight.
- Not changing the brand voice. Just removing decorative noise from
  the surfaces that should be informational.
- Not generic sci-fi UI. No cyberpunk neon. No glitch effects. The
  reference is Dune-restraint, Bloomberg-density, Apple-clarity.
- Not abandoning the lore-poetic moments (Daily Signal pull-quote,
  pull-quote closer) — those stay as deliberate quiet beats. The
  data surfaces around them get tighter.

## Open questions for the architect

1. Do you want the homepage hero to STAY ("The hex didn't disappear /
   It moved") or be REPLACED by the CityTerminal as the primary above-
   the-fold for everyone? Current ship: hero stays, terminal sits
   right below it.
2. Do you want a dedicated `/terminal` page where the panel grid
   takes the entire viewport (no hero, no marketing) — for power
   users who want city-state-at-a-glance?
3. Color override: should `surge` (gold) lead, or should `active`
   (green) lead? Currently active is the default — gold is reserved
   for surge events. Flip if you prefer the brand-gold-first feel.

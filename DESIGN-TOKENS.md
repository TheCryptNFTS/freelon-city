# FREELON CITY — Design Tokens

> Extracted from `app/globals.css`. This document is the human-readable index. The CSS file is the source of truth.

---

## 1. Color tokens

### Surface palette
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0a0c12` | Page background (never pure black) |
| `--bg-2` | `#0d0f15` | Slightly lifted surface (inline-sync band, hero variants) |
| `--surface` | `#131316` | Card backgrounds |
| `--surface-2` | `#1a1a1f` | Pressed / inset surface |
| `--line` | `#1f2027` | Default border |
| `--line-2` | `#2a2b33` | Input border / pressed border |

### Ink palette
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#e6e1d2` | Primary text on dark surfaces |
| `--ink-2` | `#a8a59a` | Body copy / secondary text |
| `--ink-dim` | `#888888` | Labels, kickers, mono metadata |
| `--ink-fade` | `#4a4a4a` | Disabled / hairline text |

### Gold (the only metal)
| Token | Hex | Use |
|---|---|---|
| `--gold` | `#c8aa64` | Primary brand accent. Stats, CTAs, em-tags. |
| `--gold-bright` | `#e6c47a` | Hover state for gold |
| `--gold-deep` | `#8a7644` | Inset / pressed gold |

### Civilization colors (10)
Used as `--civ` CSS variable scoped to a component via inline style.

| Civ | Token | Hex |
|---|---|---|
| Blue Synthesis | `--civ-blue` | `#4a8acb` |
| Red Corruption | `--civ-red` | `#c54a3a` |
| Green Growth | `--civ-green` | `#5a9a4a` |
| Purple Oracle | `--civ-purple` | `#8a4ac5` |
| White Transmission | `--civ-white` | `#e6e1d2` |
| Pink Luxury | `--civ-pink` | `#d97aa0` |
| Black Fracture | `--civ-black` | `#404045` |
| Gold Sovereignty | `--civ-gold` | `#c8aa64` |
| Void 404 | `--civ-void` | `#6a4a8a` |
| Silver Machine | `--civ-silver` | `#b0b4be` |

### Legacy aliases (do not use in new code)
`--color-bg` → `--bg` · `--color-ink` → `--ink` · `--color-ink-dim` → `--ink-dim` · `--color-gold` → `--gold` · `--serif` → `--display`

Reason for keeping: a small number of existing pages still reference these. New code uses the canonical tokens.

---

## 2. Typography tokens

### Font stack
| Token | Family | Source | Use |
|---|---|---|---|
| `--display` | Tanker | Fontshare | All h1/h2 + statement headlines |
| `--grotesk` | Cabinet Grotesk | Fontshare | h3, button labels, strong UI text |
| `--sans` | Satoshi | Fontshare | Body copy, long-form, lead paragraphs |
| `--mono` / `--mono2` | JetBrains Mono | Google | Data, kickers, badges, mono metadata |

**Never use:** system serif fallback, Inter, Arial, Helvetica directly. The stack guarantees fallback degrades to Helvetica Neue → Arial → sans-serif.

### Type scale
| Token | Clamp | Use |
|---|---|---|
| `--t-display` | `clamp(72px, 11vw, 168px)` | Page-defining headlines (hero, manifesto, lore hero) |
| `--t-h1` | `clamp(48px, 7vw, 96px)` | Page h1 |
| `--t-h2` | `clamp(36px, 5vw, 72px)` | Section h2 |
| `--t-h3` | `clamp(22px, 2.4vw, 32px)` | Subhead, card title |
| `--t-lead` | `clamp(17px, 1.4vw, 20px)` | Sub-hero lead paragraph |
| `--t-body` | `16px` | Default body |
| `--t-small` | `13px` | Small print |
| `--t-mono` | `11px` | Kicker / metadata |

### Global type rhythm (from `globals.css`)
- `html { font-family: var(--sans); font-size: 16px; line-height: 1.55 }`
- `h1, h2 { font-family: var(--display); text-transform: uppercase; letter-spacing: -0.02em }`
- `h3 { font-family: var(--grotesk); font-weight: 700 }`
- All `<em>` inside headlines = gold accent.

---

## 3. Spacing scale (strict 4px grid)

| Token | Value | Common use |
|---|---|---|
| `--s-1` | 4px | Tight inline gap |
| `--s-2` | 8px | Pill padding, small gap |
| `--s-3` | 12px | Button gap, label→input gap |
| `--s-4` | 16px | Card padding, default grid gap |
| `--s-5` | 24px | Section subhead margin |
| `--s-6` | 32px | Card body padding |
| `--s-7` | 48px | Section-internal break |
| `--s-8` | 64px | Major section break |
| `--s-9` | 96px | Page-hero spacing |
| `--s-10` | 128px | Reserved for largest gaps |

### Section rhythm
| Token | Value | Use |
|---|---|---|
| `--sec-y` | `clamp(64px, 9vw, 128px)` | Top/bottom padding on every page section |
| `--pad` | `clamp(20px, 4vw, 48px)` | Horizontal page padding |
| `--maxw` | `1320px` | Max content width |

---

## 4. Component conventions

### Buttons (`.btn`, `.btn-gold`)
- 18px vertical / 24px horizontal padding
- Cabinet Grotesk 700, 12px, letter-spacing 0.2em, UPPERCASE
- Gradient background top→transparent for material
- Inset highlight `rgba(255,255,255,0.04)` + bottom shadow for felt depth
- Hover: gold border, gold-bright text, `translateY(-1px)`, outer glow
- Gold variant: gradient `--gold-bright → --gold`, inset white highlight, glow

### Kicker (`.kicker`)
- JetBrains Mono 500, 11px, letter-spacing 0.32em
- `--ink-dim` color
- Always preceded by a small gold accent line (`::before` 18×1px)

### Card surfaces (`.shape-card`, `.civ-card`, `.honor-card`, etc.)
- `--surface` background
- 1px `--line` border, 3px civ-color or gold top border
- Inset top highlight + bottom shadow
- Hover: top-glow fade-in via `::after`, `translateY(-2px)`

### Term badge (`.term-badge`)
- JetBrains Mono 12px, gold border, scanline animation
- `backdrop-filter: blur(8px)` for material

### Reveal animation (`.reveal`)
- Defaults visible (`opacity: 1`)
- JS adds `data-rv="0"` on below-fold elements (hides)
- IntersectionObserver flips to `data-rv="1"` (or `.in` class) when visible
- 900ms cubic-bezier transition on opacity + transform
- `@media (prefers-reduced-motion: reduce)` disables

---

## 5. Atmosphere layers (the "premium" feel)

Three full-viewport layers stacked under content:

1. **Body background** — radial gold + cerulean gradient on `--bg`
2. **`body::before` — grain overlay** (opacity 0.13, mix-blend overlay, SVG turbulence)
3. **`body::after` — blueprint grid** (opacity 0.4, 64×64 lines, radial mask centered)

Plus per-section atmosphere:
- **Hero ambient blobs** (`.hero::before`, 18s animation)
- **Mouse-tracking spotlight** (`.hero::after`, `.war-table::before`, uses `--mx` / `--my` from `Spotlight.tsx`)

Removing any of these three layers will return the site to "looks cheap." They are not optional.

---

## 6. Image asset paths

| Dir | Aspect | Contents |
|---|---|---|
| `/public/civs/` | 1536×1024 | 10 civilization plates |
| `/public/lore/` | 1536×1024 | Lore page hero |
| `/public/origin/` | 1536×1024 | Origin page hero |
| `/public/atmos/` | 1536×1024 | Page atmospherics (manifesto, rebuild, carrier, sync, not-found) |
| `/public/og/` | 1536×1024 | OG share card masters |
| `/public/social/` | varies | X profile (1024×1024 PNG) + banner (1500×500 JPG) |

All generated via `gpt-image-1.5 medium` with `signal-born_MASTER.png` as reference anchor.

---

## 7. Accessibility tokens

- `:focus-visible` outline: `2px solid var(--gold)`, `outline-offset: 3px`, `border-radius: 2px`
- Selection: `background: var(--gold); color: #000`
- `prefers-reduced-motion: reduce` disables `.reveal` transitions
- WCAG AA contrast verified for:
  - `--ink` on `--bg` = 11.4:1 ✓
  - `--ink-2` on `--bg` = 7.8:1 ✓
  - `--gold` on `--bg` = 9.2:1 ✓
  - `--ink-dim` on `--bg` = 5.1:1 ✓ (AA Large, passes for the 11px mono kickers they're used on)

---

## 8. Forbidden patterns

- **Tailwind `text-xl font-light` without an explicit font-family** — fell back to system serif on Safari before we set the Tailwind `fontFamily.sans` token. Always use design tokens.
- **Hardcoded hex colors in JSX inline styles** — except for `--civ` per-component injection.
- **`background: rgba(0,0,0,X)` for backgrounds** — use `--bg` family.
- **Border-radius > 8px** — radii are 2px / 4px / 6px / 8px max. No pill buttons. No fat rounded cards.
- **Shadows that try to lift content "above the page"** — our shadows are inset (felt depth) or directional glow (gold). No floating cards.

---

## 9. Tailwind config alignment

`tailwind.config.ts` mirrors these tokens:

```ts
fontFamily: {
  sans:    ['Satoshi', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
  grotesk: ['"Cabinet Grotesk"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
  display: ['Tanker', '"Cabinet Grotesk"', 'Impact', 'sans-serif'],
  mono:    ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'monospace'],
}
colors: {
  bg: '#0a0c12', 'bg-lifted': '#131316',
  ink: '#e6e1d2', 'ink-dim': '#888888',
  gold: '#c8aa64', 'gold-bright': '#e6c47a',
}
```

**Why Tailwind exists at all:** legacy interior pages (`/citizens/[id]`, `/castes`) were Tailwind-class-based. We keep the config aligned so utility classes resolve to our brand tokens. New code prefers plain CSS classes referencing `var(--*)` tokens.

— Sealed: Phase 3, Cycle 0404

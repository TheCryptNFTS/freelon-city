# Citizen Résumé Card — Redesign (social flex object, not a web component)

Date: 2026-06-09. The v1 card is REJECTED: it's a left-image / right-stats dashboard panel — clean
but dead on arrival for X. Concept 7 · composition 4 · share-impact 3. The portrait out-vibes the
layout. This doc = 3 directions, no code yet. **Acceptance bar: would a holder post this WITHOUT
being begged? If no, reject.**

**The mantra:** this is not a website component, it is a social flex OBJECT — a stolen city ID, a
classified file, a cinematic record.

## What's wrong with v1 (don't repeat)
- Left-image/right-text = SaaS panel, no object-ness.
- Dead black space reads as an accidental website crop.
- Stats ("Records Logged / Rank / Class") are admin labels, not status.
- No ceremony: no seal, serial strip, stamp, archive grid, signal line, watermark.
- Won't read in 1 second in the X mobile feed.

## Renderer reality (so these are buildable, not fantasy)
The card is `next/og` (Satori): **flexbox subset only** — no grid, no arbitrary CSS, no external
fonts unless registered. Implications:
- "Barcode" / "record strip" = a row of thin `<div>` bars (cheap, works) — NOT a real scannable code.
- "Stamp/seal" = a bordered rotated `<div>` with letter-spaced text, or an inline `<svg>` ring.
- Special glyphs (⬡) render as TOFU unless a font is registered — v1 already hit this. Use plain
  type + drawn shapes, OR register a font with the glyph (one-time setup, worth it for the hex mark).
- Civ accent color is available per citizen; portrait is `imageUrl(tid)`.
Every element below is chosen to be drawable in this subset.

---

## DIRECTION A — OFFICIAL CITY ID (best for owner flex)
A passport/identity card. The "I'm a verified citizen" object.

```
┌───────────────────────────────────────────────┐
│ FREELON CITY · IDENTITY RECORD        [hex mark]│  ← top bar, civ-accent hairline under
│─────────────────────────────────────────────── │
│ ┌─────────┐   CITIZEN #1450                     │
│ │ PORTRAIT │   RED CORRUPTION                    │  ← portrait is a FRAMED inset (gold hairline),
│ │ (square) │   CITY ANALYST · RANK #11           │     not a full-bleed left slab
│ └─────────┘   ───────────────────────           │
│   SERIAL ▌▌▌▎▌▎▌▌  (thin-bar strip)             │
│                                                 │
│ RECORDS SEALED   6      STATUS   ACTIVE          │  ← 2 boxed stat cells, bordered, label-over-value
│                                                 │
│ ISSUED · CYCLE 0404        [ARCHIVE SEAL ring]   │  ← rotated stamp bottom-right
└───────────────────────────────────────────────┘
```
- **Text hierarchy:** kicker (tiny caps) → CITIZEN # (huge) → civ + class/rank (medium accent) → stat cells → footer.
- **Image:** framed square inset, gold hairline border, NOT a full-height slab.
- **Stat treatment:** bordered cells, label small-caps above, value big — reads as official fields.
- **Object marks:** serial bar-strip, an `<svg>` ring "ARCHIVE SEAL" stamp rotated ~-8°, civ-accent hairlines.
- **Mobile/X:** the # and civ read at thumbnail size; serial + seal give instant "this is a card."
- **Why post-worthy:** it looks like a thing you OWN — a verified city passport, screenshot-as-flex.
- **Remove from v1:** the bare right-text column; the plain "Records Logged/Rank/Class" labels.

## DIRECTION B — CLASSIFIED ARCHIVE RECORD (best for lore)
A recovered file. The "the city has a file on this citizen" object.

```
┌───────────────────────────────────────────────┐
│ CITY ARCHIVE // RECORD #1450      ▓ CLASSIFIED  │  ← monospace, a stamped CLASSIFIED tag
│  ░ faint hex watermark behind everything ░      │
│                                                 │
│   [ portrait, duotone/civ-tinted, inset ]       │
│                                                 │
│ STATUS ......... ACTIVE                         │  ← dossier "dot-leader" rows (monospace)
│ CLASS .......... ANALYST                        │
│ SIGNAL ......... RED CORRUPTION                 │
│ RECORDS SEALED . 006                            │  ← zero-padded = file energy
│ RANK ........... #11                            │
│                                                 │
│ ▌▌▎▌▎▌▌▎  RECORD VERIFIED · freeloncity.com     │  ← bar-strip + verify footer
└───────────────────────────────────────────────┘
```
- **Text hierarchy:** monospace throughout; dot-leader rows make it read as a typed file.
- **Image:** civ-tinted duotone treatment so it feels archival, not a fresh photo.
- **Stat treatment:** `LABEL ....... VALUE` dossier rows, zero-padded numbers (`006`).
- **Object marks:** CLASSIFIED stamp, faint hex watermark, bar-strip, "RECORD VERIFIED."
- **Mobile/X:** the CLASSIFIED stamp + mono file look is instantly legible as "leaked document."
- **Why post-worthy:** mystery + lore; people post "the city has a file on me." Different from a flex — it's intrigue.
- **Remove from v1:** the friendly sans-serif dashboard; replace with typed-file treatment.

## DIRECTION C — CINEMATIC POSTER RECORD ⭐ (best for X attention — RECOMMENDED)
Big portrait, huge title, stats as stamps. The scroll-stopper.

```
┌───────────────────────────────────────────────┐
│                                                 │
│        [ PORTRAIT — large, hero-lit,            │
│          civ-accent vignette, fills            │
│          most of the frame ]                    │
│                                                 │
│  CITIZEN #1450                                  │  ← HUGE display title, bottom-left over a
│  RED CORRUPTION · CITY ANALYST                  │     dark gradient scrim on the portrait
│  ▌ 6 RECORDS SEALED   ▌ RANK #11                │  ← two stamp-chips (bordered, accent edge)
│                                                 │
│  FREELON CITY ARCHIVE                           │  ← small footer
└───────────────────────────────────────────────┘
```
- **Text hierarchy:** portrait dominates → huge CITIZEN # over a gradient scrim → civ/class line → 2 stat-chips → footer. Fewer stats, bigger.
- **Image:** large / near-full-bleed with a bottom dark-gradient scrim so text is readable over it (the v1 mistake was separating image and text into two zones).
- **Stat treatment:** "6 RECORDS SEALED" / "RANK #11" as bordered stamp-chips with a civ-accent left edge — status, not labels.
- **Object marks:** accent vignette, gradient scrim, stamp-chips, a thin corner serial.
- **Mobile/X:** passes the 1-second test — giant title + face + two punchy stats. Nothing tiny.
- **Why post-worthy:** looks like cinematic key-art / a movie-poster record. Highest desire-to-post.
- **Remove from v1:** the split panel entirely; the small admin labels; the dead black right half.

---

## Copy upgrades (all directions)
- "Records Logged" → **"6 RECORDS SEALED"** (or `006` in B)
- "Rank" → **"RANK #11"**, "Class" → **"CITY ANALYST"**
- add **"STATUS: ACTIVE"**, civ as **"RED CORRUPTION"** (a signal, not a tag)
- footer → **"FREELON CITY ARCHIVE · RECORD VERIFIED"** or **"CITIZEN RECORD SEALED · freeloncity.com"**

## Allowed object elements (authority, not clutter)
thin civ-accent/gold hairlines · serial bar-strip (divs) · rotated stamp/seal (`<svg>` ring) ·
faint hex watermark · zero-padded IDs · "CYCLE 0404" date · framed/duotone portrait.
**Banned:** random glow, neon, big gradients-as-decoration, cheap hologram, SaaS stat cards.

## Recommendation
Ship **C (Cinematic Poster Record)** as the primary share card — it's the strongest scroll-stopper
and the truest "social flex object." Keep **A (City ID)** as a second format for the owner-profile
flex, and **B (Classified)** as a lore/mystery variant for the City Archive feed. One renderer,
three `?style=` variants later — but C first.

## Build constraints when implemented
- Reuse `/api/og/resume/[id]` (extend, don't fork). Add `?style=poster|id|classified`, default poster.
- Register a font that includes ⬡ (or draw the hex as `<svg>`) — no tofu.
- Verify at 1200×630 AND eyeball at X-thumbnail scale (the 1-second test), not just "it rendered 200."
- Acceptance: a holder would post it unprompted. If the screenshot doesn't clear that bar, iterate before shipping.

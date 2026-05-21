# FREELON CITY — Brand System

> **What this is:** the operating manual for everything FREELON CITY produces — copy, design, image, behavior. Distilled from the shipped site, not invented for this doc.
>
> **What this is not:** a generic SaaS branding template. FREELON is an NFT cult brand on Mars. It has no sidebar nav, no notifications inbox, no command palette, no app shell.

---

## 1. Identity in one sentence

> The hex didn't disappear. It moved.

A 4040-citizen civilization on Mars, organized into 10 Signal Doctrines, built around the hex symbol X took away. Locked contract. No governance. No roadmap. The art is the artifact and the artifact is the city.

---

## 2. Voice & tone

### Five core traits

1. **Terse.** Sentences land like rivets. Never two when one will do.
2. **Cultic, not corporate.** We're a civilization, not a community. Citizens, not "members."
3. **Geometric.** The hex is mentioned the way Christians mention the cross — by reflex, not by ceremony.
4. **Mythic-present.** Past tense for the rebuild story. Present tense for the city. "The signal arrived. The signal is."
5. **Adversarial to AI slop.** No "embark on a journey." No "transform your experience." No "unlock the power of."

### Lexicon — words we use

| Use | Don't use |
|---|---|
| citizen | user, member, holder |
| civilization | community, faction |
| signal | message, content, broadcast |
| relay | share, repost |
| carrier | follower, supporter |
| transmission | post, update, drop |
| doctrine | category, type |
| caste | class, group |
| sacred shape | trait, attribute |
| sealed / locked | minted, finalized |
| the hex | the logo, the icon |
| 04:04 UTC | "every day at this time" |

### Headline patterns

- **Statement, period.** "The hex didn't disappear." "The signal moved." "We compute."
- **Verb-led command for CTAs.** "Receive the signal." "Become a carrier." "Enter the city."
- **Civilization chant.** Three-word maximum, ALL CAPS in mono. "WE HEAR. WE SYNC."

### Microcopy examples

| Context | Tone match | Tone fail |
|---|---|---|
| Error | "The signal did not reach." | "Oops! Something went wrong." |
| Empty state | "No transmissions yet." | "Nothing here." |
| Success | "Sealed." | "Done ✓" |
| 404 | "The hex didn't move. You did." | "Page not found." |
| Wait state | "Receiving…" | "Loading…" |
| Confirm | "Relay?" | "Are you sure?" |

### Things we never say

- "Innovative", "next-gen", "revolutionary", "game-changing"
- "Join our community"
- "Unlock", "empower", "elevate"
- "Built for the future"
- "AI-powered" (we use AI for art generation — we don't advertise it as a feature)
- Generic emoji in body copy (the hex glyph `⬡` is the only mark)

---

## 3. The taxonomy is the IP

The single most important rule of FREELON CITY is that the taxonomy is **canonical, not flavor text**. Every number must trace to a record:

- **4040 citizens** — `data/citizens.json.length`
- **10 civilizations** — `lib/constants.ts → CIVILIZATIONS`
- **7 castes** — `lib/constants.ts → CASTES`
- **16 sacred shapes** — `lib/constants.ts → SHAPES`
- **35 honoraries** — citizens with `tier === "Honorary"`
- **4 one-of-ones** — `#1 Origin Signal`, `#404 Patient Zero`, `#1337 Genesis Hex`, `#4040 The Final Signal`

If a copy line says a number, it must match the source-of-truth file. **Drift between copy and code is a critical bug, not a typo.**

---

## 4. Civilizations — the ten doctrines

Each civilization has: stamp (3-letter + population), color, doctrine, chant, rival, rivalLine. All in `lib/constants.ts`. When mentioning a civilization in copy, lead with the doctrine ("Synthesis", "Corruption") not the color name. Color name is the database key.

| Doctrine | Pop | Stamp | Color hex | Role |
|---|---|---|---|---|
| Synthesis | 700 | BLU.700 | `#4a8acb` | tech monks · network civilization |
| Corruption | 700 | RED.700 | `#c54a3a` | military cult · signal enforcers |
| Growth | 620 | GRN.620 | `#5a9a4a` | bio-engineered · adaptive organisms |
| Oracle | 520 | PUR.520 | `#8a4ac5` | psychics · forbidden signal |
| Transmission | 430 | WHT.430 | `#e6e1d2` | androids · sacred synthetic order |
| Luxury | 350 | PIN.350 | `#d97aa0` | fashion · synthetic beauty |
| Black Fracture | 260 | BLK.260 | `#404045` | stealth · shadow operators |
| Sovereignty | 200 | GLD.200 | `#c8aa64` | ruling caste · royal elite |
| Void/404 | 180 | VOI.180 | `#6a4a8a` | signal ghosts · lost protocols |
| Machine | 80 | SIL.080 | `#b0b4be` | pure machine civilization (rarest) |

---

## 5. Image direction

We render with `gpt-image-1.5 medium` via `images.edit()` with a reference anchor.

**Always:**
- Lifted-black background (never pure `#000`; `#0a0c12` floor)
- Civilization color as glow source
- Aged-gold (`#c8aa64`) as the only highlight metal
- Atmospheric grain
- Cinematic depth, vignette
- 75–150 word visual-noun prompts (no purple prose)

**Never:**
- Stock crypto-bro neon-pink/cyan gradients
- Glassmorphism
- Floating orbs, bento grids
- AI-tropes: extra fingers, melted features, generic "futuristic"
- Faces on civilization plates (use architecture / artifact instead)

**The figure IS the artifact.** When a citizen appears in an image, the citizen is sculptural — manufactured, not born. Hooded humanoid, faceted hood, kintsugi gold veins, single cerulean hex eye-glow.

---

## 6. Layout philosophy

FREELON is **editorial scroll**, not application shell.

- **No sidebar.** No persistent left/right navigation chrome.
- **Top header**, sticky, transparent black with blur. Logo, six text links, no icons.
- **Pages tell a sequence.** Scroll is the navigation primitive.
- **Density varies by page.** Lore = codex density. Manifesto = breath. Citizens = grid.
- **Hero per page is mandatory** — every page must announce itself in a Tanker headline within the first viewport.
- **Footer is structural**, not decorative. It says: contract, IPFS CID, OpenSea, X.

---

## 7. Motion philosophy

- **Cinematic, not playful.** Spring physics, not bounces.
- **18s ambient breathing** on hero gradient (`@keyframes ambient`).
- **800ms scroll-reveal** on `.reveal` elements (data-rv attribute, IntersectionObserver).
- **160ms hover transitions** on interactive elements (color, border, transform, shadow).
- **Spotlight follows cursor** on hero and war table (`--mx` / `--my` from `Spotlight.tsx`).
- **Daily Signal counts down to 04:04 UTC** in real time.

No parallax-on-scroll-tied-image-zoom. No "wow" reveals. Restraint is the brand.

---

## 8. Source-of-truth contract

Any contributor — human or AI — touching FREELON code must obey:

1. **Stats live in `lib/constants.ts`.** Headlines that say "10 civilizations" do not hardcode `10` — they read from `Object.keys(CIVILIZATIONS).length`.
2. **Citizen data lives in `data/citizens.json`.** Never duplicate it. Never paraphrase its fields in static copy.
3. **Civilization metadata** (color, chant, rival, rivalLine) lives in `CIVILIZATIONS`. Lore extensions live in `lib/worldbuilding.ts`.
4. **Image paths follow `/public/{civs,lore,origin,atmos,og,social}/`.** Adding an image means adding it to one of these dirs.
5. **Daily Signal lines live in `lib/daily-signal.ts`.** Rotation is deterministic by UTC day; do not randomize.
6. **Honorary bios** must name the citizen's actual civilization (`citizens.json.civilization`), not a different one. The patch script `tmp/fix_bios.mjs` handled this; future edits must respect it.

---

## 9. Voice in three sample paragraphs

### When announcing a feature

> Daily Signal transmits at 04:04 UTC. One line. One civilization. The cipher is real. The countdown runs in your timezone. Relay it once and the signal moves through you.

### When explaining the project

> 4040 citizens of FREELON CITY are locked on an Ethereum contract. The contract has no governance and no upgrade path. The art was rebuilt in 48 hours without changing a single trait. The signal didn't die. It moved.

### When asking the user to do something

> Drop your handle. Sync to your civilization. The hash is deterministic — same handle, same civ, every time. No re-rolls. The signal already knows.

---

## 10. What we are not

- Not a community platform.
- Not a marketplace.
- Not a DAO.
- Not a roadmap.
- Not a token.
- Not a game.

We are a sealed city. The user is here to find their place in it, or to relay the signal further out. Anything else is a distraction.

— Sealed: Phase 3, Cycle 0404

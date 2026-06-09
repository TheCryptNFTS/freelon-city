# FREELON CITY — Creation / Shareable-Media System

Date: 2026-06-09. The spec for turning owned citizens into a **shareable-media engine** —
the lever for the project's real gap (virality ~3/10, not design ~7/10). Framing shift:
NOT "AI agents do jobs" → **"your citizen makes something worth posting, it saves to the
record, the city feels alive."**

**Grounded in existing infra — this EXTENDS, it does not reinvent. Read §3 first.**

---

## 1. Product thesis (one sentence)
Your citizen creates premium, on-brand shareable media (transmissions, posters, ID/status
cards, video prompts) that look like status objects — each saved to the citizen's record and
one-tap shareable to X.

## 2. Why someone wants one
- **Status flex:** "my citizen logged its first signal" / "my OOGIE is officially a city problem." It makes *their* token look cool, publicly.
- **Identity:** ID cards, résumé cards, district assignments = a profile to show off.
- **Low effort, high output:** tap → premium image + caption + share. No prompt-writing skill needed.
- **Collection differentiation:** each collection makes a *different kind* of thing (see §11).
- The point of every output: **would someone post this on X because it makes their citizen look cool?** If no, cut it.

## 3. EXISTING INFRA — reuse, don't rebuild (verified 2026-06-09)
| Need | Already exists | Reuse how |
|---|---|---|
| Image generation | `lib/missions/image-gen.ts` — `SCENES` (6 settings) + `STYLES` (13 transforms), `buildImagePrompt`/`buildTransformPrompt`, server-side **allowlist** (client passes a KEY, never raw text → brand-safe, no moderation risk) | Add a new `POSTERS`/`TRANSMISSIONS` allowlist alongside SCENES/STYLES; same key-not-text pattern |
| Video | `lib/missions/video-gen.ts` (`VIDEO_STYLES`, gated on `REPLICATE_API_TOKEN`) | Add video-prompt templates as allowlist entries |
| Share cards | `app/api/og/*` (agent, card, carrier, civ-pride, score, universe…) — Satori/ImageResponse OG generators | New creation types get an `/api/og/<type>` route following the same pattern |
| Share to X | `lib/share.ts`, `lib/share-agent.ts` (`tweetIntent`, `openTweet`, caption builders) | Reuse for the X Share Kit (§ caption templates) |
| Feed surface | `/transmissions` route + `/transmissions/[id]` already exist | Becomes the City Archive feed (or sits beside it) |
| Work record | `lib/agent-history.ts` (per-token, survives sale, owner-gated body — see HISTORY_VISIBILITY_POLICY) | Creations save here; public = proof, owner = full |

**Architecture rule (locked, do not break):** creation types are **server-side allowlisted
templates keyed by id**, never free-text prompts from the client. This is the existing
moderation-safe model (`isValidScene`/`isValidStyle`). New poster/transmission types follow it.

## 4. Simple user flow (CREATE WITH YOUR CITIZEN)
```
Open citizen → CREATE → pick type (Transmission · Poster · Card · Video prompt)
→ pick a template (allowlisted) → generate → preview
→ [Save to Record]  [Share to X]  [Download]
```
One screen, four types, no prompt-writing. Generation reuses the agent run path + HEX/cost
guard already in place (do NOT add a new faucet; image render already has a HEX cost).

## 5. Share-card anatomy (every output)
- **Art** (generated, on-brand — §6)
- **Headline** (e.g. "SIGNAL DETECTED")
- **Sub** (e.g. "Citizen #1450 has entered the city")
- **Token stamp** (`#1450 · {civ}`) + small ⬡ glyph
- **"created by Citizen #1450" footer** (provenance = the moat)
- **Caption** (auto, copy-button — §12) + Share-to-X button

## 6. Visual style — cinematic, cool, HUGE variety (NOT locked)
The poster/media engine is the marketing/creative lane — it is **not** boxed into the strict
collection-art canon (that canon governs the citizens themselves + the site UI). Posters should be
**cinematic, dramatic, varied, and cool** — give people a reason to post.

- **Default signature look (one strong option, not a cage):** lifted-black + aged-gold archive
  poster, Apple × Dune × Blade Runner restraint. Great for "official city broadcast" energy.
- **But go WIDE:** different posters should look genuinely different — cinematic key-art,
  emergency-broadcast screens, weathered propaganda, neon-soaked districts, painterly memory
  shards, gritty wanted posters, holographic ID cards, brutalist monuments, retro archive scans,
  storm-lit splash art, etc. Variety = more posts = the whole point.
- **Per-collection palettes** can lean into their identity (Crypt = funereal gold-on-black, OOGIES =
  biological green murk, SMILES = corrupted red, Emile = soft melancholic light, Void = violet
  static). Use the civ accents as *inspiration*, not a restriction.
- The citizen stays recognisable (hooded/faceted/hex-eye is good identity glue) but the WORLD around
  it, lighting, era, and treatment should vary hugely.
- Mood target per output: "would this stop someone's scroll?" If it looks samey/safe, push it.

## 7. The only real bans (everything else is fair game)
These are the ONLY hard limits — they're safety/legal, not aesthetic taste:
- ❌ Gore / sexual content / hateful imagery.
- ❌ Real-person likeness misuse, copyrighted characters.
- ❌ Financial/"value goes up" claims in any caption (legal — §10).
- ❌ Free-text client prompts → must go through the server allowlist (moderation safety — but the
  allowlist can be HUGE and varied; see §8).

Everything else — neon, painterly, cinematic, retro, brutalist, holographic, weathered, surreal —
is **allowed and encouraged**. Nothing aesthetic is locked.

## 8. STARTER TEMPLATE LIBRARY (ship these; expand on demand)
Not 230 filler lines — a strong, on-brand starter set. Each is an allowlist entry:
`{ id, label, headline, subTemplate, promptDesc }`. `{id}`/`{civ}`/`{name}` interpolate.

**Transmissions (FREELONS lane):**
1. `signal-detected` — "SIGNAL DETECTED" / "Citizen {id} has entered the city."
2. `first-signal` — "FIRST SIGNAL LOGGED" / "Citizen {id} has spoken for the first time."
3. `district-bleeding` — "DISTRICT 7 IS BLEEDING SIGNAL" / "Warning logged by Citizen {id}."
4. `face-not-found` — "404 · FACE NOT FOUND" / "Identity record recovered."
5. `signal-repair` — "SIGNAL REPAIR ORDER" / "Citizen {id} dispatched to the {civ} sector."

**Posters / propaganda (restrained dark-gold, monumental):**
6. `restore-the-signal` — "RESTORE THE SIGNAL"
7. `the-city-remembers` — "THE CITY REMEMBERS"
8. `evidence` — "EVERY CITIZEN LEAVES EVIDENCE"
9. `hex-missing` — "THE HEX WENT MISSING"

**ID / status (the "I own one" flex):**
10. `id-card` — "FREELON CITY ID · Citizen {id} · {civ} · Active"
11. `resume` — "Citizen {id} · Records: {n} · Known for: {role} · Rank: {rank}"
12. `district-assignment` — "Citizen {id} assigned to: {district}"
13. `featured` — "FEATURED IN THE CITY ARCHIVE · Top Transmission of the Week"

**Prompt skeleton (a STARTING point, vary it hard):**
> "A cinematic, dramatic {TYPE} for FREELON CITY. {LOOK} featuring a hooded faceted citizen with a
> single hex eye-glow as the focal figure. {CIV-MOOD} palette. Premium collectible key-art, text
> area reserved top and bottom, scroll-stopping composition, dramatic lighting. Designed as a
> shareable X image."
>
> Where **{LOOK}** rotates across a wide bank, e.g.: *lifted-black + aged-gold archive broadcast* ·
> *rain-soaked neon district at night* · *weathered wartime propaganda print* · *holographic ID
> terminal* · *brutalist monument under storm light* · *painterly memory-shard surrealism* ·
> *retro CRT archive scan* · *funereal gold-on-black tomb* · *biological green creature-scan* ·
> *corrupted red emergency screen*. Variety is the goal — no two templates should feel the same.

Expansion is WANTED here (this is the one place breadth = value). Want 20 more cinematic poster
looks, or 30 OOGIE sighting variants? Ask and I'll generate them — a big, varied bank is the
product, not bloat.

## 9. Collection-specific modifiers (§11 detail)
Each collection swaps the headline vocabulary + a visual modifier on the §8 skeleton:
- **FREELONS** — city workers / signal builders. Tone: official, active. Modifier: clean archive terminal.
- **The Crypt** — dead signals / tomb records. Headline: "DEAD SIGNAL RECOVERED". Modifier: black archive chamber, gold memorial glyph, faint skull-like signal silhouette (no gore).
- **OOGIES** — mutation / creature sightings / chaos. Headline: "UNREGISTERED LIFEFORM DETECTED". Modifier: muted-green biological signal glow, security-scan framing, creature half in shadow (no cartoon/gore).
- **Emile** — memory / emotional fragments. Headline: "MEMORY FRAGMENT". Modifier: floating glass memory shard, soft gold light, cinematic loneliness, handwritten-note area.
- **SMILES** — collapse / corruption / warnings. Headline: "COLLAPSE WARNING". Modifier: muted-red corruption glow, fracturing luxury district, emergency-broadcast layout (restrained, no cheap horror).
- **Crypt TCG** — combat / battle records ONLY (not the centre). Headline: "BATTLE RECORD". Modifier: commander relic, combat-archive stamp. Keep it a side lane.

## 10. X caption templates (auto, copy-button)
- "My citizen just logged its first signal. ⬡ Citizen {id}"
- "My OOGIE is officially a city problem. {id}"
- "Asked my SMILES what part of the city fails first. It answered. ⬡"
- "The Crypt remembers what the city forgot. #{id}"
- "Emile doesn't make warnings. It makes memories. ⬡"
- **Copy-safety (locked):** NO financial/return/"value will increase" language; no "investment". Status + lore only. Run any new caption past `docs/COPY_LEGAL_CHECKLIST.md` wording bans.

## 11. City Archive rules
- Public feed of creations (reuse `/transmissions`). Tabs: Latest · Featured · by Collection.
- **Featured** = weekly editorial/algorithmic pick → drives "chase being featured" competition + the §8.13 "FEATURED" card.
- Public feed shows the image + headline + token stamp (proof). Raw owner input never shown (HISTORY_VISIBILITY_POLICY).

## 12. Citizen record rules
- Every creation saves to `agent-history` (per-token, survives sale). Public = proof (kind/type/timestamp + the shareable image URL); owner = full.
- Increments the citizen's "Records Logged" counter (feeds the résumé card §8.11).

## 13. MVP — build only these 5 (forget the other 45)
1. **Transmission Creator** — type picker + allowlisted templates + generate + Save + Share. (Extends the agent render path.)
2. **Poster Creator** — the §8 poster/propaganda set.
3. **Citizen Résumé Card** — status card from existing progression data (records/role/rank/featured). Mostly an OG route — cheapest, highest flex-per-effort. **Build first.**
4. **City Archive Feed** — surface creations (extend `/transmissions`).
5. **X Share Kit** — every creation → image + caption + copy + Share-to-X + "created by Citizen #" stamp (extend `lib/share.ts`).

**Smallest-first order:** Résumé Card (#3, pure OG route, no new gen cost) → X Share Kit (#5, reuse share.ts) → Transmission Creator (#1) → Poster Creator (#2) → Archive Feed (#4).

## 14. Verification screenshots needed (per build)
- Résumé card OG render at 1200×630 — on-brand (lifted-black/aged-gold), real data, readable.
- Transmission/poster: mobile preview + the actual X-intent caption.
- Archive feed: latest + featured tabs render, token stamps correct, no raw owner input leaked.
- Share-to-X: caption has no banned (financial) wording.
- No new HEX faucet introduced (generation uses the existing costed render path).

## 15. Guardrails (do not violate)
- Allowlist-keyed templates only (no free-text client prompts) — but make the allowlist BIG/varied.
- Reuse the existing image/video/OG/share infra — don't fork a parallel engine.
- No new HEX faucet; generation rides the existing costed mission path + budget guard.
- Copy-safety: no financial claims, ever (legal — non-negotiable).
- Keep Crypt TCG a side lane, not the centre.
- **Aesthetics are NOT locked** — cinematic, cool, wide variety is the goal. The only limits are §7 (safety/legal).

---

## Scope note
This doc is the SYSTEM + reuse map + build order + a starter library. The starter set is small on
purpose (so we ship the flow first), but **variety/breadth IS the value** for this engine — once the
flow is live, expanding the template bank wide (many cinematic looks per collection) is exactly
right, not filler. Build the 5 MVP pieces (§13), then grow the look-bank aggressively.

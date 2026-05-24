# Shop expansion spec — hoods, Mars houses, citizen upgrades

**Status:** DRAFT, not built. Sketch for review before any code lands.
Founder asked for "hoods that change → citizen gets rarer → buys
houses on Mars → more cool shit in the shop, hard to reach because
people have already bought stuff."

This doc captures the *what* + the *risk*. Decisions still open.

---

## North star

Make the shop a multi-tier ladder where:
1. Common holders can already afford floor items today (existing shop)
2. New mid-tier items reward sustained engagement (a few weeks of holding + claiming)
3. New top-tier items are scarce, prestigious, and aspirational
4. Crucially: **owning a top item also upgrades the citizen's visible identity** (hood change, halo, etc.) — not just a cosmetic on the wallet page

The "city accepts you" tier ladder (just shipped) is the natural
spine. Shop tier ⇄ acceptance tier mapping.

---

## What gets added

### 1. HOOD VARIANTS (modifies the citizen's hex_state / aura visually)

A hood variant is a new value for the citizen's `aura` or new
`hex_state` slot. **NOT a new trait dimension** — it overlays the
existing one so we don't blow up the rarity computation.

Example variants (provisional):
- `aura: "Architect's Light"` — only carriers who burned 5000⬡
- `aura: "Sealed Bracket"` — only one-of-one carriers
- `hex_state: "Resonant"` — sale ≥ 3× floor + 90-day hold

Cost ladder (cap visualised, not final):

| Variant | Hex cost | Acceptance tier required |
|---|---|---|
| Wovenhood | 1,000 ⬡ | CARRIER (350+) |
| Lit visor | 2,500 ⬡ | VERIFIED (500+) |
| Architect's Light | 5,000 ⬡ | DOCTRINE (700+) |
| Sealed Bracket | 10,000 ⬡ | MONOLITH (850+) |

### 2. MARS HOUSES (wallet-level claims, not per-citizen)

The wallet gets a "house" claim — a one-of-N geographic plot on a
Mars surface map. Lore: the city decided you may build there.

- 4040 plots total (matches citizen count — one per max)
- Plots minted to wallet, not to a specific citizen
- Higher value plots near canonical city landmarks (the four 1/1s'
  shrines, the bracket entrances, the Final Signal monolith)

Cost: ~25,000⬡ for any plot, with the architect curating which plots
are released when. **NOT a fair-launch open mint** — released in
small waves so the early waves stay scarce.

### 3. CITIZEN UPGRADE PATH

Stackable, paid per-citizen, gated by acceptance tier:

| Upgrade | Cost | Effect |
|---|---|---|
| Civ paint | 500 ⬡ | Subtle border glow in citizen color |
| Hood swap | 1,000 ⬡ | Replace default hood with variant |
| Civic mark | 2,500 ⬡ | Permanent stamp on the citizen's OG card |
| Throne seat | 10,000 ⬡ | Citizen appears in the City Throne row on /civilizations/{slug} |

---

## RISKS · honest

### 1. Existing shop buyers will feel obsolete

People already bought patches / posters / etc. If a new tier
dominates their existing buys, they'll feel ripped off. **MUST
grandfather them somehow**: 
- Existing buys get a "first wave" badge
- OR existing buys grant a +N⬡ discount on the upgrade ladder
- OR an early-buyer airdrop of one upgrade

### 2. Hex economy not balanced for this scale

Current sinks: name (~50⬡), realign (~250⬡), transmission (~100⬡),
boost (~50-500⬡), tithe (~100⬡), shop items (~50-500⬡).
Adding 1k-10k items will only work if hex earning scales OR if these
items are deliberately rare and slow.

Risk: a holder with one citizen who claims 10⬡/day takes **250+ days**
to hit a 2500⬡ item. Either too slow (boring), or so slow that only
existing whales benefit (concentration risk).

**Don't ship until an econ pro models this.**

### 3. Visual variants need actual art

Hood swap = new image variant per citizen × per hood. With 4040
citizens × even 4 hood variants = 16,160 new images. Either:
- Render on-demand via the existing pipeline (cheap, slower per-page)
- Pre-bake (expensive disk/IPFS, fast renders)

Cheapest first build: SVG overlays on the existing PNG, generated
at OG-image time. Looks good, no IPFS cost.

### 4. Mars houses = land game

Land games are notoriously fraught. People will:
- Try to flip plots
- Demand secondary market support
- Want to "see" their plot on a map
- Lawyer-up if the map changes

If we ship this, the map is **canonically immutable** post-launch
and there's NO secondary market — the city assigned you the plot.

---

## What I recommend

**Phase 1 (next):** ship 2-3 hood-variant unlocks at the CARRIER /
VERIFIED tiers. Cheap art (SVG overlay), 1000-2500⬡ price, no
grandfather problem because they don't compete with anything
existing.

**Phase 2 (after econ pro):** the Mars house map.

**Phase 3 (after Phase 1 traction):** DOCTRINE / MONOLITH tier
exclusive items (real art, real scarcity).

Hold off on building until:
1. Hex earning rate is modeled against the proposed sinks
2. We decide grandfather rule for current shop buyers
3. Variant art direction approved (Billy)

---

## Open questions for founder

1. Do hood variants modify the actual on-chain image, or just the
   site's display of it? On-chain = permanent, expensive. Site-only
   = cheap, reversible. Recommend: site-only for v1, with on-chain
   image-pointer migration only for the top tier (MONOLITH).
2. Are Mars houses worth the land-game risk, or do we ship the
   variants and skip houses?
3. What's the grandfather rule for current shop buyers?

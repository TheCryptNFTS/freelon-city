# FREELON CITY — Citizen Identity Engine

> **Every NFT is a citizen of FREELON CITY.**
> **Every citizen creates differently.**
> **Every creation builds the city.**

The world is **FREELON CITY**. Every NFT across the ecosystem is a **citizen** of the
city. **FREELONS is one citizen collection among several — not the world.** Each
collection is a *different kind of city being* with its own voice.

| Collection | Citizen type | District | First-use ceremony |
|---|---|---|---|
| FREELONS | Signal Citizen / Dust Runner / Architect / … (by caste) | 10 doctrine-districts | First Signal Logged |
| The Crypt | Dead Signal | The Dead Archive | Dead Signal Recovered |
| OOGIES | Unregistered Lifeform | The Mutation Zone | Lifeform Detected |
| Emile | Memory Fragment | The Memory Chapel | Memory Fragment Found |
| Smiles | Collapse Signal | The Collapse Sector | Collapse Warning Issued |
| Crypt TCG | Combat Record | The Combat Pit | Battle Record Logged |

## What it does

`dossier(collection, tokenId, realTraits)` turns any token into a **stable, bespoke
identity** built from its **real on-chain traits**:

```
type · city role · district · first signal · known for · status · records · serial · accent
```

It is **deterministic** — the same token always resolves to the same dossier (an NFT
requirement). No randomness at read time. The `?id=` reply mechanic returns the same
card every time a holder asks.

## Why it isn't slop

Hand-writing 4,040+ lines produces generic filler. Instead, every first signal is a
**three-part composition** — `lead · pivot · tag` — where each part is pulled from a
**curated, voice-specific pool** by a hash of the token id, and the lead carries the
doctrine/collection voice. The role, district, status and serial are read straight from
real traits. Result: lines that are grounded, on-voice, and individuated.

**First-signal uniqueness (measured):**

| Collection | Tokens | Unique signals |
|---|---|---|
| FREELONS | 4,040 | **3,619 (≈90%)** |
| The Crypt | 5,244 | 576 |
| OOGIES | 2,279 | 567 |
| Emile | 3,333 | 573 |
| Smiles | 313 | 240 |
| Crypt TCG | 4,129 | 576 |

FREELON (the live hero) is near-unique. The other collections sit at their pool cap and
are raised simply by adding pool lines in `citizen-engine.js` (leads × pivots × tags) —
no structural change. The **full dossier** (role from 50 sub-archetypes, district,
status, records, serial, portrait) is individuated per token regardless.

## Districts

FREELON citizens distribute across ten doctrine-districts; every other collection lives
in its signature district. So a holder can say *"my citizen belongs to the Void Gate."*

```
Synthesis → Signal Core      Oracle → Oracle Tower     Transmission → The Broadcast
Corruption → Collapse Sector Growth → The Overgrowth    Luxury → Luxury Quarter
Fracture → The Fracture      Sovereignty → Sovereign Quarter
Void/404 → The Void Gate     Machine → Machine Yard
+ Dead Archive · Mutation Zone · Memory Chapel · Combat Pit (sister collections)
```

## Where it lives

- **Engine:** `public/transmit/citizen-engine.js` — pure, dependency-free, runs in browser
  (`window.CitizenEngine`) and node (`module.exports`).
- **Demo object / card:** `public/transmit/index.html` — paste collection + token ID →
  cinematic dossier card (canvas), download PNG, auto-written X caption. A standalone URL
  (`/transmit/`), **not** in site nav.
- **Data:** `citizens.min.json` (FREELON, real traits) + `coll-<key>.min.json` (sister
  collections: id → real portrait URL + role trait), trimmed from `data/`.

## Portraits

- FREELON: figurative reveal form on IPFS (CORS-open → canvas export clean).
- Sister collections: real OpenSea CDN art, routed through a CORS-clean image proxy
  (`wsrv.nl`) so PNG export doesn't taint. **Production:** swap the proxy for an
  owned `/api/img` route.
- Emile is 100% video → graceful "Motion Archive" hex-sigil placeholder.

## Extending

- **More uniqueness:** add lines to the lead/pivot/tag pools per collection.
- **New collection:** add an entry to `COLLECTIONS` (type, district, accent, ceremony,
  leads/pivots/tags) + a `coll-<key>.min.json`.
- **Wire into the live site:** the same engine can power citizen pages, the City Archive,
  share cards, and weekly recaps — one identity layer, many surfaces.

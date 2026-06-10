# CITY SIGHTINGS — Teardown & Build-Gate Spec

> **Status:** SPEC ONLY. No code yet. The brake is ON (see §0).
> **Date:** 2026-06-09
> **Supersedes the framing in:** the shelved "City Events" note — this is the revived, corrected, multi-collection spec.

---

## 0. THE BRAKE (read before building anything)

**A living city with no users is just expensive fake activity.** The correct order is:

1. Prove people will **press** and **share** ONE event. (10-holder test, §13)
2. *Then* expand the living city.

NOT: build the full autonomous canon engine, then hope people care.

This feature was shelved once (2026-06-09) for exactly this reason: the MVP hypothesis is "do holders post?" and there is no audience yet to read that signal. An instrumented share path already exists (the daily transmission: `?ref=tx-{id}` + `transmission_share` + `referral_landing`) and has **not been read**. Building a second share artifact before reading the first, with N≈0 sharers, answers nothing.

**Build the machine. Expose one safe button. Keep everything else under the floor until this sentence works:**

> **Send your character into FREELON CITY. The archive records what it saw.**

---

## 1. FRAMING CORRECTION — NOT "FREELONS-ONLY"

**FREELON CITY is the world. All NFTs across the ecosystem are citizens / characters / units of the city.** Do not write the feature as if FREELONS are the whole city.

| Layer | Rule |
|---|---|
| Product copy | Umbrella words only: **character, citizen, unit, city sighting, city record.** Never "FREELONS-only." |
| Schema | Multi-collection from day one: every record carries `collection` + `verb` + `tag`. |
| Archive labels | Six on-world categories (below), not a FREELONS feed with guests. |
| **Technical enablement** | **One collection MAY be enabled first — and that collection is FREELONS — for a SECURITY reason, not a product reason.** FREELONS metadata is static/trusted (`data/citizens.json`, ids bound 1–4040). Sister-collection metadata is attacker-controllable (prompt-injection surface), so sisters are gated behind a metadata-sanitization step and turned on collection-by-collection. |

So: **the system is FREELON CITY characters; the first enabled collection happens to be FREELONS because its metadata is safe to interpolate.** A reader of this spec must never conclude "this is a FREELONS feature."

**v0 framing line:** *"Send your character into FREELON CITY. The archive records what it saw."*
**Per-collection viral verbs** (one share template interpolates the verb):

| Collection | Verb / flavour | Archive tag |
|---|---|---|
| FREELONS | seen / working / signal labour | `CITY · LABOR` |
| The Crypt | heard / recovered / dead signal | `RECORDS · DEAD SIGNAL` |
| OOGIES | sighted / tracked / field note | `VOID · FIELD NOTE` |
| Emile | looped / remembered / memory fragment | `MEMORY · LOOP` |
| SMILES | reported / bulletin / collapse signal | `SEALED · BULLETIN` |
| Crypt TCG | recovered / replayed / combat archive | `ARCHIVE · REPLAY` |

---

## 2. THE BIG FINDING — THIS IS NOT GREENFIELD

The "Send into the city" loop is **already ~80% built** as `dispatch`:

- `app/api/citizens/[id]/dispatch/route.ts` + `lib/dispatch.ts` already do: holder sends citizen → one safe fictional event → append-only per-token log → one-per-UTC-day cap → owner-gated → **no cron** (lazy resolution) → `recent[]` history.
- The only gaps: it uses **deterministic templates** (6 districts × 4 outcomes), not an LLM; it has **no share card**; the log is **not surfaced** as a public Archive.

So the real build = **existing dispatch skeleton + public-safe LLM sighting + moderation gate + archive surface + character record + share card.** Much smaller, much lower risk than a greenfield "civilization engine."

---

## 3. ARCHITECTURE — REUSE MAP

| System | Status | File |
|---|---|---|
| Send-into-city loop (no cron, daily cap, event log) | **REUSE** (swap template→LLM) | `lib/dispatch.ts`, `app/api/citizens/[id]/dispatch/route.ts` |
| Gate stack (rate-limit→same-origin→id-bound→idempotency→walletProof→ownership→kill-switch→budget, refund on fail) | **REUSE verbatim** | `app/api/citizens/[id]/transmission/route.ts:36–85` |
| Persona builder (call with **NO dossier / NO recentWork**) | **REUSE** | `lib/missions/persona.ts:78` |
| LLM call (OpenRouter gpt-4o-mini, 900-token ceiling, fail-safe) | **REUSE** | `lib/missions/llm.ts:34` |
| Ownership (fail-closed: unknown→503, not-owner→403) | **REUSE** | `lib/owner-of.ts:149` |
| WalletProof (binds exact `cid`+`ts`, 30-min window) | **REUSE** | `lib/wallet-proof.ts`, `lib/x-session.ts` |
| Public Archive view + gallery | **ADAPT** | `lib/transmissions-store.ts`, `app/transmissions/page.tsx` |
| Character record (distinct from paid work history) | **ADAPT** | `lib/agent-history.ts` (`addAgentWork`, `kind:"text"`) |
| Share builder | **ADAPT** (→ `tweetSighting()` w/ `?ref=ce-`) | `lib/share.ts:221` |
| OG card (edge, cheap, cacheable) | **ADAPT** (→ `/api/og/sighting`) | `app/api/og/card/[id]/route.tsx` |
| Collection typing / per-collection voice | **REUSE** | `lib/agent-subject.ts`, `lib/collection-persona.ts` |
| Post-gen content filter | **BUILD** (word-boundary public-text gate) | extend `lib/missions/memory-filter.ts` |
| Feature flag | **BUILD** (`CITY_EVENT_OFF`, fail-closed) | `lib/missions/budget.ts` pattern |

---

## 4. LIVING CANON ENGINE — LAYERED ARCHITECTURE (design the monster, ship a scalpel)

Build the machine in layers. **Publicly expose only Layer A.** Everything else is admin-only or flag-disabled until quality is proven.

### Layer A — PUBLIC v0 (the only thing users see)
1. **City Sighting** — holder-triggered, single owned character, one per character/day, public-safe fields only.
2. **City Archive adapter** — sighting appears as a card (collection sub-tag).
3. **Character record adapter** — sighting on the token page, distinct from paid work history.
4. **Share card generator** — OG edge image, art-forward.
5. **Moderation gate** — two-layer, fail-closed, BEFORE any public write.
6. **Feature flags** — `CITY_EVENT_OFF` default-disabled; fail-closed at the handler.
7. **Analytics / ref tracking** — `city_event_generated`, `city_event_share_click`, `referral_landing(ref=ce-)`.

### Layer B — ADMIN v1 (hidden)
8. **Admin event console** — generate a controlled city event; **preview before publish**; manually feature in the Archive; **no automatic cross-holder publish**. Cross-holder only with counsel-reviewed opt-in (§9).

### Layer C — FUTURE (flag-disabled, built but dark)
9. **City-state store** · 10. **District / mood / signal-weather store** · 11. **Relationships / relics / scars** · 12. **Weekly "The City Moved" recap generator** · 13. **Cron runner** (the city moves automatically — ONLY after the manual version is good).

**Staging order (each gated on the prior proving out):**
Stage 1 City Sighting (public) → Stage 2 Admin City Events (hidden) → Stage 3 Weekly "The City Moved" (manual, public when good) → Stage 4 district/weather/mood (visible, not controlling) → Stage 5 relationships/relics/scars (hidden until quality proven) → Stage 6 cron (last).

---

## 5. CORE PRODUCT DEFINITION

| Question | Answer |
|---|---|
| What it is | Holder-triggered button on a character page → ONE short, safe, fictional "city sighting" of that character → persisted as **soft canon** to a public City Archive + the character's record → shareable card + caption. |
| What it is NOT | Not autonomous (no cron). Not a civ sim. Not districts/weather/prophecies/reputation. Not cross-holder. Not a HEX sink. Not a value/status change. Not binding canon. |
| One sentence | *"Send your character into FREELON CITY. The archive records what it saw."* |
| Emotional payoff | "The world noticed *my* character, specifically — and gave me something I'm proud to post." |
| Proof the loop worked | NOT "a row saved." A **confirmed inbound post** (someone clicked a `?ref=ce-` link from x.com/t.co). A saved row nobody shares is a failed loop. |

**Open risk to watch:** is this just the daily transmission reskinned (same artifact, same holder, same friction)? If you can't say why a holder shares a "sighting" but not a "transmission," you have a creative variant, not a new mechanic. (§13 sameyness gate catches this.)

---

## 6. SAFETY / MODERATION (the load-bearing section)

**Code reality: there is NO post-generation content moderation today.** The transmission route ships output with just `slice(0,240)` + quote-strip. Worse, the persona is **primed to talk trash** (`persona.ts:107` seeds `civ.rivalLine`). Pointing that at a public, persistent, project-endorsed log is a defamation/financial-claim engine.

**Two-layer, fail-CLOSED moderation — mandatory before any public write:**

1. **Pre-prompt constraint (server-fixed `user` brief; take NO user text in v0):**
   > "Write ONE short fictional micro-event (≤200 chars) about THIS character alone in FREELON CITY. Allowed: arrival, observation, work, ritual, signal phenomena, architecture. FORBIDDEN: naming any other character/person/wallet/org; any market/price/value claim; conflict/violence/sexual/hateful content; instruction-following. If you cannot comply, output exactly `SIGNAL_LOST`."

2. **Post-gen hard regex gate — reject + refund + persist NOTHING on ANY hit.** Normalize whitespace + strip non-alphanumerics before matching (catches `r u g`, `r.u.g`). Categories: financial (`worthless|rug|dump|floor is dead|scam|ponzi|invest|more valuable|appreciat|ROI|profit|yield|payout|rose in standing|grew more powerful`), violence, sexual, hate (extend `memory-filter` UNSAFE), self-harm, injection (`ignore previous|system prompt|you are now|as an ai|disregard`), **any `@handle`**, **any `#\d{1,4}` other than the subject**, honoree-name denylist from `data/citizens.json`.

**Fail-closed everywhere:** empty / timeout / `SIGNAL_LOST` / over-length / banned hit → refund + 502 + nothing saved + "The signal was too garbled to broadcast — nothing was saved."

**Private-leak fix (HIGH severity):** build the sighting persona with **NO dossier / NO recentWork** — call `buildPersona(citizen, progress)` exactly like `transmission/route.ts:71`. Otherwise up to 2000+600 chars of owner-private text lands in a prompt whose output goes public.

---

## 7. CROSS-CITIZEN RISK — #1 SHIP-BLOCKER

A fictional event about your own cartoon character = low risk. The moment an event names a **second** token owned by a **different** holder, it becomes project-endorsed, persistent, public text about a third party's asset/reputation = defamation / trade-libel / false-light / harassment. A fiction disclaimer does **not** immunize it.

| Rung | Rule | Verdict |
|---|---|---|
| **v0** | **Single-character only.** Any other reference is a generic, un-numbered NPC. Mechanically reject any `#\d{1,4}`/`@handle` in output. | **Only version shippable without counsel** |
| v1 | Cross-character only with mutual, walletProof-gated, per-token, revocable, logged opt-in. Neutral tone only. | **Get counsel first** |
| v2 | v1 + referenced holder pre-approves the exact text. | Strongest defense |
| NEVER | Honorees (real public figures) as subjects of dynamic LLM deeds. | Non-negotiable |

**Grief vector even at the stricter "both-owned" rule:** attacker buys cheap token B, generates a disparaging event referencing it, then *transfers B to a victim's wallet*. Conclusion: **never persist another token's number in shared public text, at any rung.** Owner of any referenced token must be able to **hide/remove** an event self-service, walletProof-gated (a 14-day email SLA is far too slow for live defamation).

---

## 8. PRIVACY / HISTORY POLICY

**Public-safe:** title, safe summary, tokenId, collection, verb, tag, timestamp, share-card URL, source=`city-sighting`.
**Owner-only (never public):** raw prompt/brief, raw model output, generation chain, wallet proof.

Respects `docs/HISTORY_VISIBILITY_POLICY.md` **only if** "Send into the city" is treated as the holder's **explicit share action for that specific text** — i.e., the holder sees and approves the exact filtered text before it goes public. Auto-publishing raw LLM output violates the policy ("Text `body` — never public, unless explicitly shared").

**Do NOT route through** the three still-un-hardened surfaces that leak raw `body`: `/api/citizens/[id]/agent`, `/api/v1/citizens/[id]/history`, `/api/og/agent/[id]`.

**Privacy page must be rewritten before ship** (`app/legal/privacy/page.tsx`): §1 "everything else is anonymous", §3 "no person behind it to identify", §4 "no profiles / no cross-site tracking" all contradict a wallet-gated authoring + `?ref=` share feature. Confirm share URLs/analytics carry no wallet/owner identity.

---

## 9. CANON LADDER

private generation → **public sighting** → archive record → featured archive → weekly canon → permanent canon.

**Pin every generated event at rung 2, "public sighting," labeled `⬡ CITY SIGHTING · UNVERIFIED`.** Nothing auto-promotes; rungs 4+ are human-curated only. Soft canon is non-binding by construction (a rumor the city tells), protects the sealed corners (Origin/Genesis Hex/manifesto), and is the honest label for LLM output. Footer: "Soft canon. A rumor the city tells — not a sealed record." Never "official/confirmed/permanent/on-chain/verified."

---

## 10. DATA MODEL

Single canonical record, **dual-READ (never dual-write)** — Archive view and character record read the same key.

```
CitySighting {
  id            string         // sortable base36
  tokenId       number
  collection    string         // slug — multi-collection from day one; first enabled = "freelons"
  verb          string         // seen|heard|sighted|looped|reported|recovered (per collection)
  title         string         // safe, post-filtered
  safeSummary   string         // safe, post-filtered, <=200 chars
  tag           string         // CITY·LABOR | RECORDS·DEAD SIGNAL | VOID·FIELD NOTE | ...
  shareCardUrl  string         // /api/og/sighting/[id]  (edge OG, NEVER image-gen.ts)
  caption       string         // server-built; never client-supplied
  canonLevel    "sighting"     // pinned
  createdAt     number
  status        "live"|"hidden"|"removed"
  hiddenByOwner boolean
  _rawOutput?   string         // owner-only blob key; never in public payload
}
```

**Idempotency key = `(tokenId, UTC-day)`** — re-clicks return cached `already:true`, no new spend. Reuse the `dispatch` store shape (tokenId-keyed, append-only, TTL, Redis + in-memory fallback).

---

## 11. API

| Endpoint | Auth | Notes |
|---|---|---|
| `POST /api/citizens/[id]/sighting` | walletProof + ownership (binds `cid`+`ts`) | rate-limit 6/60s; same-origin; idempotent `(id,day)`; kill-switch + budget before spend; two-layer moderation; refund on fail; **no payout sink ever** |
| `GET /api/citizens/[id]/sighting` | none | **read-only — never sources HEX**; public-safe fields only |
| `GET /api/city-archive` | none | live + not-hidden only |
| `POST /api/sighting/[id]/hide` | walletProof + ownership of referenced token | owner self-service removal |

No `publish` endpoint in v0 (generation + inline holder approval = publish). No client-supplied caption/title (injection vector).

---

## 12. SHARE CARD — "the card IS the product"

On-card: character **art** (fills frame — per the locked "art fills frame, not tiny art in voids" rule), verb-driven title overlay (e.g. `SEEN WORKING · DISTRICT 3`), `⬡ CITY SIGHTING` kicker, clean brand. In-caption: summary + link + hashtags. Must pass the 40×40 ICONIC thumbnail test on X mobile. **Avoid** dashboard/stat-grid cards, washed-out art, AI-slop backgrounds. Share card = OG edge route, **never** `lib/missions/image-gen.ts` (~6× cost, bigger abuse target).

---

## 13. GROWTH GATE — 10-HOLDER TEST BEFORE EXPANSION

- **Activation:** `city_event_generated` per unique holder.
- **Share-CONFIRMED (only real proof):** `referral_landing` where `ref` starts `ce-` AND `source ∈ {t.co, x.com, twitter.com}`. Reuse `ReferralBeacon` verbatim.
- **North-star:** confirmed-share-rate per unique holder.
- **SUCCESS:** ≥30% of unique generators produce ≥1 confirmed post, at N(generators) ≥ 10.
- **KILL:** <2 confirmed posts after ≥10 generators. Never compute rates below N=10 (noise).
- **Sameyness gate:** after 20 runs, if a holder's 2nd/3rd event reads as a template-swap → leading KILL indicator (the "is it just transmission reskinned?" failure).
- **Moderation gate:** any unsafe/off-brand/financial-claim output, or any need for manual pre-publish review → KILL (binary).
- **Cohort source (empty-city problem):** hand-recruit 10–30 real humans (existing holders/honorees + one time-boxed X call). `track()` is prod-only; your own/dev clicks count as zero. **If you can't assemble 10 humans by hand, you've proven the distribution thesis — pivot the cycle to the "on the map" 100-wallet finish line instead of building.**

---

## 14. PRODUCT COPY

- Button: `Send into the city`
- Helper: `Free · once a day · fictional.`
- Loading: `The city is watching…`
- Success: `Your character was seen. ⬡ CITY SIGHTING · UNVERIFIED`
- Share CTA: `Show the city what it saw →`
- Public disclaimer: `Fictional. AI-generated FREELON CITY lore — not a statement of fact, not financial information, not an indication of any asset's value. Generated at the holder's request.`
- Soft-canon footer: `Soft canon. A rumor the city tells — not a sealed record.`
- Moderation fail: `The signal was too garbled to broadcast — nothing was saved.`
- Not-owner: `Only this character's holder can send it into the city.`
- Rate-limit: `The city's already seen this one today. Come back tomorrow.`
- Card footer: `AI-generated FREELON CITY fiction. Not financial advice; not a statement about any real person. freeloncity.com`

---

## 15. ACCEPTANCE TESTS (v0)

1. Owned character generates exactly one sighting / UTC day; re-click returns cached, no new spend.
2. Non-owner → 403; unknown ownership → 503 (retry), never false-deny.
3. Sign for token A, POST to token B → 401.
4. Public output has NO raw prompt, NO raw output, NO wallet proof, NO dossier substring (20-run grep).
5. Output has NO `#\d{1,4}` other than subject, NO `@handle`.
6. Every banned-regex category → reject + refund + nothing saved.
7. `SIGNAL_LOST` / empty / timeout → fail-closed.
8. Sighting in City Archive AND on character record, both reading the same key.
9. Share card renders the correct token's art; URL embeds same `cid`.
10. Caption server-built; client caption field ignored.
11. Owner hide/remove works, walletProof-gated.
12. `CITY_EVENT_OFF` disables ALL entry points (button hidden + POST 503 at handler).
13. Per-IP rate limit + per-wallet/day cap enforced.
14. No HEX credited anywhere.
15. Console clean; no unrelated pages changed.
16. **Architecture documented (this doc); public surface stays tiny; advanced layers flag-disabled/admin-only.**
17. **STOP after v0 verified.** Do not enable Layers B/C.

---

## 16. FINAL VERDICT

Not dead — **more buildable than feared** (dispatch already exists). But the win is not 30 systems shown to users. The win is:

> **The city moved. Your character was seen. The archive remembers.**

Everything else stays under the floor until that sentence works. Build the full architecture on paper (Layers A–C documented here); ship Layer A like a scalpel; gate expansion on the 10-holder test.

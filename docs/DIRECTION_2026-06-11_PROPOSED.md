# THE DECISION v2 — amended after red team
**Status: PROPOSED (v2). v1 ("SIGNAL WAR" convergence) was red-teamed by 5 hostile adversaries + chief-of-staff synthesis on 2026-06-11 and is SUPERSEDED — two fatal blows landed and the convergence thesis was killed. This is the amended decision. Executes on Billy's acceptance.**

---

## What the red team proved about v1 (kept here so we never re-litigate)
1. **FATAL — the gate was theater.** The game emits zero analytics (NoopAnalyticsSink, no VITE_ANALYTICS_URL, RemoteSink is a stub); the city side is aggregate-only. "25 wallets / D7>20%" could not be measured by anything wired. A gate you can't read is a permission slip, not a gate.
2. **FATAL — "wire the built pipeline" was optimism about dead code.** fetchOwnedCardTokenIds has zero call sites; /match mounts with no props (nobody has EVER played their own cards); buildOwnedDeck **silently falls back to the demo deck for wallets under 30 playable cards** — most real holders would connect and silently NOT get their cards. The headline feature would have failed its own audience on day one.
3. **FATAL (compound) — convergence is supply-side building for a demand problem.** It adds three new systems to explain, violating the #1 lock (reduce complexity), and ignores the audit's own written kill condition: *"if you can't assemble 10 humans by hand, you've proven the distribution thesis — pivot."*
4. **Embassy commanders: killed by three independent adversaries.** OOGIES lives on ape_chain (the mainnet-only reader returns null — detection impossible today); injecting ~50 costed cards contradicts the balance freeze; holding-granted value on a public ?addr= GET is a sybil grant-oracle and edges the investment-contract framing.
5. **Episode pillar as designed: blocked.** LLM in the cron = unmetered burn (zero budget guards exist on any cron path) on a cash-negative product; naming holders without opt-in contradicts the privacy policy ("keyed to the token, not your identity").
6. **Higgsfield subscription: cut.** No new recurring spend before a demand signal. One-time Grok clips (~$0.65) suffice for v1.

## The amended decision (small, honest, measurable)

**The one-line:** prove demand for the one thing holders explicitly asked for — *playing with their own cards* — in one week, instrumented, by hand, before building anything else.

### Step 0 — the Day-0 demand test (FREE, before any code)
Billy DMs the ~10 active holders (incl. Nevarest + daughter): *"Owned-cards play is coming this week — want in?"* 
**If we cannot assemble 10 humans who say yes, we stop building and go pure-distribution** (the audit's own kill condition, now binding).

### Step 1 — measurement before game code (~half day)
`app/api/play-event` append-log on the city + `VITE_ANALYTICS_URL` in the game + two **wallet-keyed** events: `play_started_own_cards`, daily `play_session`. Exclude project/test wallets. Without this, nothing is judgeable.

### Step 2 — the honest slice of Pillar 1 (the only game work)
Wallet-connect on /match → fetch owned crypttradingcards → **play with your deck**. composeDeck already auto-builds a legal 30 — the binder/deck-builder integration is CUT from v1. The silent demo fallback becomes a **loud status line**: "You own N playable cards — 30 needed. Get cards →". Browser-verified at full width for three wallet cases (<30, =30, >600).

### Step 3 — Episode 0 ships as what already exists (06-14)
The deterministic Sunday report + **at most one hand-curated chronicle line that Billy approves before posting**. No LLM in cron, no assembler, no named holders. Tagged `?ref=ep0`.

### Step 4 — one trailer, one push (no subscriptions)
One 30–45s cut on the existing Grok path over existing key art, `?ref=trailer-ep0`. Billy pins it. Free distribution only (pin/reply/post).

### Step 5 — the experiment v1 missed (free, highest ROI)
A/B the demo exhaust wall: on-site reserve/claim intent (`ClaimForm` exists, `reserve_submitted` event exists) vs the current OpenSea handoff. Readable immediately on the path real ETH actually flows through.

### The rewritten gate (per-bet, readable at N≈10)
- **Works:** ≥60% of holders who tap "Play with your cards" complete an owned-deck match.
- **Pull:** ≥6 of the hand-recruited 10 build/play an owned deck within 72h of the Discord announce.
- **Reach:** any `referral_landing` from trailer/episode refs.
- **Story:** ≥3 unprompted episode shares/week on the CHEAP Episode 0 before any enrichment is built.
Hit them → then and only then revisit (in order): binder integration, episode enrichment, embassy concept (re-designed against the sybil/balance/legal findings), PvP/seasons.

### Hard preconditions if traffic ever gets pushed at the economy
Close HEX_ECONOMY_RED_TEAM.md §10 items 1–2 (sweep cap inside the lock; gate the credit-bearing GET) before any push that could bring volume to ⬡ surfaces. The v2 slice doesn't touch the ledger, so this binds only when economy surfaces return.

## What I need from Billy (shrunk from v1)
1. Accept v2 (or amend).
2. **Do the Day-0 DMs** — you're the only one who can recruit by hand. This is the whole thesis test and it's free.
3. One 10-minute full match→results play-through on your phone (still the last unverified handoff).
4. Pin the trailer when handed (no Higgsfield needed for v1; Grok suffices).
5. Approve Episode 0's one curated line before 06-14 18:00 UTC.

## Locks honored (unchanged)
4040 supply/castes/traits · ⬡ off-chain never cashable · no new tokens · payments untouched · multi-collection framing · AWAKEN canon · no fake mechanics · sealed contract sealed · reduce-complexity (v2 adds ZERO new user-facing systems — it makes one promised thing true, loudly).

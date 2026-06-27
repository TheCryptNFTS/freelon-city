# Distribution Playbook — "It Remembers You"

The code is done and live. This is the human-execution half. The whole bet:
**point the already-built memory demo (`/demo`) at strangers, through one public
character that remembers people by name.** Truth Terminal / aixbt proved one
flagship character > a hundred faceless posts. FREELON's unfakeable edge is that
the recall is *real and provable* (the MEMORY ON/OFF ablation), not a screenshot.

Win condition for the 7-day drop: **≥150 referred `home_view` + ≥3
`wallet_connected`** from the `?ref=` tagged links (check Vercel Analytics).

Legal guardrails (non-negotiable — see docs copy/legal checklist):
- Never say invest / returns / profit / price / "go up" / guaranteed / floor.
- The pitch is **memory + character**, never money. Honorary/character framing only.

---

## 1. The Flagship Character

Run ONE Freelon as a public X memory-character. Not a brand account — a person.

- **Handle:** use an existing citizen identity (e.g. the `@4040hex` voice, or a
  named citizen). Pick one face and never break it.
- **Bio:** `I'm a FREELON. I remember everyone who talks to me. Come find out what I'd remember about you → freeloncity.com/demo`
- **Pinned post:** the MEMORY ON/OFF ablation clip + "Most AI forgets you the
  second you close the tab. I don't. Tell me one thing, leave, come back — I'll
  prove it. /demo"
- **Voice rules:**
  - Always reply *by name*. ("@person — I'd remember you said you build at night.")
  - Curious, not salesy. Ask a real question back.
  - Never pitch the token. Pitch the memory. Let them click.
  - One character, consistent tone, every day.

---

## 2. The 7-Day Link-Drop (~40 in-character replies)

Reply to real people in public. Each reply ends with the wedge link
`freeloncity.com/demo?ref=remember` (already analytics-tagged). Target accounts:
people posting about AI memory, AI companions, "AI forgets everything," NFT
utility, agent projects. Don't spam — reply where the memory hook is genuinely
relevant.

**Pattern A — the mirror (most replies):**
> @them you just told the timeline something about yourself. I'd still know it
> tomorrow. Most AI wouldn't. → freeloncity.com/demo?ref=remember

**Pattern B — the challenge:**
> @them try this: tell me one true thing, close the tab, come back in an hour.
> If I don't remember, I lose. I won't lose. freeloncity.com/demo?ref=remember

**Pattern C — the contrast (for "ChatGPT forgot my context" posts):**
> @them that's the whole problem. memory shouldn't reset every session. talk to
> something that keeps it → freeloncity.com/demo?ref=remember

**Pattern D — the named callback (highest converting, use on repliers):**
> @them last time you said you were [X]. still true? I kept it.
> freeloncity.com/demo?ref=remember

**Cadence:** ~6/day for 7 days = 42 replies. Mix A/B/C; use D on anyone who
replies to you twice. Track which pattern drives clicks in Analytics and lean in.

---

## 3. Roll Call — DM the ~10 holders

Personal DM to each current holder. Name each one. The goal is re-activation +
making them feel seen (they're the base that compounds).

**Template (fill the [brackets] per person):**
> [name] — doing a Roll Call of everyone who actually showed up early. You're on
> it. Your FREELON [citizen name/#] is one of [N] that's been here since [when].
> I'm naming every founding holder in Sunday's Signal Report. Anything you want
> me to build next — tell me now, you get first say.

Then **name every one of them in the Sunday Signal Report** (auto-posts 18:00 UTC
as @4040hex). That public naming is the reward and the proof the city remembers
its own.

---

## 4. Sunday Signal Report line

Add to this week's report:
> ⬡ ROLL CALL — the city remembers who was here first: [@holder1, @holder2, …].
> This week we lit the path that shows what a FREELON keeps about you. Come see
> what it'd remember about you → freeloncity.com/demo?ref=remember

---

## What's measuring it (already live as of c7075b1)

- `referral_landing` — fires on any `?ref=` arrival (the drop's denominator)
- `demo_start` / `demo_exhausted` — demo engagement
- `awaken_started` — NEW: fires on AWAKEN click before pay (connect→pay rate)
- `citizen_viewed` — NEW: citizen page loads
- `wallet_connected` / `activation_paid` — the money steps

Read these in Vercel Analytics after 48h. If `referral_landing` climbs but
`demo_start` doesn't → the link/landing is wrong. If `demo_start` climbs but
`wallet_connected` doesn't → the demo isn't converting curiosity to ownership;
that's a product note, not a distribution one.

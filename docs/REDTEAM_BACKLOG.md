# POST-VALIDATION BACKLOG — DO NOT BUILD BEFORE REAL-WALLET TEST

> ## 🔒 HARD GATE — read before touching anything in this file
>
> **No item in this file may be built until ALL of the following are true:**
> 1. Real-wallet activation succeeds (real ETH, real wallet, not local/seeded).
> 2. One paid Red Team job completes end to end.
> 3. The output has been reviewed and judged worth paying for.
> 4. The user flow is confirmed clear (payment → activate → run → record updates).
>
> Until then, **every item below is a hiding place.** The only priority is:
> **Prove one person will pay to activate and run one useful FREELON job.**
>
> Current status: **7/10 built, 0/10 validated.** Not bad. Not failed. *Unvalidated.*

---

## Why this file exists

A long external red-team (2026-06-04) produced a sharp *diagnosis* but a *prescription* that was classic builder-brain bloat — it recommended a pile of new systems on a product with zero paying users, and even re-derived ideas already killed. This file preserves the **genuinely good ideas** from it so they aren't lost, while keeping them behind the gate above so they can't pull focus back into building before demand has spoken.

**The trap it caught (and the rule that beats it):** *Do not mistake a good product map for a build order.*

---

## ✅ Already done (do NOT re-build — it's live)

The red-team recommended these; they already exist. Listed so no one "discovers" them and rebuilds:

- Simplify the front door → FREELONS-first homepage, 6-item nav, lore demoted. **Done.**
- Citizen page = living dashboard not museum label → résumé card leads + dashboard + work-log. **Done.**
- Ship one real agent action (not a promise) → 6 abilities + Dossier + images, smoke-tested. **Done.**
- Public résumé / proof of usefulness → résumé card + `/citizens/[id]/log` + share OG card. **Done.**
- Don't let free users spam expensive AI → free=cheap model, paid=premium, daily $ cap, finite run pool. **Done.**
- Honest copy (no value/snipe/alpha language) → locked in AGENT_MAP.md §6. **Done.**
- Activation fee for AI → unlock model (rarity-priced ETH, premium runs). **Done.**

---

## ❌ Rejected — do NOT build (these would UNDO good decisions)

- **Two-currency model (HEX + "Signal Credits").** Killed deliberately. "Signal" *is* HEX's name — "Signal Credits" collides. We already renamed to **"premium runs."** Re-adding this re-breaks the fix.
- **HEX paying for AI compute (even discounted).** HEX is decoupled / frozen-to-status; ETH activation pays for AI. Mixing them re-introduces currency contamination.
- **Credit packs / job marketplace / premium template packs / résumé export — as monetization surfaces.** Four new paid surfaces before a single paying user. Premature by definition.
- **Skill tree / holder-dashboard build-out / six new skills / "Phase 1–5" plan.** All pre-validation feature surface. The red-team's own conclusion: "built too much product before finding the demand sentence" — then prescribed more product.

---

## 🟡 KEEP — post-validation backlog (build ONLY after the gate passes)

Genuinely good, but every one waits for the real-wallet test:

1. **"Your next best action" nudge.** A single line on the holder/citizen view, e.g. *"Your FREELON #199 is untrained. Activate it →"*. The cleanest conversion lever we don't fully have. Small, real, post-validation.
2. **Sharper HEX sinks — status/progression ONLY, never AI compute.** If HEX needs more demand, add cosmetic/status/progression sinks. Keep it strictly away from the AI payment path.
3. **Cleaner homepage one-liner.** Test *"FREELON CITY turns NFTs into trainable AI citizens"* against the current copy — only if validation shows the current line underperforms.
4. **More public proof on citizen pages.** Deepen the proof layer (best output, impressions, job count) — ONLY if paid jobs actually run and people care.

---

## The validation gate (the only thing that matters next)

Set `PAYMENT_WALLET` + `ETH_RPC_URL`, run `/api/admin/golive-preflight`, flip `PAYMENTS_LIVE=true`, then do ONE real activation + paid Red Team. Judge only:

```
├── Did payment work?
├── Did activation feel clear?
├── Did the output feel worth paying for?
├── Did the user understand what happened?
├── Did the citizen record update properly?
└── Would someone else pay for this?
```

Yes → pull items from the KEEP list into a real sprint. No → fix the prompt/flow, not the feature set. Don't launch.

> The enemy now is not lack of ideas. It's building around demand before demand has spoken.

---

## 📊 Competitive positioning — Normies (reference, NOT a build item)

Normies (10k on-chain CC0 faces, real floor + market cap) pivoted to "awaken your NFT into an agent" and got traction. **This validates the category** — people will pay for static-NFT → alive-agent. It also sets the bar and the honesty boundaries.

**The core distinction (use this in the proof post):**

> **Normies awaken as identities. FREELONS activate as workers.**

```
Normies
├── fully on-chain / CC0 credibility (their moat — DO NOT claim this lane)
├── simple faces / identity
├── "awaken" mechanic
├── personality / memory / wallet angle (cute but abstract)
└── market proof that NFT → agent has real demand

FREELONS
├── 4,040 citizens
├── activate into WORKING agents (not just identities)
├── jobs / XP / roles / work history
├── Red Team / Strategy / Dossier / Images
├── public résumé + work-log (verifiable proof of usefulness)
└── squad-building angle (one agent → many roles)
```

**Positioning table:**

| Category | Normies | FREELONS |
|---|---|---|
| Base asset | fully on-chain generative faces | 4,040 citizens |
| Activation word | awaken | **activate** |
| Core feeling | character comes alive | **worker starts working** |
| Main hook | identity / personality / memory | **jobs / XP / class / work history** |
| Buyer logic | own an agentic identity | **train a useful agent / squad** |
| Proof needed | agent identity binding | **real job output + résumé update** |
| Their edge | on-chain / CC0 credibility | — |
| Our edge | — | **show the actual Red Team output** |

**What to steal:** simple activation language, static→working transformation as a *moment*, public sharing/flex, cheap-entry (0.005), clear "go here, activate yours."
**What NOT to copy:** "fully on-chain" claims (untrue for us), agentic-protocol jargon, vague personality/memory claims, dependence on floor momentum we don't have.
**Our substitute for their momentum:** proof, not confidence — *"I activated mine, it ran Red Team, here's what it found."*

> They proved people want NFTs to wake up. FREELONS must prove activated agents actually **work**.

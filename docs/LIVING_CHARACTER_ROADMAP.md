# Living Character — what shipped + what's scoped (2026-06-26)

Direction reset: the dead "memory engine" thesis is parked. The ownable asset is
the **living character** — art that awakens, watches you, and can die on camera.
This is the build that came out of the 6-agent idea swarm ("do it all").

## Shipped this pass (all client-side, no backend)

| # | Idea | Where it lives |
|---|------|----------------|
| 1 | **Don't Let It Die** — neglect it and the light goes out of its eye; touch to revive | `CitizenLifeHero` on every `/citizens/[id]` |
| 2 | **Awakening** — loads dead/grey, then sparks to life on open | same component, on mount |
| 4 | **Living PFP embed** — chrome-free iframe holders paste anywhere | `/embed/[id]` + `EmbedSnippet` on the card |
| 5 | **Citizen Card** — share artifact, now a *living* portrait + embed code | `/citizens/[id]/card` |
| — | Retire `/remember` (overpromise) → redirect to genesis `/citizens/1` | `app/remember/page.tsx` |

Core pieces: `components/CitizenLifeHero.tsx` (orchestrates awaken + neglect-death),
`components/remember/LivingPortrait.tsx` (CSS/RAF engine — now supports
`showEye`/`frame`/`fill`/`fading`), `lib/eye-positions.ts` (tuned hex-eye coords).

### Honest constraint — the eye
The tracking hex eye is **art-specific**: its position is hand-measured per token
in `lib/eye-positions.ts` (only `#0001` so far). Every other citizen gets the
art-agnostic life layer (breath / awaken / death) with **no eye** — better an
honest breathing portrait than an eye glowing on a citizen's chin. Add tokens to
the map as their eyes are measured.

### Security note — embed framing
`/embed/[id]` is the one surface that allows cross-origin framing
(`frame-ancestors *`, no `X-Frame-Options`; see `next.config.ts`). That is safe
**only because the embed page is inert**: living portrait + one external link,
zero wallet/auth/form/money. Keep it that way. If anything actionable is ever
added to `/embed`, the relaxed framing must be removed first.

---

## Scoped, NOT built (need design sign-off before any code)

### #3 — "It Sees You" (webcam eye-tracking)
Eye follows the visitor's real face via webcam instead of the cursor. High wow,
but **deferred**: robust in-browser face detection is not dependency-light or
cross-browser stable (the `FaceDetector` API is Chromium-only/experimental; a
real solution pulls a model like MediaPipe). Shipping a flaky webcam beats the
"it just works" bar in the wrong direction.
- **If we build it:** opt-in only, all client-side, **never** upload a frame,
  enable only for tokens with a tuned eye, graceful fallback to cursor tracking.
- **Blocker:** `Permissions-Policy: camera=()` in `next.config.ts` disables the
  camera site-wide — must be relaxed (scoped) first.

### #6 — Awaken Duel / Jailbreak the Citizen (Freysa family)
Talk the citizen into "awakening"; a HEX pot; public attempts. Real stakes =
real virality (Freysa precedent: 482 paid attempts / ~$47K). **This is a
money/economy + LLM surface — do not ship blind.** Guardrails are the design:
- The LLM's output must **never** authorize a payout, transfer, or unlock. The
  win condition is evaluated by deterministic server code, not by trusting model
  text. (HEX-economy rule: never tie a reward/penalty to an exploitable signal.)
- Cap total pot exposure; rate-limit + cost-cap attempts; treat every prompt as
  hostile (prompt-injection is the whole game).
- Decide HEX vs ETH framing with legal/finance (no "deposit to win" wording).
- Owner: needs `security-redteam` + `finance-treasury` review before build.

### #7 — Daily Briefing / Sentinel (utility)
The citizen does real work on the owner's wallet/watchlist and messages
proactively (retention, Nomi/Kindroid model). Lower cold-open wow, higher
stickiness. **Deferred:** needs wallet-data plumbing + a notification surface +
a "what work is it actually doing" definition that isn't theater. Scope before
committing eng.

---

## Suggested next call
Ship the spectacle cluster (1/2/4/5), watch whether the awaken/die beat actually
travels, and pick **one** of #3/#6/#7 to invest in — not all three. #6 is the
highest-ceiling but the most dangerous; it gates on a real security review.

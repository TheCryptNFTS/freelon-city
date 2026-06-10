# freelon-city-site — session rules

Billy often runs MULTIPLE Claude sessions against this repo at once. These rules
exist because the collisions already happened (2026-06-10). Follow them exactly.

## The .next race
- `next dev` and `npm run build` share `.next`. NEVER run a build (or a second
  dev server) while a dev server is up — in ANY session.
- Race symptoms: phantom 500s on routes that just worked, ENOENT
  `.next/routes-manifest.json`, "Cannot find module './NNNN.js'", dev server dying.
  That is NOT a code regression — stop all servers, `rm -rf .next`, restart once.
- `npx tsc --noEmit` + `npm run build` (run with no dev server up) are the real
  gates. Trust them over dev-server behavior.

## Git with parallel sessions
- Before staging anything: `git status` + `git log -3`. Another session may have
  committed, or picked up your uncommitted files.
- Stage specific files only — never `git add -A` (it sweeps the other session's
  work and untracked docs into your commit).
- If you deliberately include another session's verified work, say so in the
  commit message.
- Pushing `main` deploys to production via Vercel — confirm with Billy before
  pushing unless he has already told you to ship.

## Decision docs
- Locked decisions live in `docs/` (ecosystem map, HEX economy, history
  visibility, copy/legal checklist, V1 Signal OS plan). Read the relevant doc
  before economy/agent/API/copy work — they override ad-hoc judgment.

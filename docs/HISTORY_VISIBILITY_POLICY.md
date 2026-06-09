# History Visibility Policy

**The rule:** a citizen's work history is **public proof** of *what was done*, but the
**raw output text is owner memory** and must not be exposed publicly unless the owner
explicitly shares it. Private *input* (the holder's brief) is never public.

This exists because agent history (`lib/agent-history.ts`, `AgentWork`) is surfaced on
several public, owner-agnostic surfaces. Generated `body` can contain hype, test output,
emojis, or private context, so it must never be dumped into a public view. This doc is the
single source of truth so future work doesn't re-discover it surface-by-surface.

## Public vs owner

| Field | Public | Owner |
|---|---|---|
| Work exists / count | ✅ | ✅ |
| `kind` (image/text) | ✅ | ✅ |
| `ability` / `abilityLabel` / `task` | ✅ | ✅ |
| `timestamp`, `level` | ✅ | ✅ |
| Image outputs (`body` = URL) | ✅ (shareable branded renders) | ✅ |
| **Text output `body`** | ❌ **never, unless explicitly shared** | ✅ |
| **`brief` (holder's input)** | ❌ **never** | only if needed |
| Full raw history via API | ❌ summaries only | ✅ with ownership proof |

Ownership is proven with a wallet signature (`walletProof`), not a client claim. In the
UI, `landing?.isOwner` (from `/api/citizens/[id]/landing?address=`) is the current
owner signal — `landing` is only set server-confirmed for the actual owner.

## Surfaces — already hardened (UI display gates)

- **Homepage** — cold-visitor pill is "Try a citizen free · no wallet needed" → `/demo`
  (no owner-voice / "sync to enter" jargon).
- **`/demo`** — flagship kicker is "THE ONE YOU CAN OWN" (not "THE ONE YOU OWN").
- **`/agent/[id]` recall line** (`AgentWorkspace.tsx`) — labels by `kind` only
  (`image deployment` / `content post` / `saved work`); never reads `body`.
- **`/agent/[id]` work-history panel** — raw `body` snippet rendered only when
  `landing?.isOwner`; non-owners see the ability label = proof, not text.
- **`/citizens/[id]/log`** (public page) — text entries render a `⬡ Content output`
  badge mirroring `⬡ Image output`; raw `body` is not rendered.

Owner-voice copy ("you own", "Last time you and …") is gated on `landing?.isOwner`
everywhere it appears; non-owners get neutral, truthful copy.

## Surfaces — NOT yet hardened (API / contract — needs deliberate design)

These return/draw raw `body` to everyone and must NOT be changed casually — they affect
owner views, a documented external API contract, and OG share cards. Hardening them
requires an **owner-authenticated history endpoint** (walletProof-gated) plus rewiring
owner UI to it, then stripping text `body` from the public shapes.

- `app/api/citizens/[id]/agent` — public JSON, owner-agnostic, returns `history[].body`
  (already strips `brief`). Owner workspace reads body from here, so it can't be stripped
  until an owner endpoint exists.
- `app/api/v1/citizens/[id]/history` — public/ documented dev API; returns `body: w.body`.
  Changing it is a versioned contract change.
- `app/api/og/agent/[id]` — public OG share card; draws `body` snippet onto the image.

## Rules for future agents

1. **Never render raw text `body` on a public surface.** Show kind/ability/task/time/level
   as proof instead. Mirror the existing `⬡ … output` badge pattern.
2. **Never render `brief` publicly.** It is the holder's private input.
3. Image `body` (URLs) may be public — they're intended shareable renders.
4. Gate any owner-only detail on a server-confirmed signal (`landing?.isOwner` /
   `walletProof`), never a raw client flag.
5. Don't "fix" the API surfaces above with a quick strip — owners read body from the same
   endpoints. Design the owner-authenticated path first.
6. Don't delete history data to clean up ugly output — fix the display/visibility layer.
   Deleting real work history breaks the "track record travels with the NFT" promise.

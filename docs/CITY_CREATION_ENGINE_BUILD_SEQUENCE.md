# City Creation Engine — Smallest Safe Build Plan

Date: 2026-06-09. Grounded in FILE_TREE_LIVE.md + verified against the actual code. The thesis:
**the plumbing already exists — the missing thing is product compression into ONE loop.** This plan
connects existing pieces; it does NOT build new systems. No code yet.

**The one sentence:** Own a citizen. Create with it. Build its record.
**The one button:** CREATE WITH THIS CITIZEN.

**The loop:** citizen/agent page → CREATE → (Transmission · Poster · Story) → generate via existing
image/text systems → save to `agent-history` → share card via OG route → appears in City Archive
(`/transmissions`) → share to X.

---

## 1. Existing files/routes/components to REUSE (verified)
| Need | Already exists | Reuse as-is? |
|---|---|---|
| Image generation | `lib/missions/image-gen.ts` (`generateCitizenScene`, `generateSisterScene`, 32 SCENES, OpenRouter→stamp→Blob) | ✅ as-is |
| Render request (FREELONS) | `POST /api/citizens/[id]/mission` (`deploy-citizen` + scene; HEX+budget gated; returns Blob `output.body`) | ✅ as-is |
| Render request (sisters) | `POST /api/agents/[slug]/[id]` (image branch, free + daily caps) | ✅ as-is |
| Work record | `lib/agent-history.ts` (`addAgentWork`, per-token, survives sale) — renders ALREADY save here | ✅ as-is |
| City Archive store | `lib/transmissions-store.ts` (`{author,civ,imageUrl,caption}` + sorted-set indexes + `listTransmissions`) | ✅ as-is |
| Post to Archive | `POST /api/transmissions` (`{addr,caption,civ,imageUrl}`, walletProof + same-origin gated) | ✅ as-is |
| Archive feed page | `/transmissions` (+ `TransmissionCard`, civ filters, signal/boost) | ✅ as-is |
| Post-to-wall UI | `components/TransmissionSubmit.tsx` (currently: PASTE an image URL) | ⚠️ extend |
| Share to X | `lib/share.ts` / `lib/share-agent.ts` (`buildAgentShareIntent`, tweet-intent) + `ShareAgentOutput.tsx` | ✅ as-is |
| Résumé share card | `GET /api/og/resume/[id]` (cinematic poster, shipped this session) | ✅ as-is |
| Workspace render UI | `AgentWorkspace.tsx` Image mode (scene picker → render → shows image) | ⚠️ extend |

## 2. The MISSING pieces (this is genuinely small)
The loop is ~80% built. Only two gaps:
1. **The "Post to City Archive" action after a render.** Today a render saves to history + the
   transforms wall, but there's no one-tap "publish this to /transmissions." The Blob URL already
   exists in `output.body`; `POST /api/transmissions` already accepts an image URL + does the
   walletProof gate. → **Add a button that pipes the just-rendered URL into that existing endpoint.**
2. **The single front-door "CREATE WITH THIS CITIZEN" affordance.** The capability is buried inside
   the workspace's "Image" tab. → **Surface one clear entry** (the workspace already has the render
   picker; this is mostly labeling/IA, not new logic).

Everything else (generate, save-to-record, share card, feed, X) already exists. **No new DB, no new
store, no new image pipeline, no HEX-path change.**

## 3. MVP data model — NONE new
- Creations ARE: an `AgentWork` entry (already saved on render) + optionally a `Transmission`
  (existing store) when the user publishes. Reuse both. No new schema.
- A published creation = a `Transmission` whose `imageUrl` is the render's Blob URL. That's it.

## 4. API route plan — reuse, one tiny extension
- Generate: `POST /api/citizens/[id]/mission` (FREELONS) / `POST /api/agents/[slug]/[id]` (sisters) — **unchanged**.
- Save to record: automatic (render already calls `addAgentWork`) — **unchanged**.
- Publish to Archive: `POST /api/transmissions` — **unchanged endpoint**; just called with the
  render's Blob URL instead of a pasted one. (It already walletProof-gates + same-origin checks +
  optionally burns the existing transmission HEX cost — keep that as-is.)
- Feed: `GET /api/transmissions` — **unchanged**.
- Share card: `GET /api/og/resume/[id]` (+ existing `og/agent/[id]`) — **unchanged**.
- **New routes needed: ZERO.**

## 5. UI flow plan (the only real build)
- **A.** On `agent/[id]` (and sister `agent/c/[slug]/[id]`): a prominent **"CREATE WITH THIS CITIZEN"**
  entry that opens the existing Image-mode render picker (relabel/elevate what's there).
- **B.** After a render shows: add a **"Post to City Archive →"** button next to the existing Share
  button. On click → call `POST /api/transmissions` with `{addr, civ, caption, imageUrl: renderedUrl}`
  (sign if needed, same as other spends). On success → toast + link to `/transmissions`.
- **C.** Three creation types map to existing capabilities (don't build 20):
  - **Transmission** = a render with a short caption (image + caption → archive). ← lead with this.
  - **Poster** = a render using one of the cinematic SCENES looks (already live). ← same path, framed as "poster."
  - **Story / Memory** = a TEXT output (existing chat/transmission text path) → optionally on a text card. ← phase 2.
- Touches: `AgentWorkspace.tsx` (the post button + entry label), maybe `TransmissionSubmit.tsx`
  (accept a pre-filled imageUrl instead of forcing paste). Nothing else.

## 6. Share card plan — reuse
- The citizen page already unfurls `og/agent/[id]`; the résumé flex uses `og/resume/[id]`.
- A published transmission unfurls via the citizen/transmission link card. No new OG route required
  for MVP. (A dedicated `og/transmission/[id]` is a nice-to-have, not MVP.)

## 7. City Archive integration — already there
- Published creations land in `transmissions-store` → appear in `/transmissions` (Latest + civ
  filters + signal/boost already exist). "Featured" weekly is a future editorial flag, not MVP.

## 8. Privacy rules (honor HISTORY_VISIBILITY_POLICY)
- Image renders are public by nature (shareable Blob URLs) — fine to publish.
- TEXT "Story/Memory": the raw body is OWNER memory. Publishing a text creation must be an explicit
  owner action, and the public Archive shows the rendered card/caption, not raw private work-history
  body. (Phase 2 — defer text publishing until this is wired cleanly.)
- Never auto-publish. Publishing is always a deliberate button press by the owner.

## 9. Owner vs public rules
- **Generate + publish:** owner only (already gated — mission/sister routes require walletProof +
  ownership; `POST /api/transmissions` requires walletProof).
- **View the Archive:** public (already public).
- Non-owners on a citizen page: see the public record + published creations, NOT a Create button.

## 10. Rollout flags
- Gate the new "Post to City Archive" button behind an env flag (e.g. `CREATE_PUBLISH_LIVE`) so it
  can ship dark and flip on. Reuse the existing pattern (`HISTORY_PUBLIC_STRIP`, `PAYMENTS_LIVE`).
- No new economy flag needed (publish reuses the existing transmission cost, already flag-aware).

## 11. Acceptance tests
- Owner renders a scene → "Post to City Archive" appears.
- Click → `POST /api/transmissions` succeeds with the render's Blob URL; creation shows in `/transmissions`.
- Non-owner: no Create/Publish button; can view published creations.
- Unauthenticated publish attempt → 401/403 (existing gate).
- No new HEX faucet; publish burns the existing transmission cost only (or free if that's the current setting).
- Share-to-X intent carries a clean, non-financial caption.
- tsc 0 errors; no console errors; the render→save→publish→feed→share loop works end-to-end live
  (the render step needs real gen — verify with one authorized generation).

## 12. Smallest implementation sequence
1. **Wire "Post to City Archive →"** into `AgentWorkspace.tsx` after a successful render (pipe
   `output.body` Blob URL → `POST /api/transmissions`). Flag-gated. ← the core loop-closer.
2. **Verify** the full loop live (one real render → publish → see it in `/transmissions` → share).
3. **Surface "CREATE WITH THIS CITIZEN"** as the elevated entry label on the agent page (IA only).
4. (Phase 2) Text "Story/Memory" publishing with the owner/public privacy split.
5. (Later) dedicated `og/transmission/[id]` card; weekly "Featured" flag.

Stop after step 2 is verified — that's the public loop, real and shippable. Everything after is polish.

---

## The honest summary
The repo already has: image-gen, agent-history, transmissions-store, the /transmissions feed,
POST /api/transmissions (walletProof-gated), share.ts, og/resume, the 32-look render picker, and the
sister pipeline. **The City Creation Engine is one button** ("Post to City Archive") + one label
("CREATE WITH THIS CITIZEN"). Build that one connection, verify the loop, stop. Do not touch the HEX
money path, wallet security, or Crypt TCG. Do not add creation types beyond the three. Do not
redesign the site.

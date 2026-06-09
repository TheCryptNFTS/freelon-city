# Owner-Authenticated History Endpoint — Design Spec

Status: 2026-06-09. Builds on `docs/HISTORY_VISIBILITY_POLICY.md` and verified surface audit.
No code yet. This is the implementation design.

**Problem:** The UI now gates raw text `body` (public sees labels/proof, owner sees full
output). But the **API surfaces still serve raw `body` to everyone** — the UI gate is
clarity/safety, not privacy. This spec closes that at the data layer.

---

## 1. Current public history surfaces (all serve raw `body`, owner-agnostic)
| Surface | File | Exposure |
|---|---|---|
| Agent JSON | `app/api/citizens/[id]/agent/route.ts:44` | `history[].body` (strips `brief`); owner UI reads body from HERE |
| Public log page | `app/citizens/[id]/log/page.tsx` | UI now shows badge, but server-renders from same data |
| Dev/v1 API | `app/api/v1/citizens/[id]/history/route.ts:42` | `body: w.body` — documented external contract |
| OG share card | `app/api/og/agent/[id]/route.tsx:40` | draws `body` snippet onto image |

Root cause: `getAgentHistory(id)` returns full records; every surface is unauthenticated.

## 2. What PUBLIC users should see
Proof of work, never raw text: `id`, `kind` (image/text), `ability`/`abilityLabel`, `task`,
`timestamp`, `level`. **Image `body` (URLs) stays public** (shareable branded renders).
**Text `body` and `brief` never public.**

## 3. What OWNERS should see
Everything: full text `body` (their memory), all fields. `brief` (their private input) —
owner only, and only if a surface actually needs it (none render it today).

## 4. Auth requirement
`requireProvenWallet(req, address)` — the same walletProof (one-time signature, timestamp-bound,
cached) used for HEX. Ownership = the proven wallet holds the token (or `landing.isOwner`
server-confirmed). Bare `bind` is NOT sufficient.

## 5. Proposed PUBLIC endpoint shape
Keep `GET /api/citizens/[id]/agent` public but **strip text body server-side**:
```
history: AgentWork[] where, for kind==="text", body is OMITTED or replaced with
         a safe summary { kind, ability, abilityLabel, task, timestamp, level }.
         For kind==="image", body (URL) is retained.
```
This is the default response. No auth required. Safe to cache.

## 6. Proposed OWNER endpoint shape
New: `GET /api/citizens/[id]/history/full` (or `?full=1` on the agent route)
- Requires `requireProvenWallet` + ownership check.
- Returns full `AgentWork[]` including text `body`.
- `cache: no-store`, never cached/CDN'd.
- Rate-limited.

Owner UI (`AgentWorkspace.tsx`) switches its history fetch to this endpoint when the
viewer is the proven owner; falls back to the public (stripped) response otherwise.

## 7. Migration risks
- **Owner workspace currently reads body from the PUBLIC agent endpoint.** Stripping body there breaks the owner's own memory view UNTIL the owner endpoint + the UI switch land. → ship owner endpoint FIRST, switch the UI, THEN strip the public response. Order matters.
- **Dev/v1 API is a documented external contract** — stripping `body` is a breaking change. Version it (`/api/v2/...`) or gate behind auth; don't silently change v1.
- **OG card** draws body — once public body is stripped, OG must use a safe summary (it already has the kind, can render "made a content post" instead of the text).

## 8. Backwards compatibility
- Public agent endpoint: shape stays same, `body` for text entries becomes absent/summarized. Clients reading text body will see empty — acceptable (UI already gates it).
- v1 dev API: do NOT mutate in place. Either freeze v1 as-is behind a deprecation notice or add v2. Decision needed.
- localStorage/data model unchanged (`AgentWork` keeps `body`; it's a response-shaping change, not a schema change).

## 9. Implementation order (safest sequence)
1. Add owner endpoint `GET /api/citizens/[id]/history/full` (auth + ownership + full body). Additive, breaks nothing.
2. Switch `AgentWorkspace.tsx` owner history fetch to the new endpoint (gated on `landing?.isOwner`).
3. Verify owner still sees full memory live; non-owner unaffected.
4. Strip text `body` from the public `agent` route response.
5. Update OG card to render a safe summary instead of body.
6. Version or gate the v1 dev API.
7. Re-verify all 4 surfaces: public = no raw text, owner = full.

## 10. Acceptance tests
- Non-owner GET `/api/citizens/1450/agent` → no text `body` in `history` (image URLs present).
- Owner (proven wallet) GET `/api/citizens/1450/history/full` → full text `body` present.
- Unauthenticated GET to owner endpoint → 401/403.
- Bound-but-unsigned session → owner endpoint denied.
- `/citizens/1450/log` public page → still badge-only (already true).
- OG card for #1450 → no raw text body drawn.
- Owner workspace live → "Last time you and…" + full work-history body still render for the owner.

## 11. Rollback plan
Each step is independently revertable:
- Step 1 (owner endpoint): delete the route — additive, safe.
- Step 2 (UI switch): revert the fetch target to the public endpoint.
- Step 4 (public strip): the single highest-risk step — keep it a one-line response filter behind a flag (e.g. `HISTORY_PUBLIC_STRIP=true`) so it can be flipped off instantly if the owner view regresses. Do NOT strip until steps 1–3 are verified in prod.

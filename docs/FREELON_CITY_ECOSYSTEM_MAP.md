# FREELON CITY — Ecosystem Map & Product Hierarchy (Decision Doc)

Status: 2026-06-09. Grounded in repo (`lib/collections-data.ts`, `lib/agent-subject.ts`,
route map) + verified QA state. This is a DECISION document, not lore. Brutal by intent.

FREELON CITY is NOT one collection. It is a multi-collection world built around a
missing signal called the **HEX**. FREELONS is the spearhead; the others are supporting
collections at different readiness levels.

---

## 1–3. What each layer is · its role · what users can DO today

| Layer | What it is | Role in the city | What a user can ACTUALLY do today |
|---|---|---|---|
| **FREELONS / Citizens** | 4,040 sealed Ethereum NFTs, 10 civilizations | The **agent spearhead** + identity core | Own one → unlock (ETH) → chat/train an AI agent, give jobs, build work history, render images. **This is the product.** |
| **HEX (⬡)** | The site-wide earned/spendable credit | The economy connecting everything | Earn via daily/actions (walletProof-gated), spend on agent runs/art-evolution. NOT cashable to ETH. |
| **The Crypt** | Sister NFT collection (status: RECOVERED) | "The dead ones · ancient records" — agentic | Chat a demo agent; own/agent path exists via the shared agent system |
| **Crypt TCG / Combat Archives** | Standalone card game (separate repo) | The **game** layer | Play full matches live (tutorial/match/puzzles), earn device-local ⬡ HEX. The ONLY non-agentic collection. |
| **OOGIES** | Sister collection (status: FRAGMENT) | "The wild ones · ancient species" — agentic | Demo chat; agent path via shared system |
| **Emile** | Sister collection (status: DECAYING) | "The emotional ones · memory fragments" — agentic | Demo chat; agent path |
| **SMILES Collapse** | Sister collection (status: SEALED) | "The lost ones · a failed control system" — agentic | Demo chat; agent path |
| **Passport / Sync** | Cross-collection wallet identity | Ties holdings together | Connect (read-only), see holdings/civ, claim daily ⬡ |
| **Civilizations/castes/lore/patrons/leaderboards/archive** | Supporting content | Depth/world | Browse; mostly read-only reference |

---

## 4. Live vs vague vs confusing

- **LIVE & proven:** FREELONS agent workspace, /demo, the funnel, Crypt TCG core loop + result screen, HEX earn/spend (walletProof).
- **VAGUE:** the 4 sister collections (Crypt/OOGIES/Emile/SMILES) are "agentic" in code but their distinct value beyond "another demo agent" is thin. Statuses (RECOVERED/FRAGMENT/DECAYING/SEALED) are lore flavor, not a product promise.
- **CONFUSING:**
  - **Slug sprawl:** `the-crypt-official`, `crypttradingcards`, and "Combat Archives" coexist. Is "The Crypt" an agent collection, the TCG, or both? Nobody lands clean.
  - **Two "Crypt" things:** the NFT collection vs the card game share a name.
  - **All-collections-are-agents** (shipped) dilutes the FREELONS-is-the-agent pitch.

---

## 5. What belongs on the homepage
The single spine only: **FREELONS = AI agents you own and train**, try free (/demo), own (OpenSea). One line that the city is bigger (other collections exist), linking to /collections. NOTHING else competes. (Already largely true post-hardening — protect it.)

## 6. What belongs deeper
Sister collections, civilizations, castes, lore, patrons, leaderboards, archive, passport internals, the TCG. All reachable, none on the homepage.

## 7. The 10-second explanation
> **FREELON CITY is a world of AI characters you own as NFTs. Each FREELON is an agent you train — it remembers your work and its whole history travels with the NFT. Try one free.**

## 8. Where it's currently confusing (ranked)
1. "Crypt" means two things (collection + card game) — **#1 confusion**.
2. Slug sprawl behind the Crypt name.
3. "Every collection is an agent" muddies why FREELONS is special.
4. Sister-collection lore statuses imply utility that isn't differentiated.
5. HEX vs device-local ⬡ HEX (now labeled, but two HEX-flavored things still exist).

## 9. Remove / hide / rename / defer
- **RENAME (decision needed):** disambiguate the card game from the Crypt NFT collection. Card game = "Crypt TCG" everywhere; NFT collection = its own name. Kill "Combat Archives" as a third alias.
- **DEFER:** deep per-sister-collection agent differentiation — until FREELONS agents prove retention.
- **HIDE from homepage:** already done; keep it.
- **DON'T remove:** sister collections, lore, TCG — all real, just deeper.

## 10. Clean product hierarchy
```
FREELON CITY (world)
├── FREELONS (4,040) ── THE PRODUCT: ownable AI agents  ← 90% of attention
│   └── 10 civilizations (within FREELONS)
├── HEX economy (⬡) ── the connective credit
├── Crypt TCG ── the game (own surface, device-local ⬡ HEX)
├── Sister collections (Crypt / OOGIES / Emile / SMILES) ── agentic, deeper
└── Identity: Sync / Passport / leaderboards / lore / archive ── support
```

## 11. Clean main user journey
```
Home (FREELONS pitch) → /demo (try free agent) → OWN a FREELON (OpenSea)
→ Sync (connect, read-only) → unlock agent (ETH) → train it (HEX) → work history travels with NFT
```
Side loop: Crypt TCG for engagement; sister collections for collectors going deep.

## 12. Top 5 risks of explaining it badly
1. **"Is this one collection or six?"** — newcomers bounce when the scope is unclear in the first 10s.
2. **"Crypt" collision** makes the project feel disorganized / untrustworthy.
3. **Over-promising sister collections** as full agents creates support load + disappointment when they're thin.
4. **HEX ambiguity** (real vs device) risks "I earned HEX, where is it?" anger — and copy-safety/legal exposure if it ever reads as spendable/financial.
5. **Diluted spearhead:** if everything is an agent, nothing is — FREELONS loses its "the one you train" clarity, weakening the core conversion.

---

## Decisions this doc forces (hand to Claude Code later)
- **D1:** Lock the 10-second line (Â§7) as the canonical pitch everywhere.
- **D2:** Resolve the Crypt naming collision (card game vs NFT collection) — one name each, retire "Combat Archives."
- **D3:** Keep FREELONS as the sole homepage hero; sisters stay deeper.
  - **D3 OVERRIDE (2026-06-30, founder call):** The homepage now carries the ecosystem/populations layer explicitly. The hero leads with FREELON CITY as a living AI city ("FREELON CITY is alive"), and a compact `CityCollectionsStrip` "populations" beat names all six collections with FREELONS marked FLAGSHIP — NOT the old grid/tree (rightly cut as a second sitemap), but ONE tight role-labelled strip. FREELON stays the pushed flagship (own & train); sisters are free-to-meet. Rationale: a stranger was leaving without understanding the site is an ecosystem or why FREELON is the one being pushed. "AI citizen that remembers you" is demoted from the whole brand to the conversion proof (`CitizensBand`). One tight beat per layer, story not a second sitemap.
- **D4:** Treat sister-collection agents as "chat demo" tier for now; defer deep per-collection agent features (revisit in Agent System Spec — note: code already enables them, so this is a SCOPE/messaging decision, not a build).
- **D5:** Keep real HEX and device-local ⬡ HEX visibly distinct (label discipline already started).

# FREELON WORLD — AI-Driven Open-World Sim: Plan & Expert Roster

Goal (Billy): a GTA-scale, AI-driven sim+game spanning Mars and Freelon City —
multiple cities, multiple genres (driving/racing, shoot-em-up, open-world), where
you buy/build/own and get wealthier. Premium grade, runs in a browser.

This plan was produced after a 4-expert research swarm (codebase inventory,
web-feasibility research, engineering architecture, treasury/economy). It honors
the ambition but sequences it so it's actually shippable by a solo founder + AI.

---

## THE CORE STRATEGIC CALL

**Don't build the literal vision in one shot — it's three graveyards stacked:**
- Browser memory wall (~2–4GB/tab vs GTA's ~100GB streamed) → seamless planet-scale 3D has never shipped on the web.
- AI-citizen sim → Stanford Generative Agents = "a charming toy"; a city of LLM agents burns tokens and retains nobody (demo trap).
- Buy-land-get-wealthier → metaverse land collapsed 85–95%; speculation-not-fun = ghost towns.

**Build the shape that READS as GTA-scale but is shippable:**
> A dense, drivable **hub district** + **bounded genre sub-scenes** (race, combat)
> that share ONE engine core. **Single-player with server-save** (no multiplayer
> netcode v1). Economy is a **closed HEX sink** (own/build/upkeep — never cashable,
> never peer-to-peer real money). A **handful of HexMind-driven characters** who
> remember you by name — NOT an autonomous city sim.

Density + a couple hand-built districts + characters that remember you = the GTA
*feel*. Planet-scale geometry + hundreds of agents = the trap. Aim ambition at
**depth-of-one-loop**, then let session/retention data earn the next city.

---

## TECH FOUNDATION (decisions)

- **Engine:** Migrate the NEW world off hand-rolled Three.js → **Babylon.js**
  (built-in Havok physics, asset/scene pipeline, GLTF, React interop for our HUD/HEX
  client). *Note:* the two eng seats split — keep the EXISTING Mars game in Three.js
  as a shipped arcade entry; only the new sim world adopts Babylon. Don't rebuild
  Mars chasing a marginal engine win.
- **Physics:** **Rapier** (or Babylon+Havok) — has a real raycast-vehicle controller;
  non-negotiable for driving/racing/shooting. NOT ammo/cannon.
- **Entities:** tiny **ECS** (miniplex / bitecs) so cars, NPCs, projectiles, buildings
  are uniform components — biggest leverage point for AI-assisted content.
- **World structure:** **hub-and-instances.** Open drivable district + genre modes as
  lazy-loaded sub-scenes sharing an `engine-core` package (renderer, ECS, loader,
  HEX/auth client). Each genre = a bundle, not a system entangled with the others.
- **Streaming:** chunked tiles around the player + LOD + imposters + hard draw distance.
  Cap drivable area per city to a few km².
- **Serving:** keep the proven rewrite + scoped-CSP pattern, but make each world a
  **build artifact of a shared Vite library** mounted at `/world/<name>` with ONE
  parameterized CSP `headers()` entry. Kill the "deployed copy diverges from source"
  manual re-sync — `public/<world>/` becomes build output, never hand-edited.
- **Persistence:** **Supabase Postgres = world-of-record.** Tables: `parcels`,
  `buildings`, `player_wealth`. **Server-authoritative mutations only** (buy/build/
  upgrade hit a route that validates + sinks HEX). 3D client is an optimistic view
  reconciled by server — identical to our existing `lib/*-store.ts → route.ts` shape.
  Idle/wealth accrual computed server-side from timestamps (un-editable).

---

## THE ECONOMY (treasury-locked rules)

- Peg holds: `HEX_PER_ETH = 100_000`. New sinks extend, don't break, current balance.
- **Wealth loop:** earn → buy (one-shot big HEX *burn to house*, never peer-to-peer)
  → build → operate (upkeep + active tick) → bounded yield. Asset payback 60–120
  active days; if payback < ~30 days you've built a faucet — flag it.
- "Wealthier" = more assets / higher tiers / visible footprint / leaderboard rank
  (net-worth-by-holdings), NOT a growing cash pile.
- **Add `SIM_YIELD_DAILY_CAP` per wallet in `economy-constants.ts` from day one** +
  route business yield through `creditWalletHexFarmable` against `FARMABLE_DAILY_CAP`.
  Uncapped holdings-scaled yield is THE blow-up (inflation + instant-security risk).
- **Legal bright lines:** HEX stays non-cashable AND non-transferable wallet-to-wallet.
  No "yield/APY/returns/passive income" copy — use "output/production/upkeep." No
  randomized HEX loot boxes that output cashable assets (gambling). In-world wealth
  can FEEL real but is a closed loop with no exit to money.
- **NFT edge = access/identity, not dividends.** Owning/awakening a citizen unlocks
  the *license to build*, a starter plot, higher tiers, skins. Never a profit stream.
- **The addictive-good mechanic:** the upkeep-and-operate loop (assets need your
  attention to keep producing) — self-limiting, rewards consistency over wallet size,
  creates daily/30-day/6-month login reasons.

---

## THE BIGGEST RISK & THE FIRST SLICE

**Risk to de-risk first:** Rapier-driven vehicle physics + chunk streaming holding
60fps in a browser tab while looking premium. Everything else (economy, persistence,
UI) we've already proven we can ship.

### Vertical Slice 1 (de-risks the WHOLE architecture)
One small drivable district · Rapier raycast-vehicle car · chunk streaming + LOD ·
**ONE parcel you buy with HEX through a real Supabase-backed route** · building
persists and renders on reload · one HexMind character who greets you by name.

That single loop proves: engine-core package, ECS, physics, streaming, the serving/
CSP pattern, AND the server-authoritative economy seam — end to end. If 60fps holds
with physics + streaming + a building, the rest is content and grind.

---

## ROADMAP (sequenced, evidence-gated)

- **Phase 0 — Slice 1 (above).** Gate to continue: 60fps holds + the buy/build/persist
  loop works. If it doesn't hold, the architecture is wrong — find out cheap.
- **Phase 1 — The district becomes a place.** A few blocks of Freelon City: buildable
  parcels, 3–5 HexMind characters who remember you, one driving objective loop, HEX
  sink economy live behind Supabase. Ship it as `/world/city`. Measure sessions + return.
- **Phase 2 — First genre sub-scene.** Bolt ONE bounded mode onto the hub (racing OR
  arena combat) sharing engine-core. Reuse Mars rover feel. Prove the multi-genre seam.
- **Phase 3 — Second city (Mars).** Reuse the entire engine-core + economy; new art +
  district. This is where "cities all over Mars" becomes real — by reuse, not rebuild.
- **Phase 4+ — Breadth:** more genres, more districts, more characters. Each is content
  on a proven engine, not new architecture.

Cut now (overreach): planet-scale contiguous geometry, real-time multiplayer netcode,
infinite procedural cities, one monolith holding all genres, autonomous LLM city.

---

## THE EXPERT ROSTER ("the correct skills")

### Existing agent seats we reuse
- **engineering-lead** — architecture owner; engine-core package, serving/CSP, Supabase persistence.
- **finance-treasury** — economy design + the `SIM_YIELD_DAILY_CAP` guardrail; owns "do the numbers work / is it a security."
- **legal-compliance** — Howey/gambling bright lines, copy claims, NFT-edge framing.
- **design-art-director / crypt-art-director** — visual grade, "does it look premium," PBR/asset look.
- **qa-lead** — verify 60fps, physics, persistence, mobile; playtest the loop.
- **product-lead** — scope enforcement, kill overreach, sequence by impact.
- **growth-analytics / marketing-lead** — instrument sessions/return-rate; the wedge story.

### Net-new specialist seats to spin up (don't exist yet — recommend creating)
- **world-engine-engineer** — Babylon/Three, ECS, chunk streaming, LOD, asset pipeline. The 3D scale owner.
- **vehicle-physics-engineer** — Rapier raycast-vehicle, character controller, collision, game-feel of driving/combat.
- **ai-npc-designer** — wires HexMind belief ledger into a few in-world characters who recall the player (our unfakeable differentiator). NOT a city sim.
- **tech-art / asset-pipeline** — Blender (we have BlenderMCP) → GLB/DRACO, rigs, textures, building kits; keeps file sizes under the memory wall.
- **open-world-game-designer** — the moment-to-moment loop, missions, what makes the hub fun to just exist in.
- **audio-designer** — spatial audio, engine/impact/ambient (Mars already has spatial-audio bones).

---

## ONE-LINE FRAME
Build a dense, drivable place where a few characters remember you and you grow a
city you can never cash out — ship one loop premium, let it earn the planet.

/**
 * Demo deck/commander selection for the authoritative match-create route.
 *
 * WHY this exists (and why we do NOT use the vendored data/defaultDecks.json):
 * the game repo's `defaultDecks.json` is keyed by the CURATED commander ids
 * (`cmd_stone_warden`, ...) from `design/commanderSpecs`, but the engine's
 * runtime commander registry (`engine/commanders.ts`) now reads the GENERATED
 * specs (`cmd_6665`, ...). Those two universes diverged, so `getCommanderById`
 * throws on every curated id and the curated decks can no longer bootstrap a
 * match through the engine. (This is a pre-existing mismatch in crypt-game;
 * not ours to fix from the vendored copy — edit there, then re-sync.)
 *
 * So for the M1 server scaffold we build a guaranteed-legal demo deck straight
 * from the vendored card pool: `createMatchFromDecks` only enforces deck SIZE,
 * the per-card copy cap, and the GOD-card rule — so 30 DISTINCT non-commander,
 * non-GOD playable cards always validate. Real `decks` input arrives in a later
 * milestone; this is purely a placeholder so create/action are exercisable now.
 *
 * TODO(M2): replace with real player-submitted decks once deck selection and
 * the curated/generated commander id reconciliation land.
 */

import { allCommanders } from "@/lib/crypt-engine/engine/commanders";
import { allPlayableCards, isCommanderCardId } from "@/lib/crypt-engine/engine/cards";

export type DemoSide = { commanderId: string; deck: string[] };

const DECK_SIZE = 30;

/** Distinct, non-commander, non-GOD, non-banned playable card ids — the legal
 *  demo pool. NOTE: `createMatchFromDecks` now rejects soft-banned (`disabled`)
 *  cards at bootstrap, so the pool MUST exclude them or match-create 500s. */
function legalPool(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const card of allPlayableCards as Array<{
    id?: string;
    faction?: string;
    disabled?: boolean;
  }>) {
    const id = card?.id;
    if (!id || typeof id !== "string") continue;
    if (seen.has(id)) continue;
    if (isCommanderCardId(id)) continue;
    if (card.faction === "GODS") continue; // demo commander disallows god cards
    if (card.disabled) continue; // soft-banned by cardOverrides → bootstrap rejects
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Two demo sides with distinct generated commanders and two disjoint 30-card
 * slices of the legal pool. Deterministic (no RNG here — the match seed alone
 * drives shuffles), so the same build is reproducible.
 */
export function demoSides(): { p1: DemoSide; p2: DemoSide } {
  const commanders = allCommanders;
  if (commanders.length < 2) {
    throw new Error("demo decks require at least 2 commanders in the registry");
  }
  const pool = legalPool();
  if (pool.length < DECK_SIZE * 2) {
    throw new Error(
      `demo decks need ${DECK_SIZE * 2} cards, pool only has ${pool.length}`,
    );
  }
  return {
    p1: { commanderId: commanders[0].id, deck: pool.slice(0, DECK_SIZE) },
    p2: { commanderId: commanders[1].id, deck: pool.slice(DECK_SIZE, DECK_SIZE * 2) },
  };
}

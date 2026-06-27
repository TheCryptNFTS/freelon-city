/**
 * FREELON WORLD — server-of-record for the open-world sim slice (/world/city).
 *
 * Per-PLAYER world state: which parcels they own, their in-world HEX, visit
 * count. Mirrors lib/progression-store.ts exactly: GET/SET a JSON blob per key,
 * in-memory Map fallback in dev (hasUpstash), and a short advisory lock around
 * the read-modify-write so two concurrent builds can't double-spend.
 *
 * AUTHORITY: the buy/build mutation is validated HERE (range, ownership, balance)
 * and the route calls it — the 3D client is an optimistic view that the server
 * reconciles. This is the architectural seam from docs/WORLD_BUILD_PLAN.md.
 *
 * ECONOMY (treasury rules, docs/WORLD_BUILD_PLAN.md): building SINKS HEX (burned,
 * never refunded, never cashable). This slice carries its own self-contained HEX
 * stipend so it can be exercised without touching the live wallet-hex-store; the
 * PRODUCTION step is to debit the real per-wallet ledger instead (marked below).
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";
import { ECONOMY } from "@/lib/economy-constants";
import {
  debitWalletHex,
  creditWalletHex,
  getWalletHex,
  InsufficientHexError,
  WalletBusyError,
} from "@/lib/wallet-hex-store";

// Slice constants. SIM_YIELD_DAILY_CAP is still owed before any yield-bearing
// asset ships — see the treasury section of WORLD_BUILD_PLAN.md. (Building is a
// PURE SINK today: no yield, so the cap doesn't bind yet — finance sign-off 2026-06-27.)
export const PLOTS_PER_SIDE = 8;
export const PLOT_COUNT = PLOTS_PER_SIDE * PLOTS_PER_SIDE; // 64
export const BUILD_COST: number = ECONOMY.WORLD_BUILD_COST; // single source of truth
export const STARTER_HEX = 500; // DEMO/anonymous in-world stipend ONLY — never real HEX

export type WorldState = {
  owner: string; // sanitized player key (wallet address or display name in the slice)
  hex: number; // in-world, non-cashable
  owned: number[]; // plot indices [0, PLOT_COUNT)
  visits: number;
  lastSeen: number;
};

// DEV-ONLY in-memory fallback (used only when !hasUpstash). globalThis-backed so
// it's one shared instance across Next's per-route module bundles in dev.
const memory: Map<string, WorldState> =
  ((globalThis as { __freelonWorldMem?: Map<string, WorldState> }).__freelonWorldMem ??=
    new Map<string, WorldState>());

const KEY = (owner: string) => `freelon:world:v1:${owner}`;
const LOCK_KEY = (owner: string) => `freelon:world:lock:${owner}`;

/** Sanitize a player key the same way everywhere (lowercase, safe charset, bounded). */
export function normalizeOwner(input: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 42); // fits an 0x… wallet address or a handle
}

export function emptyWorld(owner: string): WorldState {
  return { owner, hex: STARTER_HEX, owned: [], visits: 0, lastSeen: 0 };
}

export type BuildResult =
  | { ok: true; state: WorldState }
  | { ok: false; reason: "bad_plot" | "already_owned" | "insufficient_hex"; state: WorldState };

/**
 * PURE server-authoritative build validation. No I/O — unit-testable. Returns a
 * NEW state on success (HEX sunk, plot appended); the original on rejection.
 */
export function applyBuild(rec: WorldState, idx: number): BuildResult {
  if (!Number.isInteger(idx) || idx < 0 || idx >= PLOT_COUNT) {
    return { ok: false, reason: "bad_plot", state: rec };
  }
  if (rec.owned.includes(idx)) {
    return { ok: false, reason: "already_owned", state: rec };
  }
  if (rec.hex < BUILD_COST) {
    return { ok: false, reason: "insufficient_hex", state: rec };
  }
  const next: WorldState = {
    ...rec,
    hex: rec.hex - BUILD_COST, // SINK — burned, never refunded
    owned: [...rec.owned, idx].sort((a, b) => a - b),
  };
  return { ok: true, state: next };
}

async function read(owner: string): Promise<WorldState> {
  if (!hasUpstash) return memory.get(owner) ?? emptyWorld(owner);
  try {
    const raw = (await upstash(["GET", KEY(owner)])) as string | null;
    if (!raw) return emptyWorld(owner);
    const rec = JSON.parse(raw) as WorldState;
    rec.owned = Array.isArray(rec.owned) ? rec.owned.filter((n) => Number.isInteger(n) && n >= 0 && n < PLOT_COUNT) : [];
    if (typeof rec.hex !== "number") rec.hex = STARTER_HEX;
    return rec;
  } catch {
    return emptyWorld(owner);
  }
}

async function write(rec: WorldState): Promise<void> {
  if (!hasUpstash) {
    memory.set(rec.owner, rec);
    return;
  }
  await upstash(["SET", KEY(rec.owner), JSON.stringify(rec)]);
}

// Advisory mutex per player — same shape as progression-store. 3s TTL self-heals.
async function acquireLock(owner: string, retries = 5): Promise<boolean> {
  if (!hasUpstash) return true;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await upstash(["SET", LOCK_KEY(owner), "1", "NX", "EX", "3"]);
      if (res === "OK") return true;
    } catch {
      return false;
    }
    await new Promise((r) => setTimeout(r, 80 + i * 40));
  }
  return false;
}
async function releaseLock(owner: string): Promise<void> {
  if (!hasUpstash) return;
  try {
    await upstash(["DEL", LOCK_KEY(owner)]);
  } catch {}
}

/** Load a player's world (creating an empty one if absent). */
export async function getWorld(owner: string): Promise<WorldState> {
  return read(owner);
}

/** Increment visit count + stamp lastSeen. The greeter's memory denominator. */
export async function registerVisit(owner: string): Promise<WorldState> {
  const gotLock = await acquireLock(owner);
  try {
    const rec = await read(owner);
    rec.visits += 1;
    rec.lastSeen = Date.now();
    await write(rec);
    return rec;
  } finally {
    if (gotLock) await releaseLock(owner);
  }
}

/**
 * DEMO build: lock → read → validate+sink IN-WORLD stipend → persist. Used for
 * anonymous/handle visitors who have NOT proven a wallet. Spends the throwaway
 * 500-HEX stipend, never real HEX. Keyed on a sanitized handle.
 */
export async function buildPlot(owner: string, idx: number): Promise<BuildResult> {
  const gotLock = await acquireLock(owner);
  try {
    const rec = await read(owner);
    const res = applyBuild(rec, idx);
    if (res.ok) await write(res.state);
    return res;
  } finally {
    if (gotLock) await releaseLock(owner);
  }
}

export type RealBuildResult =
  | { ok: true; state: WorldState; balance: number }
  | {
      ok: false;
      reason: "bad_plot" | "already_owned" | "insufficient_hex" | "busy" | "error";
      state: WorldState;
      balance?: number;
    };

/**
 * PRODUCTION build: SINKS the player's REAL per-wallet HEX (lib/wallet-hex-store)
 * — a true treasury sink, burned, never refunded once the build lands. ONLY
 * callable for a wallet the session has CRYPTOGRAPHICALLY PROVEN (the route gates
 * this; this function trusts `wallet` is already proven). World state is keyed on
 * the proven wallet, NOT a client string. The in-world `hex`/stipend is irrelevant
 * here — the wallet ledger is the sole source of truth (no free faucet).
 *
 * Ordering (per security review, mirrors /api/city/boost): validate cheaply →
 * DEBIT → only then append the plot. If the world write fails AFTER the debit
 * landed, REFUND so an infra hiccup can't silently burn HEX for nothing.
 */
export async function buildPlotForWallet(wallet: string, idx: number): Promise<RealBuildResult> {
  if (!Number.isInteger(idx) || idx < 0 || idx >= PLOT_COUNT) {
    return { ok: false, reason: "bad_plot", state: await read(wallet) };
  }
  const gotLock = await acquireLock(wallet);
  try {
    const rec = await read(wallet);
    if (rec.owned.includes(idx)) {
      const ledger = await getWalletHex(wallet);
      return { ok: false, reason: "already_owned", state: rec, balance: ledger.balance };
    }

    // SINK real HEX first. The authoritative spend-lock lives inside debitWalletHex.
    try {
      await debitWalletHex(wallet, BUILD_COST, { kind: "manual", note: "world build" });
    } catch (e) {
      if (e instanceof InsufficientHexError) {
        return { ok: false, reason: "insufficient_hex", state: rec, balance: e.balance };
      }
      if (e instanceof WalletBusyError) {
        return { ok: false, reason: "busy", state: rec };
      }
      return { ok: false, reason: "error", state: rec };
    }

    // Debit landed — append the plot. On write failure, refund the burn.
    const next: WorldState = { ...rec, hex: 0, owned: [...rec.owned, idx].sort((a, b) => a - b) };
    try {
      await write(next);
    } catch {
      try {
        await creditWalletHex(wallet, BUILD_COST, {
          kind: "manual",
          note: "world build refund (state write failed)",
        });
      } catch {
        /* refund itself failed — surfaced as `error` for manual reconcile */
      }
      return { ok: false, reason: "error", state: rec };
    }

    const ledger = await getWalletHex(wallet);
    return { ok: true, state: next, balance: ledger.balance };
  } finally {
    if (gotLock) await releaseLock(wallet);
  }
}

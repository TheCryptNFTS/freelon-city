// Carrier rank — daily-decay status for non-holders who relay the signal.
// State lives in localStorage keyed by normalized handle. Server-agnostic;
// designed for v1 to be entirely client-side.

import { syncHandle } from "./sync";
import { LORE_COSTS } from "./economy-constants";

const KEY = "freelon::carrier::v1";
const ACTIVE_HANDLE_KEY = "freelon::carrier::active::v1";
const PER_HANDLE_PREFIX = "freelon::carrier::v1::"; // append normalized handle

function perHandleKey(handle: string): string {
  return PER_HANDLE_PREFIX + handle.toLowerCase().replace(/^@/, "");
}

/** Set which handle is currently "active" in this browser. Multi-handle
 *  users can switch between their carriers without losing either's state. */
export function setActiveCarrierHandle(handle: string): void {
  if (typeof window === "undefined") return;
  const h = handle.toLowerCase().replace(/^@/, "");
  localStorage.setItem(ACTIVE_HANDLE_KEY, h);
}

/** Read which handle the browser thinks is the active carrier. */
export function getActiveCarrierHandle(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_HANDLE_KEY);
}

export type CarrierState = {
  handle: string;
  civilization: string;
  rank: number;          // 0..100 — decays 4 per day idle, +12 per relay
  streak: number;        // consecutive days of activity
  lastActiveDay: number; // day key (epoch day)
  totalRelays: number;
  hexPoints: number;     // ⬡ currency — spend on bio unlocks
  totalEarned: number;   // lifetime earned (audit trail)
  totalSpent: number;    // lifetime spent
  // 2026-05-29 — set once the carrier's hexPoints have been folded into the
  // wallet ledger (lib/hex-spend.ts foldCarrierIntoWallet). Presence means
  // "already migrated"; the fold is skipped thereafter. Holds the wallet
  // address the balance was moved to (audit).
  migratedTo?: string;
};

const DECAY_PER_DAY = 4;
const RELAY_GAIN = 12;
const RANK_MAX = 100;
const RANK_MIN = 0;

// Hex Points earning rules
export const POINTS = {
  STARTING: 50,        // given on init
  PER_RELAY: 10,
  STREAK_3:  5,
  STREAK_7:  10,
  STREAK_30: 25,
  BEARER_BONUS: 50,    // one-time when reaching tier ≥80 rank
};

// Hex Points spending rules
export const COST = {
  UNLOCK_HONORARY: LORE_COSTS.UNLOCK_HONORARY,     // 100 ⬡
  UNLOCK_PROCEDURAL: LORE_COSTS.UNLOCK_PROCEDURAL, //  25 ⬡
  GIFT_UNLOCK: LORE_COSTS.GIFT_UNLOCK,             //  50 ⬡
};

function dayKey(d = new Date()) { return Math.floor(d.getTime() / 86400000); }

/** Load the carrier state for a specific handle (or the active handle).
 *  Falls back to the legacy single-slot key for users who only ever
 *  used one handle before per-handle storage was added. */
export function loadCarrier(handleOverride?: string): CarrierState | null {
  if (typeof window === "undefined") return null;
  try {
    const handle = handleOverride
      ? handleOverride.toLowerCase().replace(/^@/, "")
      : getActiveCarrierHandle();

    // 1) Per-handle slot (new path — supports multiple X handles in one browser)
    if (handle) {
      const raw = localStorage.getItem(perHandleKey(handle));
      if (raw) {
        const parsed = JSON.parse(raw) as CarrierState;
        return migrate(parsed);
      }
    }
    // 2) Legacy single slot (back-compat)
    const legacy = localStorage.getItem(KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as CarrierState;
    const migrated = migrate(parsed);
    // Backfill into the per-handle slot so future switches work
    if (migrated.handle) {
      localStorage.setItem(perHandleKey(migrated.handle), JSON.stringify(migrated));
      if (!getActiveCarrierHandle()) setActiveCarrierHandle(migrated.handle);
    }
    return migrated;
  } catch { return null; }
}

/** List every carrier this browser knows about, by enumerating
 *  per-handle storage keys. Used by the handle switcher UI. */
export function listKnownCarrierHandles(): string[] {
  if (typeof window === "undefined") return [];
  const out: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PER_HANDLE_PREFIX)) {
      out.push(k.slice(PER_HANDLE_PREFIX.length));
    }
  }
  return out.sort();
}

function save(s: CarrierState) {
  if (typeof window !== "undefined") {
    // Write BOTH the per-handle slot and the legacy slot. Legacy stays
    // as a "last-touched" pointer for back-compat with any code that
    // still reads it directly.
    localStorage.setItem(perHandleKey(s.handle), JSON.stringify(s));
    localStorage.setItem(KEY, JSON.stringify(s));
    setActiveCarrierHandle(s.handle);
  }
}

export function tickDecay(s: CarrierState, now = new Date()): CarrierState {
  const today = dayKey(now);
  const days = today - s.lastActiveDay;
  if (days <= 0) return s;
  const decay = days * DECAY_PER_DAY;
  return {
    ...s,
    rank: Math.max(RANK_MIN, s.rank - decay),
    streak: days > 1 ? 0 : s.streak,
    lastActiveDay: today,
  };
}

export function initCarrier(handle: string): CarrierState {
  const sync = syncHandle(handle);
  const s: CarrierState = {
    handle: sync.handle,
    civilization: sync.civilization,
    rank: 20,
    streak: 1,
    lastActiveDay: dayKey(),
    totalRelays: 0,
    hexPoints: POINTS.STARTING,
    totalEarned: POINTS.STARTING,
    totalSpent: 0,
  };
  save(s);
  return s;
}

// Helper: ensure older saved state has the new hex-point fields
function migrate(s: CarrierState): CarrierState {
  if (s.hexPoints === undefined) {
    return { ...s, hexPoints: POINTS.STARTING, totalEarned: POINTS.STARTING, totalSpent: 0 };
  }
  return s;
}

export function relay(now = new Date()): CarrierState | null {
  const raw = loadCarrier();
  if (!raw) return null;
  const cur = migrate(raw);
  const today = dayKey(now);
  const decayed = tickDecay(cur, now);
  const sameDay = cur.lastActiveDay === today;
  const newStreak = sameDay ? decayed.streak : decayed.streak + 1;

  // Calculate point earnings
  let earned = POINTS.PER_RELAY;
  if (!sameDay) {
    if (newStreak === 3) earned += POINTS.STREAK_3;
    else if (newStreak === 7) earned += POINTS.STREAK_7;
    else if (newStreak === 30) earned += POINTS.STREAK_30;
  }
  // Bearer bonus — one-time when crossing 80
  const wasBearer = decayed.rank >= 80;
  const willBeBearer = Math.min(RANK_MAX, decayed.rank + RELAY_GAIN) >= 80;
  if (!wasBearer && willBeBearer) earned += POINTS.BEARER_BONUS;

  const next: CarrierState = {
    ...decayed,
    rank: Math.min(RANK_MAX, decayed.rank + RELAY_GAIN),
    streak: newStreak,
    lastActiveDay: today,
    totalRelays: decayed.totalRelays + 1,
    hexPoints: decayed.hexPoints + earned,
    totalEarned: decayed.totalEarned + earned,
  };
  save(next);
  return next;
}

export function spendPoints(amount: number): CarrierState | null {
  const raw = loadCarrier();
  if (!raw) return null;
  const cur = migrate(raw);
  if (cur.hexPoints < amount) return null;
  const next: CarrierState = {
    ...cur,
    hexPoints: cur.hexPoints - amount,
    totalSpent: cur.totalSpent + amount,
  };
  save(next);
  return next;
}

const CLAIM_KEY = "freelon::carrier::claim::v1";

export function getLastClaimDay(): number {
  if (typeof window === "undefined") return -1;
  return parseInt(localStorage.getItem(CLAIM_KEY) || "-1", 10);
}

export function canClaimToday(): boolean {
  return getLastClaimDay() < Math.floor(Date.now() / 86400000);
}

export function claimDaily(): CarrierState | null {
  const cur = loadCarrier();
  if (!cur) return null;
  if (!canClaimToday()) return cur;
  const today = Math.floor(Date.now() / 86400000);
  const earned = 10;
  const next: CarrierState = {
    ...cur,
    hexPoints: cur.hexPoints + earned,
    totalEarned: cur.totalEarned + earned,
  };
  save(next);
  localStorage.setItem(CLAIM_KEY, String(today));
  return next;
}

export function tier(rank: number): { name: string; color: string } {
  if (rank >= 80) return { name: "BEARER",  color: "#c8aa64" };
  if (rank >= 55) return { name: "RELAY",   color: "#e6e1d2" };
  if (rank >= 30) return { name: "CARRIER", color: "#a8a59a" };
  if (rank >= 10) return { name: "ECHO",    color: "#888888" };
  return                  { name: "DARK",    color: "#4a4a4a" };
}

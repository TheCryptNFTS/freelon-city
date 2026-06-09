/**
 * City Dispatch — the async "send a citizen into the city" loop. The holder
 * dispatches a citizen; it's OUT in the city for a timer; when they return the
 * mission resolves into a canonical event on the public record ("while you were
 * away, #2268 …"). Delivers the playable-identity "offline life" feeling on
 * serverless with NO cron: a dispatch RESOLVES LAZILY on the next read after its
 * resolveAt (idempotent via an atomic GETDEL claim).
 *
 * v1 is FREE + daily-capped (the daily cap is enforced in the route) and
 * STATUS-ONLY — the outcome is a deterministic, server-templated narrative from
 * a fixed allowlist (no user text, no LLM → injection-safe; no HEX, no artifact/
 * reputation reward → not farmable). It builds the citizen's PUBLIC STORY (the
 * districts-visited / missions-run chronicle), which is provenance, not currency.
 * A HEX-staked tier that feeds the artifact/civ-tally loop is a clean follow-up.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

const DURATION_MIN = Math.max(0, Number(process.env.DISPATCH_DURATION_MIN ?? 10));
const LOG_CAP = 20;

type Dispatch = { key: string; district: string; brief: string; outcomes: string[] };

// Server-side allowlist. Every word that can land on the public record lives
// here — there is no user-supplied text anywhere in a dispatch outcome.
const DISPATCHES: Dispatch[] = [
  { key: "red-district", district: "the Red District", brief: "ran a route through", outcomes: ["returned carrying a corrupted packet", "logged a sighting beneath the ember towers", "slipped past a Red Corruption patrol", "came back with a scorched relic"] },
  { key: "ash-wastes", district: "the Ash Wastes", brief: "crossed", outcomes: ["mapped a dead sector", "recovered a fragment from the salt-flats", "weathered a dust-storm alone", "found an unindexed transmission"] },
  { key: "data-temple", district: "the Data Temple", brief: "entered", outcomes: ["decoded a fragment of old signal", "sat in the glass cathedral until dusk", "copied a forbidden glyph", "heard the choir of static"] },
  { key: "signal-core", district: "the Signal Core", brief: "descended into", outcomes: ["repaired a broken transmission", "stabilised a failing relay", "traced the signal to its source", "logged an anomaly in the Core"] },
  { key: "undercity", district: "the flooded undercity", brief: "went down to", outcomes: ["recovered a lost citizen's tag", "waded the black water for an hour", "found a sealed archive door", "mapped a forgotten tunnel"] },
  { key: "dead-antenna", district: "the dead antenna fields", brief: "patrolled", outcomes: ["caught a returning echo", "stood watch beneath the silent masts", "recorded a ghost-signal", "marked a fault for repair"] },
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export type ActiveDispatch = { key: string; district: string; sentAt: number; resolveAt: number };
export type DispatchEvent = { ts: number; district: string; line: string };
export type DispatchState = {
  status: "idle" | "out" | "resolved";
  active: ActiveDispatch | null;
  secondsLeft: number;
  /** Present only on the read where a pending dispatch just resolved. */
  justResolved: DispatchEvent | null;
  recent: DispatchEvent[];
};

const activeKey = (id: number) => `freelon:dispatch:active:${id}`;
const logKey = (id: number) => `freelon:dispatch:log:${id}`;

// Dev-only fallback (no Upstash locally). Production always has Upstash.
type Mem = { active: Map<number, ActiveDispatch>; log: Map<number, DispatchEvent[]> };
const g = globalThis as unknown as { __dispatchMem?: Mem };
const mem: Mem = g.__dispatchMem ?? (g.__dispatchMem = { active: new Map(), log: new Map() });

function id4(n: number): string { return n.toString().padStart(4, "0"); }

function buildEvent(tokenId: number, a: ActiveDispatch): DispatchEvent {
  const d = DISPATCHES.find((x) => x.key === a.key) ?? DISPATCHES[0];
  const outcome = d.outcomes[hash(`${tokenId}:${a.sentAt}`) % d.outcomes.length];
  return { ts: Date.now(), district: d.district, line: `#${id4(tokenId)} ${d.brief} ${d.district} — ${outcome}.` };
}

async function readActive(tokenId: number): Promise<ActiveDispatch | null> {
  if (!hasUpstash) return mem.active.get(tokenId) ?? null;
  const raw = await upstash(["GET", activeKey(tokenId)]).catch(() => null);
  if (typeof raw !== "string") return null;
  try { return JSON.parse(raw) as ActiveDispatch; } catch { return null; }
}

async function pushLog(tokenId: number, ev: DispatchEvent): Promise<void> {
  if (!hasUpstash) {
    const arr = mem.log.get(tokenId) ?? mem.log.set(tokenId, []).get(tokenId)!;
    arr.unshift(ev);
    arr.splice(LOG_CAP);
    return;
  }
  await upstash(["LPUSH", logKey(tokenId), JSON.stringify(ev)]).catch(() => {});
  await upstash(["LTRIM", logKey(tokenId), "0", String(LOG_CAP - 1)]).catch(() => {});
}

export async function getDispatchLog(tokenId: number): Promise<DispatchEvent[]> {
  if (!hasUpstash) return (mem.log.get(tokenId) ?? []).slice(0, LOG_CAP);
  const raw = await upstash(["LRANGE", logKey(tokenId), "0", String(LOG_CAP - 1)]).catch(() => []);
  const arr = Array.isArray(raw) ? (raw as string[]) : [];
  return arr.map((s) => { try { return JSON.parse(s) as DispatchEvent; } catch { return null; } }).filter((e): e is DispatchEvent => !!e);
}

/** Atomically claim + resolve a pending dispatch whose timer has elapsed. The
 *  GETDEL makes it idempotent — concurrent reads can't double-write the event. */
async function resolveIfReady(tokenId: number): Promise<DispatchEvent | null> {
  if (!hasUpstash) {
    const a = mem.active.get(tokenId);
    if (!a || Date.now() < a.resolveAt) return null;
    mem.active.delete(tokenId);
    const ev = buildEvent(tokenId, a);
    await pushLog(tokenId, ev);
    return ev;
  }
  const a = await readActive(tokenId);
  if (!a || Date.now() < a.resolveAt) return null;
  const claimed = await upstash(["GETDEL", activeKey(tokenId)]).catch(() => null);
  if (typeof claimed !== "string") return null; // someone else resolved it
  let parsed: ActiveDispatch;
  try { parsed = JSON.parse(claimed) as ActiveDispatch; } catch { return null; }
  const ev = buildEvent(tokenId, parsed);
  await pushLog(tokenId, ev);
  return ev;
}

/** Send a citizen on a dispatch. No-op (returns the existing one) if it's
 *  already out — one dispatch per citizen at a time. The daily cap is enforced
 *  by the route's atomic claim. */
export async function sendDispatch(tokenId: number): Promise<ActiveDispatch> {
  const existing = await readActive(tokenId);
  if (existing && Date.now() < existing.resolveAt) return existing;
  const d = DISPATCHES[hash(`${tokenId}:${Math.floor(Date.now() / 60000)}`) % DISPATCHES.length];
  const now = Date.now();
  const active: ActiveDispatch = { key: d.key, district: d.district, sentAt: now, resolveAt: now + DURATION_MIN * 60_000 };
  if (!hasUpstash) { mem.active.set(tokenId, active); }
  else {
    const ttl = Math.ceil(DURATION_MIN * 60) + 3600; // timer + 1h grace to resolve
    await upstash(["SET", activeKey(tokenId), JSON.stringify(active), "EX", String(ttl)]).catch(() => {});
  }
  return active;
}

/** Read the current dispatch state, resolving a finished one on the way (the
 *  "while you were away" moment). */
export async function getDispatchState(tokenId: number): Promise<DispatchState> {
  const justResolved = await resolveIfReady(tokenId);
  const active = justResolved ? null : await readActive(tokenId);
  const recent = await getDispatchLog(tokenId);
  const secondsLeft = active ? Math.max(0, Math.ceil((active.resolveAt - Date.now()) / 1000)) : 0;
  const status: DispatchState["status"] = active ? "out" : justResolved ? "resolved" : "idle";
  return { status, active, secondsLeft, justResolved, recent };
}

/**
 * Notifications store — per-wallet inbox + delivery dedupe.
 *
 * Each notification is an Event with:
 *   - kind: what triggered it (decay-warning, snipe-flag, etc)
 *   - body: short copy already formatted for display + DM
 *   - href: where to send the user (on-site link)
 *   - eventKey: idempotency token. We never deliver the same eventKey
 *     twice to the same wallet — guards against duplicate DMs when the
 *     cron retries or runs slow.
 *
 * Storage:
 *   freelon:notif:v1:inbox:<wallet>       → list (LPUSH, capped 50)
 *   freelon:notif:v1:delivered:<wallet>:<eventKey> → marker (90d TTL)
 *   freelon:notif:v1:prefs:<wallet>       → { dmEnabled, kindsOptOut[] }
 *
 * Two delivery rails (always tried in order, never both):
 *   1. X DM (if user has dmEnabled + active X session bind)
 *   2. On-site inbox card (always written so user sees it next visit)
 */

export type NotifKind =
  | "decay-warning"          // 3 days before passive earnings pause
  | "streak-milestone-soon"  // T-1 before 7d / 30d streak unlock
  | "watchlist-flag"         // a citizen they watch flagged Red Signal
  | "transmission-boosted"   // their transmission got a paid boost
  | "civ-wars-monday"        // weekly reset notification
  | "civ-wars-mid-week"      // Thursday standings update
  | "snipe-matured"          // their 14-day snipe hold completed, bounty paid
  | "fresh-citizen"          // first citizen acquired (welcome)
  | "sweep-burst";           // 5+ citizens swept in 4h window — broadcast to all holders

export type NotifEvent = {
  /** Event identity. eventKey makes (wallet, eventKey) globally unique. */
  eventKey: string;
  kind: NotifKind;
  /** Short copy: 1 sentence. Used for both on-site inbox + X DM. */
  body: string;
  /** Where the user should land if they tap the notification. */
  href: string;
  ts: number;
};

export type NotifPrefs = {
  /** Master on/off for X DMs. Off by default until user opts in. */
  dmEnabled: boolean;
  /** Per-kind opt-out — empty means all enabled. */
  optOut: NotifKind[];
};

const memory = new Map<string, NotifEvent[]>();
const memDelivered = new Set<string>();        // "wallet:eventKey"
const memPrefs = new Map<string, NotifPrefs>();
const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const KEY_INBOX = (w: string) => `freelon:notif:v1:inbox:${w.toLowerCase()}`;
const KEY_DELIVERED = (w: string, k: string) =>
  `freelon:notif:v1:delivered:${w.toLowerCase()}:${k}`;
const KEY_PREFS = (w: string) => `freelon:notif:v1:prefs:${w.toLowerCase()}`;

const INBOX_CAP = 50;
const DELIVERED_TTL_SEC = 90 * 86400;

async function upstash(cmd: string[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/${cmd.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const j = (await res.json()) as { result: unknown };
  return j.result;
}

// ─── Dedupe ──────────────────────────────────────────────────────────

/** Returns true if this is the first time we're delivering this event
 *  to this wallet. Pass through to the DM rail + write the inbox card.
 *  Subsequent calls return false. */
export async function markDelivered(wallet: string, eventKey: string): Promise<boolean> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) {
    const k = `${w}:${eventKey}`;
    if (memDelivered.has(k)) return false;
    memDelivered.add(k);
    return true;
  }
  try {
    // SET NX — true if we set, false if it already existed
    const r = await upstash(["SET", KEY_DELIVERED(w, eventKey), "1", "NX", "EX", String(DELIVERED_TTL_SEC)]);
    return r === "OK";
  } catch {
    return false;
  }
}

// ─── Inbox CRUD ──────────────────────────────────────────────────────

export async function pushInbox(wallet: string, ev: NotifEvent): Promise<void> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) {
    const cur = memory.get(w) || [];
    cur.unshift(ev);
    memory.set(w, cur.slice(0, INBOX_CAP));
    return;
  }
  try {
    await upstash(["LPUSH", KEY_INBOX(w), JSON.stringify(ev)]);
    await upstash(["LTRIM", KEY_INBOX(w), "0", String(INBOX_CAP - 1)]);
  } catch {/* non-fatal */}
}

export async function getInbox(wallet: string, limit = 20): Promise<NotifEvent[]> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) return (memory.get(w) || []).slice(0, limit);
  try {
    const raws = (await upstash(["LRANGE", KEY_INBOX(w), "0", String(limit - 1)])) as string[];
    return (raws || []).map((r) => {
      try { return JSON.parse(r) as NotifEvent; } catch { return null; }
    }).filter((x): x is NotifEvent => !!x);
  } catch {
    return [];
  }
}

export async function clearInbox(wallet: string): Promise<void> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) {
    memory.delete(w);
    return;
  }
  try { await upstash(["DEL", KEY_INBOX(w)]); } catch {}
}

// ─── Prefs ───────────────────────────────────────────────────────────

const DEFAULT_PREFS: NotifPrefs = { dmEnabled: false, optOut: [] };

export async function getPrefs(wallet: string): Promise<NotifPrefs> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) return memPrefs.get(w) ?? DEFAULT_PREFS;
  try {
    const raw = (await upstash(["GET", KEY_PREFS(w)])) as string | null;
    if (!raw) return DEFAULT_PREFS;
    return JSON.parse(raw) as NotifPrefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setPrefs(wallet: string, prefs: NotifPrefs): Promise<void> {
  const w = wallet.toLowerCase();
  if (!hasUpstash) {
    memPrefs.set(w, prefs);
    return;
  }
  try { await upstash(["SET", KEY_PREFS(w), JSON.stringify(prefs)]); } catch {}
}

// ─── High-level deliver ──────────────────────────────────────────────

/** Deliver a notification. Always writes to the on-site inbox.
 *  Returns true if delivered (was new), false if deduped. */
export async function deliver(wallet: string, ev: NotifEvent): Promise<boolean> {
  const isNew = await markDelivered(wallet, ev.eventKey);
  if (!isNew) return false;
  await pushInbox(wallet, ev);
  return true;
}

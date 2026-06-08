/**
 * DAILY TRANSMISSION — one short in-character signal per citizen per UTC day.
 * The owner broadcasts it (bounded, daily); it is then cached and PUBLIC so it
 * can be shared to X. Cached by (tokenId, UTC-day) so it costs one run a day and
 * reads identically to everyone for that day.
 *
 * In-memory Map in dev; Upstash REST (24h TTL) in prod.
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";

export type Transmission = { text: string; day: string; at: number };

const memory = new Map<string, Transmission>();
const KEY = (id: number, day: string) => `freelon:transmission:v1:${id}:${day}`;

export function utcDay(): string { return new Date().toISOString().slice(0, 10); }

export async function getTransmission(tokenId: number, day = utcDay()): Promise<Transmission | null> {
  const k = KEY(tokenId, day);
  if (!hasUpstash) return memory.get(k) ?? null;
  const raw = (await upstash(["GET", k])) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as Transmission; } catch { return null; }
}

export async function setTransmission(tokenId: number, text: string): Promise<Transmission> {
  const day = utcDay();
  const rec: Transmission = { text, day, at: Date.now() };
  const k = KEY(tokenId, day);
  if (!hasUpstash) { memory.set(k, rec); return rec; }
  await upstash(["SET", k, JSON.stringify(rec)]);
  await upstash(["EXPIRE", k, String(26 * 60 * 60)]).catch(() => {});
  return rec;
}

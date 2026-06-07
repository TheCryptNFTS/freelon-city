/**
 * Server-side backup of the agent-workspace conversation threads.
 *
 * The workspace keeps threads in localStorage for instant, no-wallet use. This
 * store is the DURABLE, cross-device copy so a holder's chats survive a browser
 * clear or a new device. It is keyed by WALLET + subject (not bare tokenId):
 * chat content is personal, so it stays private to the wallet that wrote it and
 * does NOT leak to the next owner on a resale. (The public, NFT-bound record —
 * work history, dossier, level — already lives server-side separately.)
 *
 * The blob is opaque to the server (the client's threads JSON). Size is capped
 * at the API layer. In-memory Map in dev; Upstash REST in prod.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type ThreadBlob = { threads: unknown[]; activeId: string; savedAt: number };

const memory = new Map<string, ThreadBlob>();

/** wallet is lowercased; subject is `${slug}:${id}` or `${id}`. */
const KEY = (wallet: string, subject: string) => `freelon:ws:srv:v1:${wallet}:${subject}`;

export async function getThreadBlob(wallet: string, subject: string): Promise<ThreadBlob | null> {
  const k = KEY(wallet.toLowerCase(), subject);
  if (!hasUpstash) return memory.get(k) ?? null;
  const raw = (await upstash(["GET", k])) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as ThreadBlob; } catch { return null; }
}

export async function setThreadBlob(
  wallet: string,
  subject: string,
  threads: unknown[],
  activeId: string,
): Promise<void> {
  const blob: ThreadBlob = { threads, activeId, savedAt: Date.now() };
  const k = KEY(wallet.toLowerCase(), subject);
  if (!hasUpstash) { memory.set(k, blob); return; }
  await upstash(["SET", k, JSON.stringify(blob)]);
}

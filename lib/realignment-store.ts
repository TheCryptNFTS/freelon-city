/**
 * Civilization realignment registry for Common-tier citizens.
 * Holders sign a message, server verifies signature + ownership, alignment is stored.
 * On-chain trait remains original — this is purely an off-chain overlay.
 *
 * In-memory for dev. Upstash REST for prod.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type Realignment = {
  citizenId: number;
  originalCiv: string;
  alignedCiv: string;
  owner: string; // lowercased address at time of realignment
  setAt: number;
};

const memory = new Map<number, Realignment>();

const KEY = (id: number) => `freelon:realign:v1:${id}`;

export async function getRealignment(citizenId: number): Promise<Realignment | null> {
  if (!hasUpstash) return memory.get(citizenId) ?? null;
  const raw = (await upstash(["GET", KEY(citizenId)])) as string | null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Realignment;
  } catch {
    return null;
  }
}

export async function setRealignment(rec: Realignment): Promise<void> {
  const stored: Realignment = { ...rec, owner: rec.owner.toLowerCase() };
  if (!hasUpstash) {
    memory.set(stored.citizenId, stored);
    return;
  }
  await upstash(["SET", KEY(stored.citizenId), JSON.stringify(stored)]);
}

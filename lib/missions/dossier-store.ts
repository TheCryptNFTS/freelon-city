/**
 * Citizen Dossier — the persistent file a citizen keeps on its owner/project.
 * This is the moat ChatGPT structurally can't match: owned, persistent context
 * that every future mission can read, so the agent visibly gets sharper over
 * time. Keyed by tokenId (survives sale, like all progression).
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";

export type Dossier = {
  tokenId: number;
  /** The living profile text the citizen maintains (positioning, voice, goals…). */
  profile: string;
  updatedAt: number;
  updates: number;
};

const KEY = (tokenId: number) => `freelon:dossier:v1:${tokenId}`;
const mem = new Map<number, Dossier>();

export async function getDossier(tokenId: number): Promise<Dossier | null> {
  if (!hasUpstash) return mem.get(tokenId) ?? null;
  try {
    const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
    return raw ? (JSON.parse(raw) as Dossier) : null;
  } catch {
    return null;
  }
}

export async function setDossier(tokenId: number, profile: string): Promise<Dossier> {
  const prev = await getDossier(tokenId);
  const rec: Dossier = {
    tokenId,
    profile: profile.slice(0, 4000),
    updatedAt: Date.now(),
    updates: (prev?.updates ?? 0) + 1,
  };
  if (!hasUpstash) {
    mem.set(tokenId, rec);
    return rec;
  }
  await upstash(["SET", KEY(tokenId), JSON.stringify(rec)]);
  return rec;
}

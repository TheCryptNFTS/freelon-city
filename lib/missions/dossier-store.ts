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

/** Cap the dossier profile at the same 4000-char limit setDossier enforces,
 *  but by dropping the OLDEST whole lines first (newest context is the most
 *  useful), so an auto-grown dossier degrades gracefully instead of being
 *  hard-sliced mid-sentence. */
const DOSSIER_MAX = 4000;
function capByLines(text: string): string {
  if (text.length <= DOSSIER_MAX) return text;
  const lines = text.split("\n");
  while (lines.length > 1 && lines.join("\n").length > DOSSIER_MAX) {
    lines.shift(); // drop oldest line
  }
  // Single oversized line (or still over): hard-trim from the front, keep newest.
  return lines.join("\n").slice(-DOSSIER_MAX);
}

/**
 * Append ONE distilled line to the dossier and persist, oldest-line-capped.
 * This is how a free holder's agent sharpens automatically from real use — no
 * manual mission required. The manual setDossier path is untouched. Returns the
 * updated record. Callers must wrap this fail-safe: never let it break a run.
 */
export async function appendDossierLine(tokenId: number, line: string): Promise<Dossier> {
  const clean = line.replace(/\s+/g, " ").trim();
  const prev = await getDossier(tokenId);
  const base = prev?.profile ?? "";
  const next = base ? `${base}\n${clean}` : clean;
  return setDossier(tokenId, capByLines(next));
}

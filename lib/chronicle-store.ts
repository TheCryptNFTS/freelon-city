/**
 * THE CHRONICLE — a citizen's own evolving backstory, written in its voice and
 * accreting one chapter at a time. Keyed by tokenId, so it is BOUND TO THE NFT
 * and survives resale: the next owner inherits everything the character has
 * become. This is the "proprietary data that travels with the asset" moat — a
 * thin chatbot wrapper has nothing like it.
 *
 * In-memory Map in dev; Upstash REST (append-style) in prod.
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";

export type ChronicleChapter = { n: number; text: string; at: number };

const memory = new Map<number, ChronicleChapter[]>();
const KEY = (id: number) => `freelon:chronicle:v1:${id}`;
const MAX_CHAPTERS = 24;

export async function getChronicle(tokenId: number): Promise<ChronicleChapter[]> {
  if (!hasUpstash) return memory.get(tokenId) ?? [];
  const raw = (await upstash(["GET", KEY(tokenId)])) as string | null;
  if (!raw) return [];
  try { return JSON.parse(raw) as ChronicleChapter[]; } catch { return []; }
}

/** Append a chapter (auto-numbered), capped at MAX_CHAPTERS (drops the oldest). */
export async function addChapter(tokenId: number, text: string): Promise<ChronicleChapter[]> {
  const existing = await getChronicle(tokenId);
  const next: ChronicleChapter = { n: (existing[existing.length - 1]?.n ?? 0) + 1, text, at: Date.now() };
  const updated = [...existing, next].slice(-MAX_CHAPTERS);
  if (!hasUpstash) { memory.set(tokenId, updated); return updated; }
  await upstash(["SET", KEY(tokenId), JSON.stringify(updated)]);
  return updated;
}

/** A compact recap of the story so far, to seed the next chapter's generation. */
export function chronicleDigest(chapters: ChronicleChapter[], max = 4): string {
  if (chapters.length === 0) return "";
  return chapters.slice(-max).map((c) => `Chapter ${c.n}: ${c.text}`).join("\n\n").slice(0, 1800);
}

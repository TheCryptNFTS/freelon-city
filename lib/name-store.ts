/**
 * Custom display-name registry for citizens.
 * Holders sign a message, server verifies signature + ownership, name is stored.
 *
 * In-memory for dev. Upstash REST for prod.
 */

import { upstash, hasUpstash } from "@/lib/upstash-client";

export type NameRecord = { name: string; owner: string; setAt: number };

const memory = new Map<number, NameRecord>();

const KEY = (id: number) => `freelon:name:v1:${id}`;

export async function getName(citizenId: number): Promise<NameRecord | null> {
  if (!hasUpstash) return memory.get(citizenId) ?? null;
  const raw = (await upstash(["GET", KEY(citizenId)])) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as NameRecord; } catch { return null; }
}

export async function setName(citizenId: number, name: string, owner: string): Promise<void> {
  const rec: NameRecord = { name, owner: owner.toLowerCase(), setAt: Date.now() };
  if (!hasUpstash) { memory.set(citizenId, rec); return; }
  await upstash(["SET", KEY(citizenId), JSON.stringify(rec)]);
}

const NAME_RE = /^[A-Za-z0-9 _-]{1,32}$/;
export function validName(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name !== name.trim()) return false;
  return NAME_RE.test(name);
}

export type NameEntry = { citizenId: number; name: string; owner: string; setAt: number };

export async function listNames(limit = 200): Promise<NameEntry[]> {
  if (!hasUpstash) {
    const out: NameEntry[] = [];
    for (const [citizenId, rec] of memory) {
      out.push({ citizenId, name: rec.name, owner: rec.owner, setAt: rec.setAt });
    }
    out.sort((a, b) => b.setAt - a.setAt);
    return out.slice(0, limit);
  }
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const pattern = "freelon:name:v1:*";
    const keys: string[] = [];
    let cursor = "0";
    let pages = 0;
    do {
      const res = await fetch(
        `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      if (!res.ok) break;
      const j = (await res.json()) as { result: [string, string[]] };
      cursor = j.result[0];
      for (const k of j.result[1]) keys.push(k);
      pages++;
      if (keys.length >= limit || pages > 10) break;
    } while (cursor !== "0");

    if (keys.length === 0) return [];

    const mgetUrl = `${url}/MGET/${keys.map((k) => encodeURIComponent(k)).join("/")}`;
    const mr = await fetch(mgetUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!mr.ok) return [];
    const mj = (await mr.json()) as { result: (string | null)[] };

    const out: NameEntry[] = [];
    for (let i = 0; i < keys.length; i++) {
      const raw = mj.result[i];
      if (!raw) continue;
      const key = keys[i];
      const idStr = key.replace(/^freelon:name:v1:/, "");
      const citizenId = Number.parseInt(idStr, 10);
      if (!Number.isFinite(citizenId)) continue;
      try {
        const rec = JSON.parse(raw) as NameRecord;
        out.push({
          citizenId,
          name: rec.name,
          owner: rec.owner,
          setAt: rec.setAt,
        });
      } catch {}
    }
    out.sort((a, b) => b.setAt - a.setAt);
    return out.slice(0, limit);
  } catch {
    return [];
  }
}

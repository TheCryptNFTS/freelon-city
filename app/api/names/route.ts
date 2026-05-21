import { NextResponse } from "next/server";

export const revalidate = 300;

type NameEntry = { citizenId: number; name: string; owner: string; setAt: number };
type Rec = { name: string; owner: string; setAt: number };

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

export async function GET() {
  const names = await scanNames();
  names.sort((a, b) => b.setAt - a.setAt);
  return NextResponse.json({ names: names.slice(0, 200) });
}

async function scanNames(): Promise<NameEntry[]> {
  if (!hasUpstash) return [];
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
    const pattern = "freelon:name:v1:*";
    const keys: string[] = [];
    let cursor = "0";
    let pages = 0;
    do {
      const res = await fetch(
        `${url}/SCAN/${encodeURIComponent(cursor)}/MATCH/${encodeURIComponent(pattern)}/COUNT/200`,
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
      if (keys.length >= 200 || pages > 10) break;
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
        const rec = JSON.parse(raw) as Rec;
        out.push({
          citizenId,
          name: rec.name,
          owner: rec.owner,
          setAt: rec.setAt,
        });
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

import Link from "next/link";
import citizensData from "@/data/citizens.json";
import { CIVILIZATIONS, imageUrl } from "@/lib/constants";

export const revalidate = 300;

type NameEntry = { citizenId: number; name: string; owner: string; setAt: number };
type Citizen = { id: number; civilization: string; name?: string; tier?: string };

const citizens = citizensData as Citizen[];

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`.toLowerCase();
}

function timeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

async function loadNames(): Promise<NameEntry[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "";
    const url = base ? `${base}/api/names` : `http://localhost:${process.env.PORT || 3000}/api/names`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const j = (await res.json()) as { names: NameEntry[] };
    return j.names || [];
  } catch {
    return [];
  }
}

export default async function NamesPage() {
  const names = await loadNames();

  return (
    <main className="names-page">
      <span className="kicker">⬡ CARVED INTO THE CITY</span>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.96, letterSpacing: "-0.02em", margin: "12px 0 8px" }}>
        Name <em style={{ color: "var(--gold-bright)", fontStyle: "normal" }}>Hall of Fame</em>
      </h1>
      <p style={{ color: "var(--ink-2)", maxWidth: 640 }}>
        Holders burned hex to rename their citizens. These names are permanent on the city ledger.
      </p>

      {names.length === 0 ? (
        <div style={{ marginTop: 48, padding: 32, border: "1px solid var(--line)", textAlign: "center", color: "var(--ink-dim)" }}>
          No citizens have been named yet. Be the first.
        </div>
      ) : (
        <div className="names-list">
          {names.map((n) => {
            const cit = citizens[n.citizenId - 1];
            const civSlug = cit?.civilization;
            const civ = civSlug ? (CIVILIZATIONS as Record<string, { name: string; color: string; doctrine: string }>)[civSlug] : undefined;
            const padded = n.citizenId.toString().padStart(4, "0");
            return (
              <Link key={n.citizenId} href={`/citizens/${n.citizenId}`} className="name-card" style={civ ? ({ borderColor: `${civ.color}40` } as React.CSSProperties) : undefined}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(n.citizenId)} alt={n.name} loading="lazy" />
                <div>
                  <div className="id">#{padded}{civ ? ` · ${civ.doctrine.toUpperCase()}` : ""}</div>
                  <div className="custom">{n.name}</div>
                  <div className="meta" style={civ ? { color: civ.color } : undefined}>
                    {civ?.name.toUpperCase() || ""}
                  </div>
                  <div className="meta">
                    NAMED BY {shortAddr(n.owner)} · {timeAgo(n.setAt)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}

/**
 * CanonNames — the Name Hall of Fame, folded into /canon#names
 * (2026-05-31). Migrated from the /names page so the canonical reference
 * library holds the ledger of carved citizen names. Async server
 * component — loads the live name ledger and renders the same cards.
 */
import Link from "next/link";
import citizensData from "@/data/citizens.json";
import { CIVILIZATIONS, gridImageUrl } from "@/lib/constants";
import { listNames, type NameEntry } from "@/lib/name-store";

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
    return await listNames(200);
  } catch {
    return [];
  }
}

export async function CanonNames() {
  const names = await loadNames();

  return (
    <div style={{ marginTop: "var(--s-3)", paddingTop: "var(--s-3)", borderTop: "1px dashed var(--line)" }}>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, margin: "0 0 var(--s-3)" }}>
        Carriers burned hex to name their citizens. Carved into the ledger. Permanent. 100 ⬡ names a citizen forever; custom names surface across the city.
      </p>

      {names.length === 0 ? (
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.7, margin: "0 0 var(--s-3)" }}>
          The wall is blank — no citizen has been named yet. Be the first carved.
        </p>
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
                <img src={gridImageUrl(n.citizenId)} alt={n.name} loading="lazy" />
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
    </div>
  );
}

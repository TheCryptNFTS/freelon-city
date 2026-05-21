import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { heroImageUrl } from "@/lib/constants";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "The Graveyard ⬡ · FREELON CITY",
  description:
    "Citizens abandoned by their previous carriers. Some signals do not survive transfer.",
};

const COLLECTION_SLUG = "freelons";
const MAX_PAGES = 4;
const ZERO = "0x0000000000000000000000000000000000000000";

type TransferRow = {
  tokenId: number;
  name: string | null;
  from: string;
  to: string;
  ts: number | null;
};

type RawEvent = {
  nft?: { identifier?: string; name?: string };
  from_address?: string;
  to_address?: string;
  event_timestamp?: number;
};

async function fetchTransfers(): Promise<TransferRow[]> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return [];
  const out: TransferRow[] = [];
  let next: string | null = null;
  let pages = 0;
  try {
    do {
      const url: string = next
        ? `https://api.opensea.io/api/v2/events/collection/${COLLECTION_SLUG}?event_type=transfer&limit=50&next=${encodeURIComponent(next)}`
        : `https://api.opensea.io/api/v2/events/collection/${COLLECTION_SLUG}?event_type=transfer&limit=50`;
      const res = await fetch(url, {
        headers: { "X-API-KEY": apiKey, accept: "application/json" },
        next: { revalidate: 300 },
      });
      if (!res.ok) break;
      const data: { asset_events?: RawEvent[]; next?: string | null } =
        await res.json();
      const arr = data.asset_events || [];
      for (const e of arr) {
        const idStr = e.nft?.identifier;
        if (!idStr) continue;
        const tokenId = Number(idStr);
        if (!Number.isFinite(tokenId)) continue;
        out.push({
          tokenId,
          name: e.nft?.name ?? null,
          from: (e.from_address || "").toLowerCase(),
          to: (e.to_address || "").toLowerCase(),
          ts: e.event_timestamp ?? null,
        });
      }
      next = data.next ?? null;
      pages++;
    } while (next && pages < MAX_PAGES);
  } catch {
    return out;
  }
  return out;
}

function shortAddr(a: string) {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function timeAgo(ts: number | null | undefined) {
  if (!ts) return "—";
  const sec = Math.floor(Date.now() / 1000 - ts);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default async function GraveyardPage() {
  const transfers = await fetchTransfers();
  const filtered = transfers.filter(
    (t) =>
      t.from &&
      t.to &&
      t.from !== ZERO &&
      t.to !== ZERO &&
      t.from !== t.to,
  );

  // For "days held" we approximate: find the prior transfer of the same token (older ts)
  // within our fetched window. If none, leave as null.
  const byToken = new Map<number, TransferRow[]>();
  for (const t of transfers) {
    const arr = byToken.get(t.tokenId) ?? [];
    arr.push(t);
    byToken.set(t.tokenId, arr);
  }
  for (const arr of byToken.values()) {
    arr.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  }

  function daysHeld(row: TransferRow): number | null {
    const arr = byToken.get(row.tokenId);
    if (!arr || row.ts == null) return null;
    const idx = arr.findIndex((x) => x === row);
    if (idx < 0 || idx >= arr.length - 1) return null;
    const prior = arr[idx + 1];
    if (!prior?.ts) return null;
    return Math.max(0, Math.floor((row.ts - prior.ts) / 86400));
  }

  return (
    <main className="graveyard-page">
      <span className="kicker">⬡ THE GRAVEYARD</span>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(48px, 8vw, 96px)",
          lineHeight: 0.94,
          letterSpacing: "-0.02em",
          marginTop: "var(--s-3)",
        }}
      >
        Some signals <em>do not survive transfer</em>
      </h1>
      <p
        className="lead"
        style={{ maxWidth: 720, marginTop: "var(--s-3)", color: "var(--ink-2)" }}
      >
        Citizens abandoned by their previous carriers. Recorded as the city
        watches them change hands.
      </p>

      <section style={{ marginTop: "var(--s-7)" }}>
        {filtered.length === 0 ? (
          <p
            style={{
              color: "var(--ink-dim)",
              fontFamily: "var(--mono2)",
              fontSize: 12,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "var(--s-5) 0",
              borderTop: "1px solid var(--line)",
            }}
          >
            The graveyard is silent. No recent transfers.
          </p>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr auto auto",
                gap: "var(--s-3)",
                padding: "8px 0",
                fontFamily: "var(--mono2)",
                fontSize: 10,
                letterSpacing: "0.22em",
                color: "var(--ink-dim)",
                textTransform: "uppercase",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <span>CITIZEN</span>
              <span>FORMER → NEW CARRIER</span>
              <span>HELD</span>
              <span>WHEN</span>
            </div>
            {filtered.map((t, i) => {
              const held = daysHeld(t);
              return (
                <div key={`${t.tokenId}-${t.ts}-${i}`} className="grave-row">
                  <Link href={`/citizens/${t.tokenId}`}>
                    <Image
                      src={heroImageUrl(t.tokenId)}
                      alt={`Citizen #${t.tokenId}`}
                      width={56}
                      height={56}
                      unoptimized
                    />
                  </Link>
                  <span>
                    <span className="id">#{String(t.tokenId).padStart(4, "0")}</span>{" "}
                    <Link
                      href={`/wallet/${t.from}`}
                      className="addr"
                      style={{ textDecoration: "none" }}
                    >
                      {shortAddr(t.from)}
                    </Link>
                    <span className="arrow">→</span>
                    <Link
                      href={`/wallet/${t.to}`}
                      className="addr"
                      style={{ textDecoration: "none" }}
                    >
                      {shortAddr(t.to)}
                    </Link>
                  </span>
                  <span className="stat">
                    {held == null ? "—" : `${held}d`}
                  </span>
                  <span
                    style={{
                      color: "var(--ink-dim)",
                      fontFamily: "var(--mono2)",
                      fontSize: 11,
                      letterSpacing: "0.14em",
                    }}
                  >
                    {timeAgo(t.ts)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div
        style={{
          marginTop: "var(--s-7)",
          display: "flex",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <Link className="btn btn-primary" href="/defenders">
          <span className="ttl">FLOOR DEFENDERS →</span>
        </Link>
        <Link className="btn btn-secondary" href="/leaderboard">
          <span className="ttl">LEADERBOARD →</span>
        </Link>
      </div>
    </main>
  );
}

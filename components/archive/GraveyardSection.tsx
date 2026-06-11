/**
 * The Graveyard — folded into /archive (2026-05-31) as <section id="graveyard">,
 * then carried into /collections when /archive became a permanent redirect
 * (2026-06-08). Burned / abandoned citizens: OpenSea transfer records + the
 * city dump ledger. Logic preserved verbatim from the former /graveyard page.
 *
 * Self-contained async server component so any page can simply append it.
 * The OpenSea fetch is cached 300s via fetch revalidate, matching the
 * former page's `revalidate = 300`.
 *
 * `limit` (T7 2026-06-11): cap the visible rows so the section doesn't
 * dominate the page. The remaining rows stay server-rendered inside a
 * <details> disclosure ("FULL RECORD") — no extra route needed, and since
 * /archive now 308s to /collections there is no separate full-table page
 * to link to. Images are lazy, so collapsed rows cost no image fetches.
 */
import Link from "next/link";
import Image from "next/image";
import { heroImageUrl } from "@/lib/constants";
import { listDumpLedger, type DumpLedgerEntry } from "@/lib/ghost-store";

const OPENSEA_COLLECTION_URL = "https://opensea.io/collection/freelons";
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

export async function GraveyardSection({ limit }: { limit?: number } = {}) {
  const [transfers, dumps] = await Promise.all([
    fetchTransfers(),
    listDumpLedger(50).catch((): DumpLedgerEntry[] => []),
  ]);
  const filtered = transfers.filter(
    (t) =>
      t.from &&
      t.to &&
      t.from !== ZERO &&
      t.to !== ZERO &&
      t.from !== t.to,
  );
  // Most recent first — guaranteed, not just assumed from API order.
  filtered.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  dumps.sort((a, b) => b.ts - a.ts);

  const capped = limit != null && filtered.length > limit;
  const visible = capped ? filtered.slice(0, limit) : filtered;
  const overflow = capped ? filtered.slice(limit) : [];
  const dumpsCapped = limit != null && dumps.length > limit;
  const visibleDumps = dumpsCapped ? dumps.slice(0, limit) : dumps;
  const overflowDumps = dumpsCapped ? dumps.slice(limit) : [];

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

  function renderTransferRow(t: TransferRow, i: number) {
    const held = daysHeld(t);
    return (
      <div key={`${t.tokenId}-${t.ts}-${i}`} className="grave-row">
        <Link href={`/citizens/${t.tokenId}`}>
          <Image
            src={heroImageUrl(t.tokenId)}
            alt={`Citizen #${t.tokenId}`}
            width={56}
            height={56}
            loading="lazy"
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
        {/* HELD + WHEN share a wrapper: display:contents on desktop (they
            keep their own grid columns), a flex row with a separator on
            mobile — the old per-child rule pinned both to the SAME grid
            cell, overlapping the duration with the timestamp. */}
        <span className="grave-tail">
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
        </span>
      </div>
    );
  }

  function renderDumpRow(d: DumpLedgerEntry, i: number) {
    const pct = Math.round(d.discount * 100);
    return (
      <div
        key={`${d.tokenId}-${d.ts}-${i}`}
        className="grave-row"
        style={{ gridTemplateColumns: "56px 1fr auto auto auto" }}
      >
        <Link href={`/citizens/${d.tokenId}`}>
          <Image
            src={heroImageUrl(d.tokenId)}
            alt={`Citizen #${d.tokenId}`}
            width={56}
            height={56}
            loading="lazy"
            unoptimized
            style={{ filter: "grayscale(1) brightness(0.45)" }}
          />
        </Link>
        <span>
          <span className="id">#{String(d.tokenId).padStart(4, "0")}</span>{" "}
          <Link href={`/wallet/${d.dumper}`} className="addr" style={{ textDecoration: "none", color: "#b8423d" }}>
            {shortAddr(d.dumper)}
          </Link>
          <span className="arrow">→</span>
          {d.rescuer ? (
            <Link href={`/wallet/${d.rescuer}`} className="addr" style={{ textDecoration: "none", color: "#9ad4a8" }}>
              {shortAddr(d.rescuer)}
            </Link>
          ) : (
            <span style={{ color: "var(--ink-dim)", fontFamily: "var(--mono2)", fontSize: 11 }}>
              DELISTED
            </span>
          )}
        </span>
        <span className="grave-tail">
          <span className="stat" style={{ color: "#b8423d" }}>{pct}%↓</span>
          <span className="stat" style={{ fontFamily: "var(--mono2)", fontSize: 11 }}>
            {d.priceEth.toFixed(3)} Ξ
          </span>
          <span
            style={{
              color: "var(--ink-dim)",
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.14em",
            }}
          >
            {timeAgo(Math.floor(d.ts / 1000))}
          </span>
        </span>
      </div>
    );
  }

  return (
    <section id="graveyard" className="graveyard-page" style={{ marginTop: "var(--s-7)", scrollMarginTop: 96 }}>
      <span className="kicker">⬡ THE GRAVEYARD</span>
      <h2
        style={{
          fontFamily: "var(--display)",
          fontSize: "clamp(40px, 7vw, 80px)",
          lineHeight: 0.94,
          letterSpacing: "-0.02em",
          marginTop: "var(--s-3)",
        }}
      >
        Some signals <em>do not survive transfer</em>
      </h2>
      <p
        className="lead"
        style={{ maxWidth: 720, marginTop: "var(--s-3)", color: "var(--ink-2)" }}
      >
        Citizens abandoned by their carriers. The city records every transfer.
      </p>

      <div style={{ marginTop: "var(--s-6)" }}>
        {filtered.length === 0 ? (
          <section className="empty-hero">
            <span className="kicker">⬡ THE GRAVEYARD IS SILENT</span>
            <h2 className="empty-hero-title">The graveyard is silent</h2>
            <p className="empty-hero-sub">No citizens have left lately. When carriers transfer out, the record lands here — days held, the wallet that let go.</p>
          </section>
        ) : (
          <div>
            <div className="grave-headrow">
              <span>CITIZEN</span>
              <span>FORMER → NEW CARRIER</span>
              <span>HELD</span>
              <span>WHEN</span>
            </div>
            {visible.map(renderTransferRow)}
            {overflow.length > 0 && (
              <details className="grave-more">
                <summary>
                  <span className="grave-more-closed">FULL RECORD · {overflow.length} MORE ↓</span>
                  <span className="grave-more-open">SHOW LESS ↑</span>
                </summary>
                {overflow.map(renderTransferRow)}
              </details>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--s-7)" }}>
        <span className="kicker">⬡ DUMP LEDGER · CITY-VERIFIED</span>
        <h3
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(28px, 4vw, 44px)",
            lineHeight: 1.05,
            marginTop: "var(--s-2)",
          }}
        >
          Citizens dumped under floor
        </h3>
        <p style={{ color: "var(--ink-2)", maxWidth: 680, marginTop: "var(--s-2)" }}>
          Listings priced ≤ 85% of floor for more than 24h are <strong>ghosted</strong>:
          the city replaces image, name, and civ color with SIGNAL LOST on every surface.
          When a rescuer buys, attribution is permanent and the dumper&apos;s hex burns
          proportional to the discount.
        </p>
        {dumps.length === 0 ? (
          <div
            style={{
              marginTop: "var(--s-4)",
              padding: "var(--s-4)",
              border: "1px dashed var(--line)",
              color: "var(--ink-dim)",
              fontFamily: "var(--mono2)",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            No dumps recorded. The floor holds.
          </div>
        ) : (
          <div style={{ marginTop: "var(--s-4)" }}>
            <div className="grave-headrow grave-headrow--5">
              <span>CITIZEN</span>
              <span>DUMPER → RESCUER</span>
              <span>UNDER FLOOR</span>
              <span>PRICE</span>
              <span>WHEN</span>
            </div>
            {visibleDumps.map(renderDumpRow)}
            {overflowDumps.length > 0 && (
              <details className="grave-more">
                <summary>
                  <span className="grave-more-closed">FULL RECORD · {overflowDumps.length} MORE ↓</span>
                  <span className="grave-more-open">SHOW LESS ↑</span>
                </summary>
                {overflowDumps.map(renderDumpRow)}
              </details>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "var(--s-7)",
          display: "flex",
          gap: "var(--s-3)",
          flexWrap: "wrap",
        }}
      >
        <a
          className="btn btn-primary"
          href={OPENSEA_COLLECTION_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="ttl">BUY ON OPENSEA →</span>
        </a>
        <Link className="btn btn-secondary" href="/dashboard#earners">
          <span className="ttl">THE LEADERBOARD →</span>
        </Link>
      </div>
    </section>
  );
}

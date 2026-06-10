"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useHolder } from "@/lib/useHolder";
import { WalletConnect } from "@/components/WalletConnect";
import { imageUrl } from "@/lib/constants";

type Cit = { id: number; name: string; tier: string; civ: string; color: string };
type Portfolio = {
  citizens: Cit[];
  unlocked: Record<number, { credits: number; tier: string }>;
  unlockedCount: number;
  balance: number;
  truncated: boolean;
};

/**
 * Holder roster — answers "which of my N citizens have I activated, and how many
 * runs are left?" in ONE screen, instead of opening each one. Activated agents
 * glow (awakened) and show their remaining runs; the rest show an "activate"
 * hint. Sorted activated-first so a whale sees their working agents up top.
 */
export function MyCitizens() {
  const h = useHolder();
  const [data, setData] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "activated" | "locked">("all");

  useEffect(() => {
    if (!h.address) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/wallet/${h.address}/portfolio`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Portfolio & { error?: string }) => {
        if (cancelled) return;
        if (j.error) { setErr("Couldn't load your roster — retry."); return; }
        setData(j);
      })
      .catch(() => { if (!cancelled) setErr("Couldn't load your roster — retry."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [h.address]);

  // ── Not connected ──────────────────────────────────────────────────────
  if (!h.loading && !h.address) {
    return (
      <div className="mycit-wrap">
        <header className="mycit-head">
          <span className="kicker">⬡ MY CITIZENS</span>
          <h1>Your roster, in one place</h1>
          <p>Connect your wallet to see every FREELON you hold — which agents you&apos;ve switched on, runs left on each, and what they&apos;ve been building.</p>
          <p className="mycit-noeth">No ETH? You&apos;re not locked out — <Link href="/play">the games</Link> are free, you can <Link href="/demo">chat with an agent</Link>, and Emile / sister-collection agents chat free. ETH only switches on premium powers for your FREELON citizens.</p>
        </header>
        <div className="mycit-connect"><WalletConnect /></div>
      </div>
    );
  }

  const citizens = data?.citizens ?? [];
  const unlocked = data?.unlocked ?? {};
  const sorted = [...citizens].sort((a, b) => {
    const ua = unlocked[a.id] ? 1 : 0;
    const ub = unlocked[b.id] ? 1 : 0;
    if (ua !== ub) return ub - ua; // activated first
    return a.id - b.id;
  });
  const shown = sorted.filter((c) =>
    filter === "all" ? true : filter === "activated" ? !!unlocked[c.id] : !unlocked[c.id],
  );
  const total = citizens.length;
  const activatedCount = data?.unlockedCount ?? 0;

  return (
    <div className="mycit-wrap">
      <header className="mycit-head">
        <span className="kicker">⬡ MY CITIZENS</span>
        <h1>Your roster</h1>
        {(h.loading || loading) ? (
          <p>Reading the chain…</p>
        ) : (
          <p>
            <strong>{total}</strong> held · <strong style={{ color: "var(--gold)" }}>{activatedCount}</strong> awakened
            {activatedCount > 0 ? " (agents switched on)" : " — none switched on yet"}.
            {data?.truncated ? " Showing your first 200." : ""}
          </p>
        )}
      </header>

      {err && <div className="mycit-err">{err}</div>}

      {total > 0 && (
        <div className="mycit-filters">
          {(["all", "activated", "locked"] as const).map((f) => (
            <button
              key={f}
              className={`mycit-filter ${filter === f ? "on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? `All ${total}` : f === "activated" ? `Awakened ${activatedCount}` : `Dormant ${total - activatedCount}`}
            </button>
          ))}
        </div>
      )}

      {!loading && total === 0 && !err && (
        <div className="mycit-empty">
          <p>No FREELONS in this wallet.</p>
          <a className="btn btn-primary" href="https://opensea.io/assets/ethereum/0xa79e73c9828db3fcd7c77be7d9f356fb684b5504" target="_blank" rel="noreferrer">
            <span className="ttl">GET A FREELON ↗</span>
          </a>
        </div>
      )}

      <div className="mycit-grid">
        {shown.map((c) => {
          const u = unlocked[c.id];
          const activated = !!u;
          return (
            <Link
              key={c.id}
              href={`/citizens/${c.id}`}
              className={`mycit-card${activated ? " is-activated" : ""}`}
              style={{ ["--civ" as string]: c.color }}
            >
              <div className="mycit-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(c.id)} alt={c.name} loading="lazy" />
                {activated && <span className="mycit-glyph" aria-label="Awakened">⬡</span>}
              </div>
              <div className="mycit-meta">
                <span className="mycit-id">#{c.id.toString().padStart(4, "0")}</span>
                <span className="mycit-tier">{c.tier}</span>
                {activated ? (
                  <span className="mycit-runs">⬡ {u.credits} runs left</span>
                ) : (
                  <span className="mycit-locked">Dormant</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

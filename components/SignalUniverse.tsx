"use client";
/**
 * <SignalUniverse /> — the /signal portfolio.
 *
 * The destination for the landing's "Your signal" door. Where the archive
 * scanner answers "what do I own?", this page answers "who am I across the
 * whole universe?" — the three substance pillars from the founder brief:
 *
 *   1. HEX SPANS THE UNIVERSE — wallet hex is one global ledger, not
 *      per-collection. Framed as "power across the universe".
 *   2. COMBINED IDENTITY — holding multiple signal-types is a status. We
 *      count how many of the 6 signals you carry and award a tier
 *      (Carrier → Keeper of the Whole Signal). This is what an OpenSea or
 *      Zapper view can't give you.
 *   3. LORE FRAMING — each collection is shown by its in-world role
 *      (Citizens / Dead Signals / …), not "NFTs".
 *
 * Reuses: useViewerAddr (viewer cookie), /api/wallet/[addr]/inventory
 * (scanWalletSignalInventory), /api/wallet/[addr]/hex (wallet ledger),
 * /api/opensea/stats/[slug] (per-collection floor), CONNECTED_COLLECTIONS.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useViewerAddr } from "@/lib/use-viewer";
import { CONNECTED_COLLECTIONS, openseaCollectionUrl } from "@/lib/collections";
import type { SignalInventory } from "@/lib/signal-inventory";

type Tier = { name: string; blurb: string };

// Tier from breadth — how many of the 6 signal-types the wallet carries.
// Lore-native names; breadth (not depth) is the status the universe rewards.
function tierFor(signalsHeld: number): Tier {
  if (signalsHeld >= 6) return { name: "Keeper of the Whole Signal", blurb: "You carry every signal the city remembers." };
  if (signalsHeld >= 4) return { name: "Curator", blurb: "Most of the archive answers to you." };
  if (signalsHeld >= 2) return { name: "Archivist", blurb: "You hold more than one layer of the record." };
  if (signalsHeld >= 1) return { name: "Carrier", blurb: "The signal recognises you." };
  return { name: "Unrecognised", blurb: "The city does not yet carry your signal." };
}

type FloorMap = Record<string, number | null>;

function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export function SignalUniverse() {
  const viewer = useViewerAddr();
  const [inv, setInv] = useState<SignalInventory | null>(null);
  const [hex, setHex] = useState<number | null>(null);
  const [floors, setFloors] = useState<FloorMap>({});
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  // Scan holdings + hex once a viewer wallet is known.
  useEffect(() => {
    if (!viewer.ready) return;
    if (!viewer.addr) { setStatus("idle"); return; }
    const addr = viewer.addr.toLowerCase();
    let alive = true;
    setStatus("loading");
    setErr(null);

    fetch(`/api/wallet/${addr}/inventory`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`scan_${r.status}`))))
      .then((j: SignalInventory) => { if (alive) { setInv(j); setStatus("ok"); } })
      .catch((e) => { if (alive) { setErr(e.message || "scan_failed"); setStatus("error"); } });

    fetch(`/api/wallet/${addr}/hex`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { balance?: number } | null) => { if (alive && j && typeof j.balance === "number") setHex(j.balance); })
      .catch(() => {});

    return () => { alive = false; };
  }, [viewer.ready, viewer.addr]);

  // Per-collection floors (non-blocking; each fails soft to null).
  useEffect(() => {
    if (status !== "ok") return;
    let alive = true;
    Promise.all(
      CONNECTED_COLLECTIONS.map((c) =>
        fetch(`/api/opensea/stats/${c.slug}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((j: { floor?: number | null } | null) => [c.slug, j?.floor ?? null] as const)
          .catch(() => [c.slug, null] as const),
      ),
    ).then((pairs) => { if (alive) setFloors(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [status]);

  const held = useMemo(() => (inv?.collections ?? []).filter((c) => c.count > 0), [inv]);
  const signalsHeld = held.length;
  const totalArtefacts = useMemo(
    () => (inv?.collections ?? []).reduce((a, c) => a + c.count, 0),
    [inv],
  );
  const tier = tierFor(signalsHeld);

  // ── No wallet connected ──────────────────────────────────────────────
  if (viewer.ready && !viewer.addr) {
    return (
      <section className="su su--gate">
        <span className="su__kicker">⬡ YOUR SIGNAL · ACROSS THE UNIVERSE</span>
        <h1 className="su__gateTitle">One record.<br /><em>Everything you carry.</em></h1>
        <p className="su__gateLede">
          Citizens, Dead Signals, Combat Relics, Ancient Species, Memory Fragments,
          Collapse Records — the six collections of the Crypt, read as one identity.
          Connect your wallet to see yours.
        </p>
        <div className="su__gateActions">
          <Link href="/sync" className="btn btn-primary"><span className="ttl">CONNECT WALLET ⬡ →</span></Link>
          <Link href="/archive" className="btn btn-secondary"><span className="ttl">SEE THE ARCHIVE →</span></Link>
        </div>
      </section>
    );
  }

  return (
    <section className="su">
      <span className="su__kicker">⬡ YOUR SIGNAL · ACROSS THE UNIVERSE</span>

      {/* Combined identity — the substance. */}
      <div className="su__identity" data-tier={tier.name}>
        <div className="su__identityMain">
          <div className="su__signalsLine">
            You carry <strong>{signalsHeld}</strong> of <strong>6</strong> signals
          </div>
          <h1 className="su__tierName">{tier.name}</h1>
          <p className="su__tierBlurb">{tier.blurb}</p>
          {signalsHeld > 0 && (
            <div className="su__roles">
              {held.map((c) => (
                <span key={c.collection.slug} className="su__role" style={{ ["--role-color" as string]: c.collection.color }}>
                  {c.collection.role}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Universe hex — global ledger framed as power, not balance. */}
        <div className="su__hex">
          <span className="su__hexLabel">Your power across the universe</span>
          <span className="su__hexValue">{hex === null ? "—" : hex.toLocaleString()} <span className="su__hexGlyph">⬡</span></span>
          <span className="su__hexSub">{viewer.addr ? shortAddr(viewer.addr) : ""} · one ledger, every collection</span>
        </div>
      </div>

      {/* Loading */}
      {status === "loading" && (
        <p className="su__status">⬡ READING YOUR SIGNAL ACROSS 6 COLLECTIONS…</p>
      )}
      {status === "error" && (
        <p className="su__status su__status--err">⚠ Couldn&apos;t read your signal{err ? ` (${err})` : ""} — refresh to retry.</p>
      )}

      {/* Per-collection cards */}
      {status === "ok" && inv && (
        <>
          <div className="su__summary">
            <strong>{totalArtefacts}</strong> artefact{totalArtefacts === 1 ? "" : "s"} carried
            <span className="su__sep">·</span>
            <strong>{signalsHeld}</strong> of {inv.collections.length} collections connected
          </div>
          <div className="su__grid">
            {inv.collections.map((c) => {
              const has = c.count > 0;
              const floor = floors[c.collection.slug];
              return (
                <article
                  key={c.collection.slug}
                  className={`su-card${has ? " su-card--held" : ""}`}
                  style={{ ["--role-color" as string]: c.collection.color }}
                >
                  <div className="su-card__top">
                    <span className="su-card__role">{c.collection.role}</span>
                    <span className="su-card__count">{has ? `${c.count}${c.truncated ? "+" : ""}` : "0"}</span>
                  </div>
                  <h2 className="su-card__name">{c.collection.name}</h2>
                  <div className="su-card__meta">
                    <span className={`su-card__status su-card__status--${has ? "on" : "off"}`}>
                      {has ? "● CARRIED" : "○ NOT YET"}
                    </span>
                    <span className="su-card__floor">
                      {floor != null ? `floor ${floor} Ξ` : ""}
                    </span>
                  </div>
                  {/* held: show a few thumbnails. */}
                  {has && (
                    <div className="su-card__thumbs">
                      {c.items.slice(0, 6).map((it) => (
                        <a
                          key={it.identifier}
                          href={it.openseaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="su-card__thumb"
                          title={it.name || `${c.collection.name} #${it.identifier}`}
                        >
                          {it.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.imageUrl} alt="" loading="lazy" />
                          ) : (
                            <span className="su-card__thumbPh" aria-hidden>⬡</span>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  <a
                    className="su-card__cta"
                    href={openseaCollectionUrl(c.collection.slug)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {has ? "View on OpenSea ↗" : "Acquire the signal ↗"}
                  </a>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

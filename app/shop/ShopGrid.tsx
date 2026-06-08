"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, ITEMS, type ShopItem } from "@/lib/shop";
import { loadCarrier, type CarrierState } from "@/lib/carrier";
import { cityNotice } from "@/lib/city-notice";
import { CANON } from "@/lib/canon";
import { useViewerAddr } from "@/lib/use-viewer";
import { proveWallet } from "@/lib/wallet-proof";

type SoldMap = Record<string, number>;

const ALL = "ALL";
const FAVS = "FAVS";
const FAV_KEY = "freelon::shop::favs::v1";

function shareItem(i: ShopItem) {
  const url = `https://www.freeloncity.com/shop`;
  const text = `${i.name} — ${i.tier} · ${i.cost.toLocaleString()} ⬡ in the FREELON CITY shop\n${url}`;
  if (typeof navigator !== "undefined" && navigator.share) {
    navigator.share({ title: i.name, text, url }).catch(() => {});
  } else {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
}

export function ShopGrid() {
  const [carrier, setCarrier] = useState<CarrierState | null>(null);
  // 2026-05-29 ledger unification: when a wallet is connected, the shop now
  // spends the WALLET ledger (where hex is earned), so show THAT balance — not
  // the handle-keyed carrier balance that caused "I have 270 but it says 50".
  // Falls back to carrier-hex for handle-only (non-holder) viewers.
  const viewer = useViewerAddr();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [sold, setSold] = useState<SoldMap>({});
  const [filter, setFilter] = useState<string>(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 2026-05-26 cost-confirm interstitial. The naming form was lying
  // about cost ("-100 ⬡" hardcoded while actual was 500). Same class
  // of bug existed here: BUY · 1,500 ⬡ → single click → permanent
  // burn with no confirmation. Now the click sets pendingItem; the
  // modal shows cost + remaining balance + a CONFIRM BURN button;
  // only that button calls /api/shop/buy.
  const [pendingItem, setPendingItem] = useState<ShopItem | null>(null);
  // Favourites — a quick local wishlist (no wallet needed). Persisted in
  // localStorage; a FAVS filter shows just the starred items.
  const [favs, setFavs] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);
  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  // 2026-05-26 polish: confirm-burn modal needed proper a11y. ESC
  // dismisses (the comment promised it but the handler was missing),
  // and body scroll is locked so the page behind the modal doesn't
  // scroll. Busy state blocks ESC so a mid-burn API call doesn't get
  // cancelled visually while still running. Cleanup on unmount or
  // pendingItem change is symmetric.
  useEffect(() => {
    if (!pendingItem) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && busyId !== pendingItem.id) {
        setPendingItem(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [pendingItem, busyId]);

  // Load carrier from localStorage
  useEffect(() => {
    const c = loadCarrier();
    setCarrier(c);
    if (c?.handle) {
      // Fetch owned inventory
      fetch(`/api/shop/inventory/${encodeURIComponent(c.handle)}`)
        .then((r) => r.json())
        .then((j: { owned?: string[] }) => {
          if (Array.isArray(j.owned)) setOwned(new Set(j.owned));
        })
        .catch(() => {});
    }
  }, []);

  // When a wallet is connected, fetch its real (spendable) hex balance. This
  // is the number the buy route will actually debit, so it's what we show.
  useEffect(() => {
    if (!viewer.ready || !viewer.addr) {
      setWalletBalance(null);
      return;
    }
    let alive = true;
    fetch(`/api/wallet/${viewer.addr.toLowerCase()}/hex`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { balance?: number } | null) => {
        if (alive && j && typeof j.balance === "number") setWalletBalance(j.balance);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [viewer.ready, viewer.addr]);

  const visible = useMemo<ShopItem[]>(() => {
    if (filter === ALL) return ITEMS;
    if (filter === FAVS) return ITEMS.filter((i) => favs.has(i.id));
    return ITEMS.filter((i) => i.category === filter);
  }, [filter, favs]);

  const ownedItems = useMemo<ShopItem[]>(() => {
    return ITEMS.filter((i) => owned.has(i.id));
  }, [owned]);

  // Entry point: clicking a product's BUY button no longer burns —
  // it opens the confirm modal. Anon visitors get the existing
  // "Sync a handle" error at this point (no point asking them to
  // confirm a burn they can't perform yet).
  function requestBuy(item: ShopItem) {
    if (!carrier?.handle) {
      setError("Sync a handle on /carrier first to spend hex points.");
      return;
    }
    setError(null);
    setPendingItem(item);
  }

  // Confirm step: runs the actual burn. Triggered ONLY by the modal's
  // CONFIRM BURN button.
  async function confirmBuy(item: ShopItem) {
    if (!carrier?.handle) {
      setError("Sync a handle on /carrier first to spend hex points.");
      setPendingItem(null);
      return;
    }
    setBusyId(item.id);
    setError(null);
    const doPost = () =>
      fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: carrier.handle, itemId: item.id }),
      });
    try {
      let res = await doPost();
      let j = await res.json();
      // Wallet-ledger spends need a one-time wallet signature (walletProof).
      if (res.status === 401 && j?.error === "wallet_proof_required") {
        if (!viewer.addr) {
          setError("Connect your wallet to spend ⬡ in the shop.");
          return;
        }
        const proof = await proveWallet(viewer.addr);
        if (!proof.ok) {
          setError(
            proof.reason === "no_wallet"
              ? "Open this page in your wallet's browser to spend ⬡."
              : proof.reason === "rejected"
              ? "Signature declined — needed once to spend ⬡."
              : "Couldn't prove your wallet — retry.",
          );
          return;
        }
        res = await doPost();
        j = await res.json();
      }
      if (!res.ok) {
        setError(j?.error ?? `Purchase failed (${res.status})`);
        return;
      }
      // Update local carrier state & owned set
      if (j.state) {
        setCarrier(j.state as CarrierState);
        // Mirror to localStorage so other pages see the new balance
        try {
          localStorage.setItem("freelon::carrier::v1", JSON.stringify(j.state));
        } catch {}
      }
      // Wallet path returns the authoritative post-debit balance.
      if (typeof j.walletBalance === "number") setWalletBalance(j.walletBalance);
      setOwned((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      if (typeof j.sold === "number") {
        setSold((prev) => ({ ...prev, [item.id]: j.sold }));
      }
      cityNotice({
        title: CANON.RECEIVED,
        body: `${item.name} added to your collection`,
        delta: `-${item.cost} ⬡`,
      });
    } catch (e) {
      setError(e instanceof Error ? `${CANON.LOST} · ${e.message}` : `${CANON.LOST} · retry`);
    } finally {
      setBusyId(null);
      setPendingItem(null); // close confirm modal whether success or error
    }
  }

  // Spendable balance: wallet ledger when connected, else carrier-hex.
  const usingWallet = walletBalance !== null;
  const balance = usingWallet ? walletBalance : (carrier?.hexPoints ?? 0);

  return (
    <div>
      <div className="shop-balance">
        <div>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)" }}>
            {carrier?.handle ? `@${carrier.handle}` : "BROWSING FREE · SYNC YOUR HANDLE TO SPEND ⬡"}
          </div>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-2)", marginTop: 4 }}>
            {usingWallet ? "WALLET HEX BALANCE" : "HEX BALANCE"}
          </div>
        </div>
        <div className="balance-amount">{balance.toLocaleString()} ⬡</div>
      </div>

      {error && (
        <div style={{ background: "rgba(200,80,80,0.08)", border: "1px solid rgba(200,80,80,0.35)", color: "#e8a8a8", padding: "10px 14px", borderRadius: 4, marginBottom: "var(--s-4)", fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.1em" }}>
          {error}
        </div>
      )}

      {ownedItems.length > 0 && (
        <section style={{ marginBottom: "var(--s-6)" }}>
          <h2 style={{ fontFamily: "var(--display)", fontSize: 22, textTransform: "uppercase", letterSpacing: "-0.005em", marginBottom: "var(--s-3)" }}>
            Your collection · {ownedItems.length}
          </h2>
          <div className="shop-grid">
            {ownedItems.map((i) => (
              <article key={`owned-${i.id}`} className="shop-item owned" style={{ position: "relative" }}>
                <div className="shop-card-actions">
                  <button type="button" className="shop-share" aria-label={`Share ${i.name}`} onClick={() => shareItem(i)}>↗</button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="shop-img" src={`/shop/${i.id}.webp`} alt={i.name} loading="lazy" />
                <span className="cat">{i.category}</span>
                <h3>{i.name}</h3>
                <p className="desc">{i.description}</p>
                <div className="meta">
                  <span>{i.tier}</span>
                  <span className="cost">{i.cost.toLocaleString()} ⬡</span>
                </div>
                <div className="owned-tag">⬡ OWNED</div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="shop-filters">
        <button className={filter === ALL ? "active" : ""} onClick={() => setFilter(ALL)}>
          ALL · {ITEMS.length}
        </button>
        {favs.size > 0 && (
          <button className={filter === FAVS ? "active" : ""} onClick={() => setFilter(FAVS)}>
            ★ FAVS · {favs.size}
          </button>
        )}
        {CATEGORIES.map((c) => {
          const n = ITEMS.filter((i) => i.category === c).length;
          return (
            <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>
              {c} · {n}
            </button>
          );
        })}
      </div>

      {/* Confirm-burn modal 2026-05-26. Renders when pendingItem set.
         Shows cost + balance + balance-after + cancel. The CONFIRM
         BURN button is the only path that actually calls /api/shop/buy.
         Click outside or ESC dismisses. */}
      {pendingItem && (() => {
        const after = Math.max(0, balance - pendingItem.cost);
        const busy = busyId === pendingItem.id;
        return (
          <div
            className="shop-confirm-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) setPendingItem(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-confirm-title"
          >
            <div className="shop-confirm-card">
              <div className="shop-confirm-kicker">⬡ CONFIRM BURN</div>
              <h3 id="shop-confirm-title" className="shop-confirm-title">{pendingItem.name}</h3>
              <p className="shop-confirm-desc">{pendingItem.description}</p>
              <dl className="shop-confirm-stats">
                <div>
                  <dt>COST</dt>
                  <dd className="shop-confirm-cost">{pendingItem.cost.toLocaleString()} ⬡</dd>
                </div>
                <div>
                  <dt>BALANCE</dt>
                  <dd>{balance.toLocaleString()} ⬡</dd>
                </div>
                <div>
                  <dt>AFTER</dt>
                  <dd>{after.toLocaleString()} ⬡</dd>
                </div>
              </dl>
              <p className="shop-confirm-warn">
                Burning ⬡ is permanent. The artefact joins your collection. No refund.
              </p>
              <div className="shop-confirm-actions">
                <button
                  type="button"
                  className="btn btn-secondary shop-confirm-cancel"
                  disabled={busy}
                  onClick={() => setPendingItem(null)}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  className="btn btn-primary shop-confirm-go"
                  disabled={busy}
                  onClick={() => confirmBuy(pendingItem)}
                >
                  {busy ? "BURNING…" : `BURN ${pendingItem.cost.toLocaleString()} ⬡`}
                </button>
              </div>
            </div>
            <style>{`
              .shop-confirm-backdrop {
                position: fixed; inset: 0;
                background: rgba(5,5,5,0.78);
                backdrop-filter: blur(4px);
                z-index: 1000;
                display: flex; align-items: center; justify-content: center;
                padding: var(--s-4);
              }
              .shop-confirm-card {
                max-width: 440px; width: 100%;
                padding: clamp(20px, 4vw, 28px);
                background: var(--archival-surface, #11100E);
                border: 1px solid var(--archival-line, rgba(232,224,207,0.12));
                border-radius: 8px;
                position: relative;
                box-shadow: 0 24px 60px -16px rgba(0,0,0,0.7);
              }
              .shop-confirm-card::before {
                content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
                background: linear-gradient(180deg,
                  var(--archival-rule-gold, rgba(200,163,90,0.22)) 0 1px,
                  transparent 1px 2px,
                  var(--archival-line-deep, rgba(232,224,207,0.06)) 2px 3px);
                pointer-events: none;
              }
              .shop-confirm-kicker {
                font-family: var(--mono2);
                font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase;
                color: var(--archival-gold, var(--gold));
                margin-bottom: 12px;
              }
              .shop-confirm-title {
                font-family: var(--display);
                font-size: clamp(22px, 4vw, 28px);
                line-height: 1.1; letter-spacing: -0.01em;
                margin: 0 0 8px;
                color: var(--archival-bone, var(--ink));
                font-weight: 400; text-transform: none;
              }
              .shop-confirm-desc {
                font-family: var(--mono2); font-size: 12px; line-height: 1.7;
                color: var(--archival-bone-2, var(--ink-2));
                margin: 0 0 18px;
              }
              .shop-confirm-stats {
                display: grid; grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin: 0 0 16px;
                padding: 14px 12px;
                border-top: 1px solid var(--archival-line, rgba(232,224,207,0.12));
                border-bottom: 1px solid var(--archival-line, rgba(232,224,207,0.12));
              }
              .shop-confirm-stats div { display: flex; flex-direction: column; gap: 4px; }
              .shop-confirm-stats dt {
                font-family: var(--mono2);
                font-size: 9px; letter-spacing: 0.32em; text-transform: uppercase;
                color: var(--archival-dust, var(--ink-dim));
              }
              .shop-confirm-stats dd {
                font-family: var(--mono2); font-size: 13px;
                color: var(--archival-bone, var(--ink));
                margin: 0;
              }
              .shop-confirm-stats .shop-confirm-cost {
                color: var(--archival-gold, var(--gold));
                font-weight: 700;
              }
              .shop-confirm-warn {
                font-family: var(--mono2); font-size: 11px; line-height: 1.6;
                color: var(--archival-dust, var(--ink-dim));
                letter-spacing: 0.04em;
                margin: 0 0 20px;
              }
              .shop-confirm-actions {
                display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
              }
              .shop-confirm-cancel, .shop-confirm-go { min-width: 140px; }
              @media (max-width: 480px) {
                .shop-confirm-actions { flex-direction: column-reverse; }
                .shop-confirm-cancel, .shop-confirm-go { width: 100%; }
              }
            `}</style>
          </div>
        );
      })()}

      <div className="shop-grid">
        {visible.map((i) => {
          const isOwned = owned.has(i.id);
          const totalSold = sold[i.id] ?? 0;
          const supplyLeft = i.supply !== null && i.supply !== undefined ? Math.max(0, i.supply - totalSold) : null;
          const soldOut = supplyLeft !== null && supplyLeft <= 0;
          const cantAfford = balance < i.cost;
          const isBusy = busyId === i.id;

          // Anonymous (no carrier handle) visitors see "SYNC TO BUY" instead
          // of "INSUFFICIENT ⬡" on every product — Discord report from a new
          // visitor described the shop as "31 buttons that say INSUFFICIENT,
          // looks broken." Insufficient is only the right label for synced
          // carriers who actually checked balance and came up short.
          const isAnon = !carrier?.handle;
          let label = `BUY · ${i.cost.toLocaleString()} ⬡`;
          let disabled = false;
          if (isOwned) {
            label = "OWNED";
            disabled = true;
          } else if (soldOut) {
            label = "SOLD OUT";
            disabled = true;
          } else if (isAnon) {
            label = "SYNC TO BUY →";
            disabled = false; // clickable — buy() shows a "sync a handle" notice
          } else if (cantAfford) {
            label = "INSUFFICIENT ⬡";
            disabled = true;
          }
          if (isBusy) {
            label = "...";
            disabled = true;
          }

          const isFav = favs.has(i.id);
          return (
            <article key={i.id} className={`shop-item${isOwned ? " owned" : ""}`} style={{ position: "relative" }}>
              <div className="shop-card-actions">
                <button
                  type="button"
                  className={`shop-fav${isFav ? " on" : ""}`}
                  aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
                  aria-pressed={isFav}
                  onClick={() => toggleFav(i.id)}
                >
                  {isFav ? "★" : "☆"}
                </button>
                <button
                  type="button"
                  className="shop-share"
                  aria-label={`Share ${i.name}`}
                  onClick={() => shareItem(i)}
                >
                  ↗
                </button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="shop-img" src={`/shop/${i.id}.webp`} alt={i.name} loading="lazy" />
              <span className="cat">{i.category}{i.civ ? ` · ${i.civ.toUpperCase()}` : ""}</span>
              <h3>{i.name}</h3>
              <p className="desc">{i.description}</p>
              <div className="meta">
                <span>{i.tier}</span>
                {supplyLeft !== null ? (
                  <span>{supplyLeft} / {i.supply} LEFT</span>
                ) : (
                  <span>OPEN SUPPLY</span>
                )}
              </div>
              <div className="meta">
                <span className="cost">{i.cost.toLocaleString()} ⬡</span>
              </div>
              <button
                type="button"
                className="buy-btn"
                disabled={disabled}
                onClick={() => requestBuy(i)}
              >
                {label}
              </button>
              {isOwned && <div className="owned-tag">⬡ OWNED</div>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

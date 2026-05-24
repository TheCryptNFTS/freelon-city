"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, ITEMS, type ShopItem } from "@/lib/shop";
import { loadCarrier, type CarrierState } from "@/lib/carrier";
import { cityNotice } from "@/lib/city-notice";
import { CANON } from "@/lib/canon";

type SoldMap = Record<string, number>;

const ALL = "ALL";

export function ShopGrid() {
  const [carrier, setCarrier] = useState<CarrierState | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [sold, setSold] = useState<SoldMap>({});
  const [filter, setFilter] = useState<string>(ALL);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const visible = useMemo<ShopItem[]>(() => {
    if (filter === ALL) return ITEMS;
    return ITEMS.filter((i) => i.category === filter);
  }, [filter]);

  const ownedItems = useMemo<ShopItem[]>(() => {
    return ITEMS.filter((i) => owned.has(i.id));
  }, [owned]);

  async function buy(item: ShopItem) {
    if (!carrier?.handle) {
      setError("Sync a handle on /carrier first to spend hex points.");
      return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: carrier.handle, itemId: item.id }),
      });
      const j = await res.json();
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
    }
  }

  const balance = carrier?.hexPoints ?? 0;

  return (
    <div>
      <div className="shop-balance">
        <div>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)" }}>
            {carrier?.handle ? `@${carrier.handle}` : "NOT SYNCED"}
          </div>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em", color: "var(--ink-2)", marginTop: 4 }}>
            HEX BALANCE
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
              <article key={`owned-${i.id}`} className="shop-item owned">
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
        {CATEGORIES.map((c) => {
          const n = ITEMS.filter((i) => i.category === c).length;
          return (
            <button key={c} className={filter === c ? "active" : ""} onClick={() => setFilter(c)}>
              {c} · {n}
            </button>
          );
        })}
      </div>

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

          return (
            <article key={i.id} className={`shop-item${isOwned ? " owned" : ""}`}>
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
                onClick={() => buy(i)}
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

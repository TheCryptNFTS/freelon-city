"use client";
/**
 * <SignalInventory /> — "CHECK YOUR SIGNAL" panel on /archive.
 *
 * Founder brief 2026-05-25: paste a wallet → reveal which archives are
 * connected to your identity across all 6 collections. Ownership
 * terminal, NOT a marketplace grid.
 *
 * Rules from brief, respected:
 *   - No floor prices
 *   - No "trading" / "buy" language
 *   - No NFT marketplace energy
 *   - Empty wallets get an elegant empty state
 *   - Mobile-first (uses Phase 2 ui-* primitives)
 *
 * Pre-fills from the freelon_addr cookie if present (so a synced
 * holder lands on the page with their inventory already loading).
 */

import { useEffect, useMemo, useState } from "react";
import type { SignalInventory } from "@/lib/signal-inventory";

function readAddrCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
  if (!m) return null;
  const val = decodeURIComponent(m[1]).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(val)) return null;
  return val;
}

type Status = "idle" | "loading" | "ok" | "error";

export function SignalInventoryPanel() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<SignalInventory | null>(null);

  // Auto-fill from cookie + auto-scan if present
  useEffect(() => {
    const cookie = readAddrCookie();
    if (cookie) {
      setInput(cookie);
      void scan(cookie);
    }
  }, []);

  async function scan(raw: string) {
    const addr = raw.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) {
      setErr("Provide a valid 0x… Ethereum address.");
      setStatus("error");
      return;
    }
    setErr(null);
    setStatus("loading");
    setData(null);
    try {
      const r = await fetch(`/api/wallet/${addr}/inventory`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || `Scan failed (${r.status})`);
        setStatus("error");
        return;
      }
      const j = (await r.json()) as SignalInventory;
      setData(j);
      setStatus("ok");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "network_error");
      setStatus("error");
    }
  }

  const totalArtefacts = useMemo(
    () => (data?.collections ?? []).reduce((a, c) => a + c.count, 0),
    [data],
  );
  const filledCollections = useMemo(
    () => (data?.collections ?? []).filter((c) => c.count > 0),
    [data],
  );
  const emptyCollections = useMemo(
    () => (data?.collections ?? []).filter((c) => c.count === 0),
    [data],
  );

  return (
    <section
      style={{
        marginTop: "var(--s-6)",
        marginBottom: "var(--s-6)",
        padding: "var(--s-5)",
        border: "1px solid var(--gold)55",
        background: "linear-gradient(135deg, rgba(200,167,93,0.06), rgba(0,0,0,0.4))",
        borderRadius: 14,
      }}
    >
      <header style={{ marginBottom: "var(--s-3)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ CHECK YOUR SIGNAL
        </span>
        <h2
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(28px, 4.5vw, 44px)",
            lineHeight: 1,
            letterSpacing: "-0.01em",
            margin: "10px 0 8px",
          }}
        >
          Which archives <em style={{ color: "var(--gold)", fontStyle: "normal" }}>are connected</em> to your identity?
        </h2>
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.7,
            margin: 0,
            maxWidth: 580,
          }}
        >
          Paste your wallet. The city scans every connected collection
          and returns the artefacts you carry.
        </p>
      </header>

      {/* Input row */}
      <form
        onSubmit={(e) => { e.preventDefault(); void scan(input); }}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--s-3)" }}
      >
        <input
          type="text"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status === "loading"}
          style={{
            flex: "1 1 280px",
            padding: "12px 14px",
            background: "rgba(0,0,0,0.4)",
            border: "1px solid var(--line-2)",
            borderRadius: 8,
            color: "var(--ink)",
            fontFamily: "var(--mono2)",
            fontSize: 13,
            letterSpacing: "0.06em",
            minHeight: 44,
          }}
        />
        <button
          type="submit"
          disabled={status === "loading" || !input}
          className="btn btn-primary"
          style={{ minWidth: 160 }}
        >
          <span className="ttl">
            {status === "loading" ? "SCANNING…" : "SCAN WALLET →"}
          </span>
        </button>
      </form>

      {err && (
        <p
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--state-warning)",
            letterSpacing: "0.12em",
            margin: "0 0 var(--s-3)",
          }}
        >
          ⚠ {err}
        </p>
      )}

      {/* Loading skeleton */}
      {status === "loading" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--s-3)",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                padding: "var(--s-4)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                minHeight: 120,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}

      {/* Result */}
      {status === "ok" && data && (
        <div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "baseline",
              marginBottom: "var(--s-3)",
              fontFamily: "var(--mono2)",
              fontSize: 11,
              letterSpacing: "0.22em",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>
              ⬡ SIGNAL READ COMPLETE
            </span>
            <span>
              {totalArtefacts} artefact{totalArtefacts === 1 ? "" : "s"}
              {" · "}
              {filledCollections.length} of {data.collections.length} archives connected
            </span>
          </div>

          {/* Empty state */}
          {totalArtefacts === 0 && (
            <div
              style={{
                padding: "var(--s-5)",
                border: "1px dashed var(--line-2)",
                borderRadius: 12,
                background: "rgba(0,0,0,0.3)",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 13,
                  color: "var(--ink-2)",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                No artefacts on file. The signal does not yet recognise
                this wallet across the connected archives.
              </p>
            </div>
          )}

          {/* Connected archives — collections with items */}
          {filledCollections.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "var(--s-3)",
              }}
            >
              {filledCollections.map((c) => (
                <article
                  key={c.collection.slug}
                  style={{
                    padding: "var(--s-4)",
                    border: `1px solid ${c.collection.color}55`,
                    background: `linear-gradient(135deg, ${c.collection.color}10, rgba(0,0,0,0.4))`,
                    borderRadius: 12,
                  }}
                >
                  <header
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: "var(--s-3)",
                    }}
                  >
                    <div>
                      <span
                        className="kicker"
                        style={{ color: c.collection.color }}
                      >
                        ⬡ {c.collection.role.toUpperCase()}
                      </span>
                      <div
                        style={{
                          fontFamily: "var(--display)",
                          fontSize: 22,
                          lineHeight: 1.1,
                          letterSpacing: "-0.005em",
                          marginTop: 6,
                        }}
                      >
                        {c.collection.name}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--display)",
                        fontSize: 28,
                        color: c.collection.color,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {c.count}
                      {c.truncated && (
                        <span style={{ fontSize: 14, color: "var(--ink-dim)" }}>+</span>
                      )}
                    </span>
                  </header>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {c.items.slice(0, 12).map((it) => (
                      <a
                        key={it.identifier}
                        href={it.openseaUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={it.name || `${c.collection.name} #${it.identifier}`}
                        style={{
                          display: "block",
                          aspectRatio: "1",
                          borderRadius: 6,
                          overflow: "hidden",
                          border: `1px solid ${c.collection.color}33`,
                          background: "rgba(0,0,0,0.4)",
                          position: "relative",
                        }}
                      >
                        {it.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.imageUrl}
                            alt=""
                            loading="lazy"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontFamily: "var(--mono2)",
                              fontSize: 10,
                              color: "var(--ink-dim)",
                            }}
                          >
                            ⬡
                          </span>
                        )}
                        <span
                          style={{
                            position: "absolute",
                            bottom: 2,
                            left: 4,
                            fontFamily: "var(--mono2)",
                            fontSize: 9,
                            color: c.collection.color,
                            background: "rgba(0,0,0,0.6)",
                            padding: "1px 4px",
                            borderRadius: 2,
                            letterSpacing: "0.06em",
                          }}
                        >
                          #{it.identifier}
                        </span>
                      </a>
                    ))}
                  </div>

                  {c.items.length > 12 && (
                    <p
                      style={{
                        marginTop: 10,
                        fontFamily: "var(--mono2)",
                        fontSize: 11,
                        color: "var(--ink-dim)",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      Showing 12 of {c.count}.{" "}
                      <a
                        href={`https://opensea.io/${data.address}?search[collections][0]=${c.collection.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: c.collection.color, textDecoration: "none" }}
                      >
                        VIEW ALL ↗
                      </a>
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* Missing archives — quiet list, not a sales pitch */}
          {emptyCollections.length > 0 && (
            <div style={{ marginTop: "var(--s-4)" }}>
              <span
                className="kicker"
                style={{ color: "var(--ink-dim)", display: "block", marginBottom: 8 }}
              >
                ⬡ NOT YET CONNECTED
              </span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontFamily: "var(--mono2)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {emptyCollections.map((c) => (
                  <span
                    key={c.collection.slug}
                    style={{
                      padding: "6px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: 999,
                      color: "var(--ink-dim)",
                    }}
                    title={`${c.collection.name} · ${c.collection.role}${
                      c.status === "rate_limited"
                        ? " · scan rate-limited"
                        : c.status === "error"
                          ? " · scan failed"
                          : ""
                    }`}
                  >
                    {c.collection.name}
                    {c.status !== "empty" && c.status !== "ok" && (
                      <span style={{ marginLeft: 6, color: "var(--state-warning)" }}>
                        ●
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

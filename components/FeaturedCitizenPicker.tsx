"use client";
/**
 * <FeaturedCitizenPicker /> — let the wallet owner pick one of their
 * own citizens to feature as their "face." Saves to Upstash via
 * /api/wallet/{addr}/featured. Only visible when the cookie-stored
 * viewer address matches the wallet being viewed.
 *
 * Founder spec 2026-05-25 (Peterhawk71): "wish I could choose my
 * Citizen on My Own."
 */
import { useEffect, useMemo, useState } from "react";
import { imageUrl } from "@/lib/constants";

function readAddrCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )freelon_addr=([^;]+)/);
  if (!m) return null;
  const val = decodeURIComponent(m[1]).toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(val)) return null;
  return val;
}

export function FeaturedCitizenPicker({
  walletAddress,
  ownedTokenIds,
}: {
  walletAddress: string;
  ownedTokenIds: number[];
}) {
  const [viewer, setViewer] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setViewer(readAddrCookie());
    fetch(`/api/wallet/${walletAddress.toLowerCase()}/featured`)
      .then((r) => r.json())
      .then((j: { tokenId: number | null }) => setCurrent(j.tokenId ?? null))
      .catch(() => {});
  }, [walletAddress]);

  const isOwnWallet = viewer && viewer === walletAddress.toLowerCase();

  // Only render the picker when the viewer is the wallet owner AND they
  // hold ≥1 citizen. Visitors viewing someone else's wallet see nothing.
  const visibleTokens = useMemo(() => ownedTokenIds.slice(0, 24), [ownedTokenIds]);
  if (!isOwnWallet) return null;
  if (visibleTokens.length === 0) return null;

  async function pick(tid: number | null) {
    setSaving(tid ?? -1);
    setErr(null);
    try {
      const r = await fetch(`/api/wallet/${walletAddress.toLowerCase()}/featured`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: tid }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string; tokenId?: number | null };
      if (!r.ok) {
        setErr(j.error || `error_${r.status}`);
      } else {
        setCurrent(j.tokenId ?? null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "network_error");
    } finally {
      setSaving(null);
    }
  }

  return (
    <section
      style={{
        margin: "var(--s-4) auto",
        maxWidth: 1100,
        padding: "var(--s-4)",
        border: "1px solid color-mix(in srgb, var(--gold) 33%, transparent)",
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(200,167,93,0.06), rgba(0,0,0,0.3))",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ CHOOSE YOUR FEATURED CITIZEN
        </span>
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 11,
            color: "var(--ink-dim)",
            letterSpacing: "0.14em",
          }}
        >
          {current
            ? `Currently · #${String(current).padStart(4, "0")}`
            : "No feature set"}
          {current && (
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={saving !== null}
              style={{
                marginLeft: 10,
                padding: "2px 8px",
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--ink-dim)",
                fontFamily: "var(--mono2)",
                fontSize: 10,
                letterSpacing: "0.14em",
                cursor: "pointer",
                borderRadius: 4,
              }}
              title="Unset featured citizen"
            >
              CLEAR
            </button>
          )}
        </span>
      </header>

      <p
        style={{
          fontFamily: "var(--mono2)",
          fontSize: 12,
          color: "var(--ink-2)",
          margin: "0 0 10px",
        }}
      >
        Pick one citizen as your face. Shows on share cards and your wallet hero.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
          gap: 8,
        }}
      >
        {visibleTokens.map((tid) => {
          const isCurrent = current === tid;
          const isSaving = saving === tid;
          return (
            <button
              key={tid}
              type="button"
              onClick={() => pick(tid)}
              disabled={saving !== null}
              title={`Feature #${String(tid).padStart(4, "0")}`}
              style={{
                position: "relative",
                padding: 0,
                border: isCurrent
                  ? "2px solid var(--gold)"
                  : "1px solid var(--line)",
                borderRadius: 6,
                background: "transparent",
                cursor: saving !== null ? "default" : "pointer",
                overflow: "hidden",
                aspectRatio: "1",
                opacity: isSaving ? 0.5 : 1,
                transition: "border-color 120ms ease, transform 120ms ease",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl(tid)}
                alt={`#${tid}`}
                loading="lazy"
                /* Head-crop (the citizen's identity is the crystal head, upper third) so
                   the 72px thumbnail shows a face, not a shrunk full body. */
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 20%", display: "block" }}
              />
              <span
                style={{
                  position: "absolute",
                  bottom: 2,
                  left: 4,
                  fontFamily: "var(--mono2)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: isCurrent ? "var(--gold)" : "var(--ink-dim)",
                  background: "rgba(0,0,0,0.6)",
                  padding: "1px 4px",
                  borderRadius: 2,
                }}
              >
                #{String(tid).padStart(4, "0")}
              </span>
            </button>
          );
        })}
      </div>

      {ownedTokenIds.length > visibleTokens.length && (
        <p
          style={{
            marginTop: 10,
            fontFamily: "var(--mono2)",
            fontSize: 11,
            color: "var(--ink-dim)",
            letterSpacing: "0.14em",
          }}
        >
          Showing first {visibleTokens.length} of {ownedTokenIds.length}.
        </p>
      )}

      {err && (
        <p
          style={{
            marginTop: 10,
            fontFamily: "var(--mono2)",
            fontSize: 11,
            color: "var(--state-warning)",
            letterSpacing: "0.12em",
          }}
        >
          ⚠ {err === "unauthorized"
            ? "Sign in with X to feature a citizen."
            : err === "not_owner"
              ? "You don't own that citizen."
              : err}
        </p>
      )}
    </section>
  );
}

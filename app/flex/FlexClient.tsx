"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import citizensData from "@/data/citizens.json";

type Citizen = { id: number; civilization: string; tier: string };
const ALL = citizensData as Citizen[];

type WalletResp = {
  address: string;
  balance: number;
  tokenIds: number[];
};

export function FlexClient() {
  const holder = useHolder();
  const [tokens, setTokens] = useState<WalletResp | null>(null);
  const [fetching, setFetching] = useState(false);
  const [manualAddr, setManualAddr] = useState("");
  const [activeAddr, setActiveAddr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addrToUse = activeAddr || holder.address;

  useEffect(() => {
    if (!addrToUse) {
      setTokens(null);
      return;
    }
    let cancelled = false;
    setFetching(true);
    setError(null);
    fetch(`/api/wallet/${addrToUse}/tokens`)
      .then(async (r) => {
        if (!r.ok) throw new Error("wallet-fetch-failed");
        return r.json();
      })
      .then((data: WalletResp) => {
        if (!cancelled) setTokens(data);
      })
      .catch(() => {
        if (!cancelled) {
          setTokens({ address: addrToUse, balance: 0, tokenIds: [] });
          setError("Could not load tokens. Try again later.");
        }
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [addrToUse]);

  async function connect() {
    setError(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No wallet detected. Paste an address below.");
      return;
    }
    setConnecting(true);
    try {
      const accs = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      if (accs && accs[0]) setActiveAddr(accs[0]);
    } catch {
      setError("Wallet connection rejected.");
    } finally {
      setConnecting(false);
    }
  }

  function useManual(e: React.FormEvent) {
    e.preventDefault();
    const v = manualAddr.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      setError("Address must look like 0x… (40 hex chars).");
      return;
    }
    setError(null);
    setActiveAddr(v.toLowerCase());
  }

  if (!addrToUse) {
    return (
      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-gold"
          onClick={connect}
          disabled={connecting || holder.loading}
        >
          <span className="ttl">
            {connecting ? "CONNECTING…" : holder.loading ? "DETECTING…" : "CONNECT WALLET →"}
          </span>
        </button>
        <form className="machine-form" style={{ marginTop: 24 }} onSubmit={useManual}>
          <input
            type="text"
            placeholder="…or paste 0x… address"
            value={manualAddr}
            onChange={(e) => setManualAddr(e.target.value)}
          />
          <button type="submit" className="btn">
            <span className="ttl">USE ADDRESS →</span>
          </button>
        </form>
        {error && (
          <p style={{ marginTop: 12, color: "#c54a3a", fontFamily: "var(--mono2)", fontSize: 12 }}>
            {error}
          </p>
        )}
      </div>
    );
  }

  const balance = tokens?.balance ?? 0;
  const ids = (tokens?.tokenIds ?? []).slice(0, 4);

  // dominant civ
  const civCounts = new Map<string, number>();
  for (const tid of tokens?.tokenIds ?? []) {
    const c = ALL[tid - 1];
    if (!c) continue;
    civCounts.set(c.civilization, (civCounts.get(c.civilization) || 0) + 1);
  }
  const topCivSlug = [...civCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const civDef = topCivSlug
    ? (CIVILIZATIONS as Record<string, { name: string; color: string }>)[topCivSlug]
    : undefined;

  const ogUrl = `/api/og/flex/${addrToUse}`;
  const tweet = balance > 0
    ? `I minted FREELON CITY for free.\n\n${balance} citizens · ${civDef?.name ?? "synthetic Mars"}.\nStatus: EARLY.\n\nfreeloncity.com/flex`
    : "I am a citizen of FREELON CITY. freeloncity.com/flex";
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(`https://freeloncity.com${ogUrl}`)}`;

  return (
    <div className="machine-result" style={{ borderColor: civDef?.color || "var(--gold)" }}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 12, letterSpacing: "0.2em", color: "var(--ink-2)" }}>
        WALLET · {addrToUse.slice(0, 6)}…{addrToUse.slice(-4)}
      </div>

      {fetching && (
        <p style={{ marginTop: 12, fontFamily: "var(--mono2)", color: "var(--ink-2)" }}>
          Reading the city ledger…
        </p>
      )}

      {!fetching && balance === 0 && (
        <>
          <h3 style={{ marginTop: 8 }}>NOT A CITIZEN — YET.</h3>
          <p style={{ marginTop: 8, color: "var(--ink-2)", fontSize: 14 }}>
            This wallet holds 0 FREELONS. Mint or pick one up on the floor to flex.
          </p>
        </>
      )}

      {!fetching && balance > 0 && (
        <>
          <h3 style={{ marginTop: 8 }}>YOU MINTED THIS FOR FREE.</h3>
          <div style={{ marginTop: 8, color: civDef?.color || "var(--gold)", fontFamily: "var(--mono2)", letterSpacing: "0.2em", fontSize: 12 }}>
            {civDef ? civDef.name.toUpperCase() : "FREELON CITY"} · EARLY
          </div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, maxWidth: 480 }}>
            {ids.map((tid) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tid}
                src={imageUrl(tid)}
                alt={`Citizen #${tid}`}
                width={120}
                height={120}
                style={{ width: "100%", height: "auto", border: `1px solid ${civDef?.color || "var(--line-2)"}` }}
              />
            ))}
          </div>

          <dl style={{ marginTop: 18, fontFamily: "var(--mono2)", fontSize: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
              <dt style={{ color: "var(--ink-2)" }}>CITIZENS</dt>
              <dd>{balance}</dd>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)" }}>
              <dt style={{ color: "var(--ink-2)" }}>DOMINANT</dt>
              <dd style={{ color: civDef?.color || "var(--ink)" }}>{civDef?.name ?? "—"}</dd>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <dt style={{ color: "var(--ink-2)" }}>STATUS</dt>
              <dd style={{ color: "var(--gold)" }}>EARLY</dd>
            </div>
          </dl>

          <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a className="btn btn-gold" href={intent} target="_blank" rel="noreferrer">
              <span className="ttl">GENERATE FLEX CARD →</span>
            </a>
            <a className="btn" href={ogUrl} target="_blank" rel="noreferrer">
              <span className="ttl">VIEW CARD ↗</span>
            </a>
          </div>
        </>
      )}

      {error && (
        <p style={{ marginTop: 12, color: "#c54a3a", fontFamily: "var(--mono2)", fontSize: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}

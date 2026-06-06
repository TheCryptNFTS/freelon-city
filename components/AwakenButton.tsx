"use client";
/**
 * AwakenButton — owner-only control to AWAKEN a citizen's on-chain agent
 * identity in FreelonAgentRegistry. `awaken(tokenId, agentURI)` is HOLDER-
 * initiated (the contract verifies ownerOf), so the connected owner sends the
 * transaction directly from their wallet, the same eth_sendTransaction pattern
 * the activation flow uses.
 *
 * Degrades gracefully: the registry is NOT deployed yet, so when
 * NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS is unset we render a disabled
 * "AWAKEN — COMING SOON" state. Current awakened/tier state is read from the
 * public /api/v1/citizens/:id/agent endpoint.
 *
 * Copy is terse, no emojis (house rule: ⬡ glyph + typographic marks only).
 * Wording is "awakened / anchored", never "immutable / unfakeable".
 */
import { useEffect, useState } from "react";
import { encodeFunctionData, isAddress } from "viem";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";

const AWAKEN_ABI = [
  {
    name: "awaken",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "agentURI", type: "string" },
    ],
    outputs: [],
  },
] as const;

type AgentState = {
  awakened: boolean;
  registryLive: boolean;
  tier: number;
  pendingTier?: number;
};

type Props = { citizenId: number };

export function AwakenButton({ citizenId }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);

  const [state, setState] = useState<AgentState | null>(null);
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Client-visible registry address. Unset until the contract is deployed →
  // the button shows the disabled "coming soon" state.
  const registry = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS;
  const registryLive = !!registry && isAddress(registry);

  async function loadState() {
    try {
      const r = await fetch(`/api/v1/citizens/${citizenId}/agent`, { cache: "no-store" });
      const d = (await r.json()) as AgentState;
      setState(d);
    } catch {
      /* non-fatal — the button just falls back to its default copy */
    }
  }

  useEffect(() => {
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [citizenId]);

  // Owner-only surface. Hide entirely for non-owners (and while resolving).
  if (h.loading || o.loading || !o.isOwner) return null;

  const awakened = !!state?.awakened;

  // Registry not deployed → disabled "coming soon".
  if (!registryLive) {
    return (
      <section className="awaken-block">
        <span className="kicker">⬡ ON-CHAIN AGENT</span>
        <p className="awaken-sub">
          Awaken this citizen to anchor its agent identity on-chain — a verifiable, holder-initiated
          record that travels with the FREELON.
        </p>
        <button type="button" className="btn awaken-btn" disabled>
          <span className="ttl">AWAKEN — COMING SOON</span>
        </button>
      </section>
    );
  }

  if (awakened) {
    const tier = state?.tier ?? 0;
    const pending = state?.pendingTier ?? tier;
    return (
      <section className="awaken-block">
        <span className="kicker">⬡ ON-CHAIN AGENT</span>
        <p className="awaken-sub">
          Awakened · agent identity anchored on-chain.
          {tier > 0 && <> Tier {tier}.</>}
          {pending > tier && <> Tier {pending} anchor queued.</>}
        </p>
      </section>
    );
  }

  async function awaken() {
    setErr(null);
    if (!registry) return;
    if (typeof window === "undefined" || !window.ethereum) {
      setErr("Open this page in your wallet's browser to awaken.");
      return;
    }
    if (!h.address) {
      setErr("Connect the wallet that holds this citizen.");
      return;
    }
    setBusy(true);
    try {
      // agentURI points at the public agent profile for this token.
      const agentURI = `https://www.freeloncity.com/api/v1/citizens/${citizenId}`;
      const data = encodeFunctionData({
        abi: AWAKEN_ABI,
        functionName: "awaken",
        args: [BigInt(citizenId), agentURI],
      });
      const hash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: h.address, to: registry, data }],
      })) as string;
      setTxHash(hash);
      // Optimistic refresh — the read endpoint will flip to awakened once the
      // tx is mined and the RPC reflects it.
      setTimeout(() => void loadState(), 4000);
    } catch (e) {
      setErr((e as Error).message || "Awaken was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="awaken-block">
      <span className="kicker">⬡ ON-CHAIN AGENT</span>
      <p className="awaken-sub">
        Awaken this citizen to anchor its agent identity on-chain — a verifiable, holder-initiated
        record that travels with the FREELON.
      </p>
      <button type="button" className="btn btn-primary awaken-btn" disabled={busy} onClick={awaken}>
        <span className="ttl">{busy ? "AWAKENING…" : "AWAKEN AGENT →"}</span>
      </button>
      {txHash && (
        <p className="awaken-note">
          Transaction sent — anchoring on-chain. <code>{txHash.slice(0, 10)}…{txHash.slice(-6)}</code>
        </p>
      )}
      {err && <p className="awaken-err">{err}</p>}
    </section>
  );
}

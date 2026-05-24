"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { loadCarrier } from "@/lib/carrier";
import { CIVILIZATIONS } from "@/lib/constants";

type RealignmentLite = {
  citizenId: number;
  originalCiv: string;
  alignedCiv: string;
  owner: string;
  setAt: number;
};

type Props = {
  citizenId: number;
  tier: string;
  originalCiv: string;
  currentRealignment: RealignmentLite | null;
};

const COOLDOWN_MS = 90 * 86400000;
const REALIGN_COST = 500;

function formatRemaining(ms: number): string {
  if (ms <= 0) return "now";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function civName(slug: string): string {
  const civ = (CIVILIZATIONS as Record<string, { name: string }>)[slug];
  return civ?.name ?? slug;
}

export function CitizenRealignEditor({ citizenId, tier, originalCiv, currentRealignment }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);
  const [handle, setHandle] = useState<string | null>(null);
  const [hexPoints, setHexPoints] = useState<number | null>(null);
  const [target, setTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [realignment, setRealignment] = useState<RealignmentLite | null>(currentRealignment);

  useEffect(() => {
    const c = loadCarrier();
    if (c) {
      setHandle(c.handle);
      setHexPoints(c.hexPoints);
    }
  }, []);

  if (tier !== "Common") return null;
  if (h.loading || o.loading) return null;

  const id4 = citizenId.toString().padStart(4, "0");

  // RPC + OpenSea both failed — show retry instead of silently hiding.
  if (o.error && h.address) {
    return (
      <section className="realign-editor">
        <span className="kicker">⬡ HOLDER · REALIGN CITIZEN #{id4}</span>
        <p className="name-msg name-err">
          ⬡ SIGNAL DISRUPTED · the city couldn&apos;t read your chain credentials · retry
        </p>
      </section>
    );
  }

  if (!o.isOwner) return null;

  const onCooldown =
    realignment && Date.now() - realignment.setAt < COOLDOWN_MS;
  const nextEligibleAt = realignment ? realignment.setAt + COOLDOWN_MS : 0;
  const remaining = nextEligibleAt - Date.now();

  const options = Object.entries(CIVILIZATIONS)
    .filter(([slug]) => slug !== originalCiv)
    .map(([slug, def]) => ({ slug, name: (def as { name: string }).name }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!target) {
      setMsg({ kind: "err", text: "Select a target civilization." });
      return;
    }
    if (!window.ethereum || !h.address) {
      setMsg({ kind: "err", text: "Wallet not available." });
      return;
    }
    if (!handle) {
      setMsg({ kind: "err", text: "Carrier handle required — visit /carrier first." });
      return;
    }
    if (hexPoints !== null && hexPoints < REALIGN_COST) {
      setMsg({ kind: "err", text: `Need ${REALIGN_COST} ⬡ — you have ${hexPoints}.` });
      return;
    }
    setBusy(true);
    try {
      const message = `I am realigning FREELON CITY citizen #${citizenId} from ${originalCiv} to ${target}.`;
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [message, h.address],
      })) as string;
      const res = await fetch(`/api/realign/${citizenId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCiv: target, address: h.address, signature, handle }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        record?: RealignmentLite;
        state?: { hexPoints: number };
      };
      if (!res.ok || !data.ok) {
        setMsg({ kind: "err", text: data.error || "Realignment failed." });
      } else {
        setMsg({ kind: "ok", text: `Aligned to ${civName(target)}. Refresh to update the page.` });
        if (data.record) setRealignment(data.record);
        if (data.state) setHexPoints(data.state.hexPoints);
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message || "Signature cancelled." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="realign-editor">
      <span className="kicker">⬡ HOLDER · REALIGN CITIZEN #{id4}</span>
      <h4>Civilization Realignment</h4>

      {realignment && (
        <p className="cooldown-note">
          Currently aligned: <strong>{civName(realignment.alignedCiv)}</strong> (origin: {civName(realignment.originalCiv)})
        </p>
      )}

      {onCooldown ? (
        <p className="cooldown-note">
          Cooldown active · next realignment in <strong>{formatRemaining(remaining)}</strong>
        </p>
      ) : (
        <form onSubmit={submit} autoComplete="off">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={busy}
          >
            <option value="">— select civilization —</option>
            {options.map((opt) => (
              <option key={opt.slug} value={opt.slug}>{opt.name}</option>
            ))}
          </select>
          <p className="cost-line">
            COST · <strong>{REALIGN_COST} ⬡</strong>
            {hexPoints !== null && <> · YOU HAVE {hexPoints} ⬡</>}
            {handle && <> · CARRIER @{handle}</>}
          </p>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            <span className="ttl">{busy ? "SIGNING…" : `REALIGN FOR ${REALIGN_COST} ⬡ →`}</span>
          </button>
        </form>
      )}

      {msg && (
        <p className={`name-msg ${msg.kind === "err" ? "name-err" : "name-ok"}`}>{msg.text}</p>
      )}
      {!msg && !onCooldown && (
        <p className="cooldown-note">
          Common-tier only. Off-chain alignment — on-chain trait stays original. 90-day cooldown per citizen.
        </p>
      )}
    </section>
  );
}

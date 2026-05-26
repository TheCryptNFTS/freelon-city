"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";
import { cityNotice } from "@/lib/city-notice";
import { ECONOMY } from "@/lib/economy-constants";

type Props = { citizenId: number; currentName: string | null };

// Discord 2026-05-26 (user attempted rename for "Rob", expected 100⬡,
// got charged 500⬡ — current NAMING_COST). The form previously showed
// no cost anywhere AND the success cityNotice hardcoded "-100 ⬡" so
// even after-the-fact the user couldn't tell what they actually paid.
// Fix: display the live NAMING_COST on the button + below the form,
// and use the server-returned `burned` value in the success notice.
const NAMING_COST = ECONOMY.NAMING_COST;

export function CitizenNameEditor({ citizenId, currentName }: Props) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);
  const [name, setName] = useState(currentName || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { setName(currentName || ""); }, [currentName]);

  if (h.loading || o.loading) return null;

  const id4 = citizenId.toString().padStart(4, "0");

  // RPC + OpenSea both failed — surface a retry state instead of silently
  // hiding the form from a real holder. Same pattern as PFP studio / channel.
  if (o.error && h.address) {
    return (
      <section className="name-editor">
        <span className="kicker">⬡ HOLDER · NAME CITIZEN #{id4}</span>
        <p className="name-msg name-err">
          ⬡ SIGNAL DISRUPTED · the city couldn&apos;t read your chain credentials · retry
        </p>
      </section>
    );
  }

  if (!o.isOwner) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!/^[A-Za-z0-9 _-]{1,32}$/.test(name) || name !== name.trim()) {
      setMsg({ kind: "err", text: "1-32 chars · letters, numbers, space, dash, underscore" });
      return;
    }
    if (!window.ethereum || !h.address) {
      setMsg({ kind: "err", text: "Wallet not available." });
      return;
    }
    setBusy(true);
    try {
      const message = `I am setting the display name of FREELON CITY citizen #${citizenId} to "${name}".`;
      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [message, h.address],
      })) as string;
      const res = await fetch(`/api/name/${citizenId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: h.address, signature }),
      });
      const data = await res.json();
      if (!res.ok) {
        // BUG FIX 2026-05-26: surface the actual cost in the
        // insufficient-balance error so users aren't surprised again.
        if (data.error === "insufficient_hex" && typeof data.required === "number") {
          setMsg({
            kind: "err",
            text: `HEX BALANCE LOW · need ${data.required} ⬡, have ${data.balance ?? "?"} ⬡`,
          });
        } else {
          setMsg({ kind: "err", text: data.error || "Failed to save name." });
        }
      } else {
        // Server returns `burned` (actual cost after collapse-mode
        // discount). Use it instead of a hardcoded number so the
        // notice can never lie about the charge again.
        const actuallyBurned = typeof data.burned === "number" ? data.burned : NAMING_COST;
        setMsg({ kind: "ok", text: `Saved. -${actuallyBurned} ⬡ burned. Refresh to see it.` });
        cityNotice({
          title: "CITIZEN REGISTERED",
          body: `#${id4} is now ${name}`,
          delta: `-${actuallyBurned} ⬡`,
        });
      }
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message || "Signature cancelled." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="name-editor">
      <span className="kicker">⬡ HOLDER · NAME CITIZEN #{id4} · {NAMING_COST} ⬡ BURN</span>
      <form onSubmit={submit} autoComplete="off">
        <input
          type="text"
          maxLength={32}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="display name"
        />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <span className="ttl">
            {busy
              ? "SIGNING…"
              : `${currentName ? "UPDATE NAME" : "SET NAME"} · BURN ${NAMING_COST} ⬡ →`}
          </span>
        </button>
      </form>
      {msg && <p className={`name-msg ${msg.kind === "err" ? "name-err" : "name-ok"}`}>{msg.text}</p>}
      {!msg && (
        <p className="name-msg">
          You&apos;ll sign a message to prove ownership. No gas. The name is stored off-chain.
          This burns <strong>{NAMING_COST} ⬡</strong> on confirm.
        </p>
      )}
    </section>
  );
}

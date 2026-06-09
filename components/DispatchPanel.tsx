"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHolder } from "@/lib/useHolder";
import { useOwnsCitizen } from "@/lib/useOwnsCitizen";

type Ev = { ts: number; district: string; line: string };
type State = {
  status: "idle" | "out" | "resolved";
  active: { key: string; district: string; sentAt: number; resolveAt: number } | null;
  secondsLeft: number;
  justResolved: Ev | null;
  recent: Ev[];
};

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * City Dispatch — send a citizen into the city; it's OUT for a timer; on return
 * the mission resolves into a canonical event on the public record. The public
 * dispatch log renders for everyone; the send control is owner-only.
 */
export function DispatchPanel({ citizenId, name }: { citizenId: number; name: string }) {
  const h = useHolder();
  const o = useOwnsCitizen(citizenId, h.address);
  const [state, setState] = useState<State | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/citizens/${citizenId}/dispatch`, { cache: "no-store" });
      if (!r.ok) return;
      const s = (await r.json()) as State;
      setState(s);
      setLeft(s.secondsLeft || 0);
    } catch { /* transient — leave prior state */ }
  }, [citizenId]);

  useEffect(() => { load(); }, [load]);

  // Countdown while OUT; on reaching zero, reload (which resolves the dispatch).
  useEffect(() => {
    if (tick.current) { clearInterval(tick.current); tick.current = null; }
    if (state?.status !== "out") return;
    tick.current = setInterval(() => {
      setLeft((x) => {
        if (x <= 1) { if (tick.current) clearInterval(tick.current); load(); return 0; }
        return x - 1;
      });
    }, 1000);
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [state?.status, load]);

  const send = useCallback(async () => {
    setErr(null);
    setBusy(true);
    const post = (signature?: string, address?: string) =>
      fetch(`/api/citizens/${citizenId}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature, address }),
      });
    try {
      let res = await post();
      if (res.status === 401) {
        const d = await res.json().catch(() => ({}));
        if (d?.error === "auth_required") {
          const eth = (window as unknown as { ethereum?: { request: (a: unknown) => Promise<unknown> } }).ethereum;
          if (!eth || !h.address) { setErr("Connect your wallet to dispatch this citizen."); setBusy(false); return; }
          const message = `I am dispatching FREELON CITY citizen #${citizenId} into the city.`;
          const signature = (await eth.request({ method: "personal_sign", params: [message, h.address] })) as string;
          res = await post(signature, h.address);
        }
      }
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; state?: State; message?: string; error?: string };
      if (data.state) { setState(data.state); setLeft(data.state.secondsLeft || 0); }
      else if (data.message) setErr(data.message);
      else if (data.error) setErr(data.error);
    } catch { setErr("Couldn't dispatch — try again."); }
    setBusy(false);
  }, [citizenId, h.address]);

  if (h.loading) return null;

  const recent = state?.recent ?? [];
  const isOut = state?.status === "out";
  const justResolved = state?.justResolved ?? null;
  const canSend = o.isOwner && !isOut && !busy;

  // Nothing to show a cold non-owner with no history — stay quiet (no new surface).
  if (!o.isOwner && recent.length === 0 && !isOut) return null;

  return (
    <section className="panel-premium" style={{ padding: "var(--s-4)", marginTop: "var(--s-3)" }}>
      <span className="kicker" style={{ color: "var(--gold)" }}>⬡ CITY DISPATCH</span>

      {isOut && state?.active ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Out in {state.active.district}</div>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>
            {name} returns in <span style={{ color: "var(--gold)" }}>{mmss(left)}</span> — leave and come back.
          </div>
        </div>
      ) : o.isOwner ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 10 }}>
            Send {name} into the city. It&apos;ll be gone a while, then return with a story for its record.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canSend}
            onClick={send}
            style={{ width: "100%", opacity: canSend ? 1 : 0.6 }}
          >
            <span className="ttl">{busy ? "DISPATCHING…" : "SEND INTO THE CITY →"}</span>
          </button>
          {err && <p style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "#e0a8a4", marginTop: 8 }}>{err}</p>}
        </div>
      ) : null}

      {justResolved && (
        <div
          style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            background: "color-mix(in srgb, var(--gold) 8%, transparent)",
          }}
        >
          <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.16em", color: "var(--gold)", textTransform: "uppercase" }}>While you were away</div>
          <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>{justResolved.line}</div>
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.16em", color: "var(--ink-dim)", textTransform: "uppercase", marginBottom: 8 }}>
            City record
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {recent.slice(0, 8).map((ev) => (
              <div key={ev.ts} style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.4, borderLeft: "2px solid var(--line-2)", paddingLeft: 10 }}>
                {ev.line}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

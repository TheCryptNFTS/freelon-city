"use client";

import { useEffect, useState } from "react";

/**
 * AGENT POWERS — the three "wow" features that only work because each NFT is a
 * distinct trained agent, surfaced as one compact panel in the workspace:
 *   • Daily Transmission — broadcast a short in-character line, share it to X.
 *   • The Chronicle — the agent's own evolving backstory (travels with the NFT).
 *   • Versus — send your agent to debate another citizen; share the transcript.
 *
 * Each owner-action is wallet-signed (timestamp-bound, cached 30 min). Reads are
 * public. Self-contained so it drops into the workspace empty state.
 */
type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
type Chapter = { n: number; text: string; at: number };
type Line = { speaker: string; tokenId: number; line: string };

const SIG_WINDOW_MS = 30 * 60 * 1000;
const X = (t: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`;

export type PowerTab = "none" | "transmission" | "chronicle" | "versus";

export function AgentPowers({
  citizenId,
  name,
  accent,
  address,
  onConnect,
  open: openProp,
  onOpenChange,
}: {
  citizenId: number;
  name: string;
  accent: string;
  address: string | null;
  onConnect: () => void;
  /** Controlled open tab (optional). When provided, the parent owns the state so
   *  an external entry point (e.g. the info pane) can deep-link to a power. */
  open?: PowerTab;
  onOpenChange?: (t: PowerTab) => void;
}) {
  const [openLocal, setOpenLocal] = useState<PowerTab>("none");
  const open = openProp ?? openLocal;
  const setOpen = (t: PowerTab) => { onOpenChange ? onOpenChange(t) : setOpenLocal(t); };
  const sigCache = useState<Record<string, { signature: string; ts: number }>>({})[0];

  function eth(): Eth | null {
    return typeof window !== "undefined" ? ((window as unknown as { ethereum?: Eth }).ethereum ?? null) : null;
  }
  async function sign(kind: string, makeMsg: (ts: number) => string): Promise<{ address: string; signature: string; ts: number }> {
    const e = eth();
    if (!e || !address) throw new Error("Open this page in your wallet's browser.");
    const c = sigCache[kind];
    if (c && Date.now() - c.ts < SIG_WINDOW_MS) return { address, signature: c.signature, ts: c.ts };
    const ts = Date.now();
    const signature = (await e.request({ method: "personal_sign", params: [makeMsg(ts), address] })) as string;
    sigCache[kind] = { signature, ts };
    return { address, signature, ts };
  }

  const tabBtn = (k: typeof open, label: string): React.CSSProperties => ({
    padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--mono2)",
    fontSize: 11.5, letterSpacing: "0.06em",
    border: `1px solid ${open === k ? accent : "var(--line-2, #2a2a30)"}`,
    color: open === k ? accent : "var(--ink-2, #b8b8c0)",
    background: open === k ? `color-mix(in srgb, ${accent} 12%, transparent)` : "transparent",
  });

  return (
    <div style={{ maxWidth: 560, margin: "26px auto 0", width: "100%" }}>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" style={tabBtn("transmission", "")} onClick={() => setOpen(open === "transmission" ? "none" : "transmission")}>⬡ Daily Transmission</button>
        <button type="button" style={tabBtn("chronicle", "")} onClick={() => setOpen(open === "chronicle" ? "none" : "chronicle")}>The Chronicle</button>
        <button type="button" style={tabBtn("versus", "")} onClick={() => setOpen(open === "versus" ? "none" : "versus")}>Versus ⚔</button>
      </div>
      {open === "transmission" && <Transmission citizenId={citizenId} name={name} accent={accent} address={address} onConnect={onConnect} sign={sign} />}
      {open === "chronicle" && <Chronicle citizenId={citizenId} name={name} accent={accent} address={address} onConnect={onConnect} sign={sign} />}
      {open === "versus" && <Versus citizenId={citizenId} name={name} accent={accent} address={address} onConnect={onConnect} sign={sign} />}
    </div>
  );
}

type SignFn = (kind: string, makeMsg: (ts: number) => string) => Promise<{ address: string; signature: string; ts: number }>;
type Sub = { citizenId: number; name: string; accent: string; address: string | null; onConnect: () => void; sign: SignFn };

const card = (accent: string): React.CSSProperties => ({
  padding: "16px 16px", borderRadius: 14, textAlign: "left",
  border: `1px solid color-mix(in srgb, ${accent} 45%, transparent)`,
  background: `linear-gradient(160deg, color-mix(in srgb, ${accent} 8%, transparent), rgba(10,10,14,0.5))`,
});
const actBtn = (accent: string, busy: boolean): React.CSSProperties => ({
  marginTop: 12, padding: "11px 16px", borderRadius: 10, border: "none", width: "100%",
  background: accent, color: "#0a0a0c", fontFamily: "var(--mono2)", fontWeight: 700, fontSize: 12.5,
  letterSpacing: "0.04em", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
});
const ghostBtn = (accent: string): React.CSSProperties => ({
  marginTop: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${accent}`, width: "100%",
  background: "transparent", color: accent, fontFamily: "var(--mono2)", fontSize: 12, cursor: "pointer", textDecoration: "none", display: "inline-block", textAlign: "center",
});

/* ── Daily Transmission ───────────────────────────────────────────────────── */
function Transmission({ citizenId, name, accent, address, onConnect, sign }: Sub) {
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/citizens/${citizenId}/transmission`).then((r) => r.json()).then((d) => { if (d?.transmission?.text) setText(d.transmission.text); }).catch(() => {});
  }, [citizenId]);

  async function broadcast() {
    if (!address) { onConnect(); return; }
    setBusy(true); setErr(null);
    try {
      const creds = await sign("transmission", (ts) => `I am broadcasting today's transmission for FREELON CITY citizen #${citizenId} at ${ts}.`);
      const res = await fetch(`/api/citizens/${citizenId}/transmission`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.transmission?.text) setText(d.transmission.text);
      else setErr(d?.message || d?.error || "Couldn't broadcast.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div style={card(accent)}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>⬡ Today&apos;s Transmission</div>
      {text ? (
        <>
          <p style={{ fontSize: 15, color: "#f2efe6", lineHeight: 1.5, margin: "12px 0 0", fontStyle: "italic" }}>“{text}”</p>
          <a style={ghostBtn(accent)} href={X(`"${text}"\n\n— ${name}, FREELON CITY\nfreeloncity.com/agent/${citizenId}`)} target="_blank" rel="noreferrer">Share to X ↗</a>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: "var(--ink-2, #b8b8c0)", lineHeight: 1.5, margin: "10px 0 0" }}>Broadcast {name}&apos;s signal for today — one striking line in its voice, ready to share.</p>
          <button type="button" style={actBtn(accent, busy)} disabled={busy} onClick={broadcast}>{busy ? "BROADCASTING…" : address ? "BROADCAST TODAY'S SIGNAL →" : "CONNECT TO BROADCAST →"}</button>
        </>
      )}
      {err && <p style={{ fontSize: 12, color: "#e0a8a4", marginTop: 8 }}>{err}</p>}
    </div>
  );
}

/* ── The Chronicle ────────────────────────────────────────────────────────── */
function Chronicle({ citizenId, name, accent, address, onConnect, sign }: Sub) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/citizens/${citizenId}/chronicle`).then((r) => r.json()).then((d) => { if (Array.isArray(d?.chapters)) setChapters(d.chapters); }).catch(() => {});
  }, [citizenId]);

  async function write() {
    if (!address) { onConnect(); return; }
    setBusy(true); setErr(null);
    try {
      const creds = await sign("chronicle", (ts) => `I am writing the next chapter for FREELON CITY citizen #${citizenId} at ${ts}.`);
      const res = await fetch(`/api/citizens/${citizenId}/chronicle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creds) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(d?.chapters)) setChapters(d.chapters);
      else setErr(d?.message || d?.error || "Couldn't write the chapter.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div style={card(accent)}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>The Chronicle of {name}</div>
      <p style={{ fontSize: 11.5, color: "var(--ink-dim, #8a8a92)", margin: "6px 0 0" }}>Its evolving story — written in its voice, and it stays with the NFT forever.</p>
      {chapters.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12, maxHeight: 260, overflowY: "auto" }}>
          {chapters.map((c) => (
            <div key={c.n}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: accent }}>Chapter {c.n}</div>
              <p style={{ fontSize: 13.5, color: "#e9e6df", lineHeight: 1.55, margin: "4px 0 0" }}>{c.text}</p>
            </div>
          ))}
        </div>
      )}
      <button type="button" style={actBtn(accent, busy)} disabled={busy} onClick={write}>
        {busy ? "WRITING…" : chapters.length === 0 ? (address ? "BEGIN THE CHRONICLE →" : "CONNECT TO BEGIN →") : "WRITE THE NEXT CHAPTER →"}
      </button>
      {err && <p style={{ fontSize: 12, color: "#e0a8a4", marginTop: 8 }}>{err}</p>}
    </div>
  );
}

/* ── Versus ───────────────────────────────────────────────────────────────── */
function Versus({ citizenId, name, accent, address, onConnect, sign }: Sub) {
  const [opp, setOpp] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ topic: string; transcript: Line[]; opponent: { name: string } } | null>(null);

  async function fight() {
    if (!address) { onConnect(); return; }
    const oid = parseInt(opp, 10);
    if (!Number.isFinite(oid) || oid < 1 || oid > 4040 || oid === citizenId) { setErr("Enter a valid opponent token (1–4040, not this one)."); return; }
    setBusy(true); setErr(null); setResult(null);
    try {
      const creds = await sign("versus", (ts) => `I am sending FREELON CITY citizen #${citizenId} into a debate at ${ts}.`);
      const res = await fetch(`/api/citizens/${citizenId}/versus`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...creds, opponentId: oid, topic: topic.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(d?.transcript)) setResult({ topic: d.topic, transcript: d.transcript, opponent: d.opponent });
      else setErr(d?.message || d?.error || "The debate couldn't run.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const inp: React.CSSProperties = { width: "100%", marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "var(--surface, #131318)", border: "1px solid var(--line-2, #2a2a30)", color: "#ece9e2", fontFamily: "var(--mono2)", fontSize: 13 };

  return (
    <div style={card(accent)}>
      <div style={{ fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: accent, fontWeight: 700 }}>⚔ Versus · Send {name} into a debate</div>
      {!result ? (
        <>
          <p style={{ fontSize: 12, color: "var(--ink-2, #b8b8c0)", margin: "8px 0 0" }}>Pick any citizen to argue against. Both reason in-character from their own identity.</p>
          <input style={inp} placeholder="Opponent token # (e.g. 1)" value={opp} onChange={(e) => setOpp(e.target.value.replace(/[^0-9]/g, ""))} disabled={busy} />
          <input style={inp} placeholder="Topic (optional)" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} disabled={busy} />
          <button type="button" style={actBtn(accent, busy)} disabled={busy} onClick={fight}>{busy ? "DEBATING…" : address ? "START THE DEBATE →" : "CONNECT TO DEBATE →"}</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "var(--ink-dim, #8a8a92)", margin: "8px 0 12px" }}>Topic: {result.topic}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 320, overflowY: "auto" }}>
            {result.transcript.map((l, i) => (
              <div key={i} style={{ borderLeft: `2px solid ${l.tokenId === citizenId ? accent : "var(--line-2, #555)"}`, paddingLeft: 12 }}>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: l.tokenId === citizenId ? accent : "var(--ink-2, #b8b8c0)" }}>{l.speaker} · #{String(l.tokenId).padStart(4, "0")}</div>
                <p style={{ fontSize: 13.5, color: "#e9e6df", lineHeight: 1.5, margin: "4px 0 0" }}>{l.line}</p>
              </div>
            ))}
          </div>
          <a style={ghostBtn(accent)} href={X(`${name} vs ${result.opponent.name} — "${result.topic}"\n\nWatch two FREELONS argue it out:\nfreeloncity.com/agent/${citizenId}`)} target="_blank" rel="noreferrer">Share this clash ↗</a>
          <button type="button" style={{ ...ghostBtn(accent), border: "1px solid var(--line-2, #2a2a30)", color: "var(--ink-2, #b8b8c0)" }} onClick={() => setResult(null)}>New debate</button>
        </>
      )}
      {err && <p style={{ fontSize: 12, color: "#e0a8a4", marginTop: 8 }}>{err}</p>}
    </div>
  );
}

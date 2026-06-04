"use client";
import { useEffect, useState, useCallback } from "react";

/**
 * AdminConsole — the founder's plain-English ops view. Asks for the admin key
 * once (kept in localStorage, sent as a header — never in the URL), then renders
 * cost / errors / go-live readiness in human terms. Read-only.
 */

type OpsError = { ts: number; where: string; error: string; tokenId?: number; wallet?: string };
type Ops = { runs: number; images: number; estCostUsd: number; recentErrors: OpsError[]; day: string };
type Check = { step: string; ok: boolean; detail: string };
type Preflight = { ready: boolean; note: string; checks: Check[] };

const KEY_STORE = "freelon_admin_key";

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminConsole() {
  const [key, setKey] = useState<string>("");
  const [entered, setEntered] = useState(false);
  const [ops, setOps] = useState<Ops | null>(null);
  const [pre, setPre] = useState<Preflight | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // preflight inputs
  const [tokenId, setTokenId] = useState("");
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(KEY_STORE) : null;
    if (saved) { setKey(saved); setEntered(true); }
  }, []);

  const loadOps = useCallback(async (k: string) => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/ops?key=${encodeURIComponent(k)}`, { cache: "no-store" });
      if (r.status === 404) { setErr("Admin key not set on the server yet. Set ADMIN_SEED_KEY in Vercel, then redeploy."); setOps(null); return; }
      if (r.status === 403) { setErr("Wrong key. Check the value you set as ADMIN_SEED_KEY in Vercel."); setOps(null); return; }
      const d = await r.json();
      if (d.ok) setOps(d);
    } catch { setErr("Couldn't reach the server."); }
    finally { setLoading(false); }
  }, []);

  async function runPreflight() {
    setErr(null);
    const q = new URLSearchParams({ key });
    if (tokenId) q.set("tokenId", tokenId);
    if (wallet) q.set("wallet", wallet);
    try {
      const r = await fetch(`/api/admin/golive-preflight?${q.toString()}`, { cache: "no-store" });
      if (r.status === 404) { setErr("Preflight needs ADMIN_SEED_KEY set in Vercel."); return; }
      const d = await r.json();
      setPre(d);
    } catch { setErr("Couldn't run the preflight."); }
  }

  function submitKey(k: string) {
    const trimmed = k.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY_STORE, trimmed);
    setKey(trimmed); setEntered(true);
    loadOps(trimmed);
  }

  useEffect(() => { if (entered && key) loadOps(key); }, [entered, key, loadOps]);

  // ── Key gate ──────────────────────────────────────────────
  if (!entered) {
    return (
      <div className="admin-wrap">
        <h1 className="admin-h1">⬡ Admin Console</h1>
        <p className="admin-lead">Enter your admin key to view costs, errors, and go-live readiness. This is the value you set as <code>ADMIN_SEED_KEY</code> in Vercel.</p>
        <form onSubmit={(e) => { e.preventDefault(); submitKey(key); }} className="admin-keyform">
          <input className="admin-input" type="password" placeholder="Admin key…" value={key} onChange={(e) => setKey(e.target.value)} autoFocus />
          <button className="btn btn-primary" type="submit"><span className="ttl">Unlock →</span></button>
        </form>
        <p className="admin-hint">Not set one yet? In Vercel → Settings → Environment Variables, add <code>ADMIN_SEED_KEY</code> = any password, then redeploy.</p>
      </div>
    );
  }

  // ── Console ───────────────────────────────────────────────
  return (
    <div className="admin-wrap">
      <div className="admin-top">
        <h1 className="admin-h1">⬡ Admin Console</h1>
        <button className="admin-logout" onClick={() => { localStorage.removeItem(KEY_STORE); setEntered(false); setOps(null); setPre(null); }}>Lock</button>
      </div>

      {err && <p className="admin-err">{err}</p>}

      {/* TODAY'S COST */}
      <section className="admin-card">
        <span className="admin-card-h">TODAY&apos;S AGENT ACTIVITY {ops?.day ? `· ${ops.day}` : ""}</span>
        {loading && !ops ? <p className="admin-dim">Loading…</p> : ops ? (
          <div className="admin-stats">
            <div className="admin-stat"><span className="admin-stat-n">{ops.runs}</span><span className="admin-stat-l">JOBS RUN</span></div>
            <div className="admin-stat"><span className="admin-stat-n">{ops.images}</span><span className="admin-stat-l">IMAGES MADE</span></div>
            <div className="admin-stat"><span className="admin-stat-n">${ops.estCostUsd.toFixed(2)}</span><span className="admin-stat-l">EST. SPEND</span></div>
            <div className="admin-stat"><span className="admin-stat-n">{ops.recentErrors.length}</span><span className="admin-stat-l">RECENT ERRORS</span></div>
          </div>
        ) : <p className="admin-dim">No data.</p>}
        <p className="admin-note">This is your estimated AI cost today — what you&apos;re spending on agent jobs. It stays near $0 until people run paid jobs.</p>
        <button className="admin-refresh" onClick={() => loadOps(key)} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
      </section>

      {/* RECENT ERRORS */}
      <section className="admin-card">
        <span className="admin-card-h">RECENT ERRORS</span>
        {ops && ops.recentErrors.length > 0 ? (
          <ul className="admin-errs">
            {ops.recentErrors.map((e, i) => (
              <li key={i}>
                <span className="admin-err-when">{ago(e.ts)}</span>
                <span className="admin-err-where">{e.where}</span>
                <span className="admin-err-msg">{e.error}</span>
                {e.wallet && <span className="admin-err-w">{e.wallet}</span>}
              </li>
            ))}
          </ul>
        ) : <p className="admin-dim">No errors recorded. ✓ (Full crash details also go to Sentry if connected.)</p>}
      </section>

      {/* GO-LIVE READINESS */}
      <section className="admin-card">
        <span className="admin-card-h">GO-LIVE READINESS CHECK</span>
        <p className="admin-note">Checks everything that must be true before charging real ETH. Enter a FREELON you own + your wallet to also check ownership + the activation price.</p>
        <div className="admin-pre-form">
          <input className="admin-input admin-input-sm" placeholder="Token # (a FREELON you own)" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
          <input className="admin-input admin-input-sm" placeholder="Your wallet 0x…" value={wallet} onChange={(e) => setWallet(e.target.value)} />
          <button className="btn btn-secondary" onClick={runPreflight}><span className="ttl">Run check →</span></button>
        </div>
        {pre && (
          <div className="admin-pre">
            <p className={`admin-pre-verdict ${pre.ready ? "is-ready" : "is-not"}`}>
              {pre.ready ? "✓ Config checks pass — ready for the real-wallet test." : "✗ Not ready — fix the items below."}
            </p>
            <ul className="admin-checks">
              {pre.checks.map((c, i) => (
                <li key={i} className={c.ok ? "ok" : "no"}>
                  <span className="admin-check-mark">{c.ok ? "✓" : "✗"}</span>
                  <span className="admin-check-step">{c.step}</span>
                  <span className="admin-check-detail">{c.detail}</span>
                </li>
              ))}
            </ul>
            <p className="admin-note">{pre.note}</p>
          </div>
        )}
      </section>

      <p className="admin-foot">Read-only. This page reports state — it never changes payments or runs jobs. Full crash reports: <a href="https://sentry.io" target="_blank" rel="noreferrer">sentry.io</a>.</p>
    </div>
  );
}

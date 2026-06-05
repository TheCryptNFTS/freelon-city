"use client";
import { useState } from "react";

/**
 * TryFreeDemo — the public "taste" before the wall. A logged-out visitor runs ONE
 * real Strategy job on a showcase FREELON (POST /api/demo, fenced server-side:
 * allowlist, 1/IP/day, budget guard) and sees genuine output. After the result,
 * the obvious next step is to unlock a FREELON of their own.
 */
export function TryFreeDemo({ tokenId = 7 }: { tokenId?: number }) {
  const [brief, setBrief] = useState("");
  const [out, setOut] = useState<{ title: string; body: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(false);

  async function run() {
    const b = brief.trim();
    if (!b || busy) return;
    setBusy(true); setErr(null); setOut(null);
    try {
      const r = await fetch("/api/demo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenId, task: "fix-launch", brief: b }),
        cache: "no-store",
      });
      const d = await r.json();
      if (r.status === 429) { setUsed(true); setErr(d.message || "You've used today's free demo."); return; }
      if (!r.ok || !d.ok) { setErr(d.message || "The agent couldn't complete that — try again."); return; }
      setOut({ title: d.title, body: d.body });
      setUsed(true);
    } catch { setErr("Couldn't reach the agent — try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="demo-try">
      <span className="demo-try-h">⬡ TRY IT FREE · ONE DEMO</span>
      <p className="demo-try-sub">
        Give a showcase FREELON your real launch in a sentence — see the actual quality before you own one.
      </p>
      {!out && (
        <>
          <textarea
            className="demo-try-input"
            placeholder="e.g. $9/mo app that writes 30 days of X posts for indie founders"
            maxLength={400}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={busy || used}
          />
          <button className="btn btn-primary demo-try-btn" onClick={run} disabled={busy || used || !brief.trim()}>
            <span className="ttl">{busy ? "THINKING…" : "RUN FREE DEMO →"}</span>
          </button>
        </>
      )}
      {err && <p className="demo-try-err">{err}</p>}
      {out && (
        <div className="demo-try-out">
          <span className="demo-try-out-h">{out.title}</span>
          <pre className="demo-try-out-body">{out.body}</pre>
          <div className="demo-try-cta">
            <span className="demo-try-cta-line">That&apos;s a free taste on a cheap model. Unlock a FREELON to train your OWN — it runs the deep model, remembers your project, and keeps a work history.</span>
            <a className="btn btn-primary" href="https://opensea.io/collection/freelons" target="_blank" rel="noreferrer">
              <span className="ttl">OWN A FREELON →</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

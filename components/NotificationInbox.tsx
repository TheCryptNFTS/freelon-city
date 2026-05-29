"use client";
import { useEffect, useState } from "react";
import { useViewerAddr } from "@/lib/use-viewer";

type NotifKind = string;
type Item = { eventKey: string; kind: NotifKind; body: string; href: string; ts: number };
type Prefs = { dmEnabled: boolean; optOut: NotifKind[] };

const KIND_LABEL: Record<string, { label: string; color: string }> = {
  "decay-warning":        { label: "DECAY",     color: "#FF8A4D" },
  "streak-milestone-soon":{ label: "STREAK",    color: "var(--gold)" },
  "watchlist-flag":       { label: "WATCHLIST", color: "var(--state-danger)" },
  "transmission-boosted": { label: "BOOST",     color: "#A989C7" },
  "civ-wars-monday":      { label: "CIV WARS",  color: "#7AB7FF" },
  "civ-wars-mid-week":    { label: "CIV WARS",  color: "#7AB7FF" },
  "snipe-matured":        { label: "SNIPE",     color: "var(--state-active)" },
  "fresh-citizen":        { label: "WELCOME",   color: "var(--gold)" },
};

function timeAgo(ts: number) {
  const dt = Math.floor((Date.now() - ts) / 1000);
  if (dt < 60) return `${dt}s`;
  if (dt < 3600) return `${Math.floor(dt / 60)}m`;
  if (dt < 86400) return `${Math.floor(dt / 3600)}h`;
  return `${Math.floor(dt / 86400)}d`;
}

export function NotificationInbox() {
  const viewer = useViewerAddr();
  const [items, setItems] = useState<Item[] | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!viewer.addr) return;
    let cancelled = false;
    fetch(`/api/notifications?addr=${viewer.addr}`)
      .then((r) => r.ok ? r.json() : null)
      .then((j: { items?: Item[]; prefs?: Prefs } | null) => {
        if (cancelled || !j) return;
        setItems(j.items || []);
        setPrefs(j.prefs || { dmEnabled: false, optOut: [] });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [viewer.addr]);

  if (!viewer.ready || !viewer.addr) return null;
  if (items === null) return null;

  async function clear() {
    if (!viewer.addr) return;
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addr: viewer.addr, action: "clear" }),
      });
      setItems([]);
    } finally { setBusy(false); }
  }

  async function toggleDM() {
    if (!viewer.addr || !prefs) return;
    const next = { ...prefs, dmEnabled: !prefs.dmEnabled };
    setPrefs(next);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ addr: viewer.addr, action: "prefs", prefs: next }),
    });
  }

  const empty = items.length === 0;

  return (
    <section
      style={{
        border: "1px solid var(--gold)44",
        background: "linear-gradient(180deg, rgba(200,167,93,0.05), rgba(0,0,0,0.3))",
        borderRadius: 14,
        padding: "var(--s-4)",
        marginTop: "var(--s-4)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: "var(--s-3)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ INBOX {empty ? "· QUIET" : `· ${items.length}`}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-dim)", padding: "4px 10px", borderRadius: 999, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", cursor: "pointer" }}
          >
            ⚙ {showSettings ? "CLOSE" : "PREFS"}
          </button>
          {!empty && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-dim)", padding: "4px 10px", borderRadius: 999, fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", cursor: "pointer" }}
            >
              CLEAR
            </button>
          )}
        </div>
      </header>

      {showSettings && prefs && (
        <div style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 10, marginBottom: "var(--s-3)", background: "rgba(255,255,255,0.02)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={prefs.dmEnabled} onChange={toggleDM} />
            <span style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)" }}>
              Send me X DMs (in addition to the inbox here)
            </span>
          </label>
          <p style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", margin: "8px 0 0", lineHeight: 1.6, letterSpacing: "0.05em" }}>
            DMs require @4040hex to be allowed to message you (X &gt; Settings &gt; Privacy &gt; Direct messages &gt; allow from anyone you follow, then follow @4040hex). Inbox cards always work regardless.
          </p>
        </div>
      )}

      {empty ? (
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.05em", lineHeight: 1.6, margin: 0 }}>
          ⬡ No new signals. The city is watching — you&apos;ll get a ping the moment your watched citizen flags, your streak is about to reset, or your transmission gets a boost.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it) => {
            const meta = KIND_LABEL[it.kind] || { label: it.kind.toUpperCase(), color: "var(--ink-dim)" };
            return (
              <li
                key={it.eventKey}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 14px",
                  border: `1px solid ${meta.color}33`,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.02)",
                  alignItems: "center",
                }}
              >
                <span style={{ fontFamily: "var(--mono2)", fontSize: 9, color: meta.color, letterSpacing: "0.2em", padding: "3px 8px", border: `1px solid ${meta.color}66`, borderRadius: 999, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {meta.label}
                </span>
                <a
                  href={it.href}
                  style={{ flex: 1, fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink)", textDecoration: "none", lineHeight: 1.5 }}
                >
                  {it.body}
                </a>
                <span style={{ fontFamily: "var(--mono2)", fontSize: 10, color: "var(--ink-dim)", letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  {timeAgo(it.ts)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

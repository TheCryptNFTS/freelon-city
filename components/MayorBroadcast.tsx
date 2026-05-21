"use client";
import { useEffect, useState } from "react";
import { useHolder } from "@/lib/useHolder";

type Broadcast = { text: string; setBy: string; setAt: number };

function timeAgoUtc(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function MayorBroadcast({
  slug,
  color,
  initialBroadcast,
  mayorAddress,
}: {
  slug: string;
  color: string;
  initialBroadcast: Broadcast | null;
  mayorAddress: string | null;
}) {
  const holder = useHolder();
  const [broadcast, setBroadcast] = useState<Broadcast | null>(initialBroadcast);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const viewerAddr = (holder.address || "").toLowerCase();
  const isMayor =
    !!mayorAddress &&
    !!viewerAddr &&
    viewerAddr === mayorAddress.toLowerCase();

  // Tick re-renders for the "x minutes ago" label
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  async function submit() {
    if (!isMayor || !viewerAddr) return;
    const t = text.trim();
    if (t.length < 5 || t.length > 140) {
      setErr("5-140 chars required");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/civ-broadcast/${slug}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t, address: viewerAddr }),
      });
      const d = (await r.json()) as
        | { ok: true; broadcast: Broadcast }
        | { error: string };
      if (!r.ok || "error" in d) {
        setErr("error" in d ? d.error : "failed");
      } else {
        setBroadcast(d.broadcast);
        setText("");
      }
    } catch {
      setErr("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {broadcast && (
        <div className="civ-broadcast" style={{ borderColor: color }}>
          <span className="cb-kicker">⬡ MESSAGE FROM THE MAYOR</span>
          <p className="cb-text">&ldquo;{broadcast.text}&rdquo;</p>
          <span className="cb-meta">
            — {broadcast.setBy.slice(0, 6)}…{broadcast.setBy.slice(-4)} ·{" "}
            {timeAgoUtc(broadcast.setAt)}
          </span>
        </div>
      )}

      {isMayor && (
        <div className="civ-broadcast" style={{ borderColor: color, marginTop: 16 }}>
          <span className="cb-kicker">⬡ YOU ARE THE MAYOR · BROADCAST</span>
          <div className="broadcast-form">
            <textarea
              maxLength={140}
              value={text}
              placeholder="Address your civilization (5-140 chars)"
              onChange={(e) => setText(e.target.value)}
              disabled={busy}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 10,
                  color: "var(--ink-dim)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {text.length}/140
              </span>
              <button
                onClick={submit}
                disabled={busy || text.trim().length < 5}
                style={{
                  padding: "10px 18px",
                  background: "var(--gold)",
                  color: "var(--bg)",
                  border: "1px solid var(--gold)",
                  fontFamily: "var(--grotesk)",
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  cursor: busy ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: busy || text.trim().length < 5 ? 0.5 : 1,
                }}
              >
                {busy ? "Broadcasting…" : "Broadcast"}
              </button>
            </div>
            {err && (
              <div
                style={{
                  color: "var(--danger-bright)",
                  fontFamily: "var(--mono2)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {err}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { FramedAgent } from "@/components/FramedAgent";
import { ClaimForm } from "@/components/ClaimForm";
import { trackEvent } from "@/lib/track";
import { tweetIntent, tweetDemoReply } from "@/lib/share";

export type DemoAgent = {
  slug: string;
  name: string;
  collectionName: string;
  kicker: string;
  color: string;
  art: string;
  /** A short in-character opening line shown before the user types. Presentational
   *  only — NEVER calls the metered /api/demo path or counts against the free budget. */
  greeting?: string;
};

type Msg = { role: "you" | "agent"; text: string };

const OPENSEA = "https://opensea.io/collection/freelons";

const STARTERS = [
  "What are you, really?",
  "Read me the crypto market in three lines.",
  "Pitch me a weekend project.",
];

export function DemoChat({ agents }: { agents: DemoAgent[] }) {
  const [active, setActive] = useState(0);
  const [threads, setThreads] = useState<Record<string, Msg[]>>({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Fire-once guards for funnel analytics (one per browser-session mount).
  const startedRef = useRef(false);
  const exhaustedTrackedRef = useRef(false);

  if (agents.length === 0) {
    return (
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)" }}>
        The demo is briefly unavailable. Try again shortly.
      </p>
    );
  }

  const agent = agents[active];
  const msgs = threads[agent.slug] ?? [];

  function pushMsg(slug: string, m: Msg) {
    setThreads((t) => ({ ...t, [slug]: [...(t[slug] ?? []), m] }));
  }
  function popMsg(slug: string) {
    setThreads((t) => ({ ...t, [slug]: (t[slug] ?? []).slice(0, -1) }));
  }
  // Trip the wall + fire the exhaustion event exactly once per session.
  function markExhausted(slug: string) {
    setExhausted(true);
    if (!exhaustedTrackedRef.current) {
      exhaustedTrackedRef.current = true;
      trackEvent("demo_exhausted", { slug });
    }
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy || exhausted) return;
    const slug = agent.slug;
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("demo_start", { slug });
    }
    setError(null);
    setBusy(true);
    setInput("");
    pushMsg(slug, { role: "you", text: q });
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));

    try {
      const res = await fetch(`/api/demo/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: q }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reply?: string;
        remaining?: number;
        exhausted?: boolean;
        message?: string;
        error?: string;
      };

      if (res.ok && data.ok && data.reply) {
        pushMsg(slug, { role: "agent", text: data.reply });
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        if (data.remaining === 0) markExhausted(slug);
      } else if (data.exhausted) {
        markExhausted(slug);
        setRemaining(0);
      } else {
        setError(data.message || "Couldn't reach the signal — try again.");
        popMsg(slug); // give the user's turn back so they can retry
        setInput(q);
      }
    } catch {
      setError("Couldn't reach the signal — try again.");
      popMsg(slug);
      setInput(q);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    }
  }

  return (
    <div>
      {/* Agent picker — one citizen from each collection. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${agents.length}, 1fr)`,
          gap: 10,
          marginBottom: 14,
        }}
      >
        {agents.map((a, i) => {
          const on = i === active;
          return (
            <button
              key={a.slug}
              onClick={() => {
                setActive(i);
                setError(null);
                setInput("");
              }}
              title={a.collectionName}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 7,
                padding: "12px 6px 10px",
                borderRadius: 12,
                cursor: "pointer",
                background: on ? "var(--surface)" : "transparent",
                border: `1px solid ${on ? a.color : "var(--line)"}`,
                boxShadow: on ? `0 0 0 1px color-mix(in srgb, ${a.color} 30%, transparent)` : "none",
                transition: "border-color .15s, background .15s",
              }}
            >
              <FramedAgent art={a.art} civColor={a.color} size={54} alt={a.name} />
              <span
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: on ? a.color : "var(--ink-dim)",
                  textAlign: "center",
                  lineHeight: 1.3,
                }}
              >
                {a.collectionName}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          border: "1px solid var(--line-2)",
          borderRadius: 16,
          background: "var(--bg-2)",
          overflow: "hidden",
        }}
      >
        {/* Identity bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 18px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface)",
          }}
        >
          <FramedAgent art={agent.art} civColor={agent.color} size={48} alt={agent.name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)", lineHeight: 1.1 }}>{agent.name}</div>
            <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: agent.color, marginTop: 3 }}>
              ● AWAKE · {agent.kicker}
            </div>
          </div>
          {remaining !== null && !exhausted && (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--mono2)",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ink-dim)",
                whiteSpace: "nowrap",
              }}
            >
              {remaining} free left
            </span>
          )}
        </div>

        {/* Transcript */}
        <div
          ref={scrollRef}
          style={{
            minHeight: 260,
            maxHeight: 420,
            overflowY: "auto",
            padding: "20px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {msgs.length === 0 && !exhausted && (
            <>
              {/* The agent speaks first — a typed-in in-character line so the box is
                  ALIVE before you type. Keyed by slug so it re-animates per agent.
                  Presentational only: never hits /api/demo, never spends a free run. */}
              {agent.greeting && (
                <div
                  key={agent.slug}
                  className="demo-greeting"
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "82%",
                    padding: "11px 14px",
                    borderRadius: 13,
                    borderBottomLeftRadius: 4,
                    fontFamily: "var(--mono2)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    border: `1px solid color-mix(in srgb, ${agent.color} 32%, var(--line))`,
                  }}
                >
                  {agent.greeting}
                </div>
              )}
              <div style={{ marginTop: "auto", textAlign: "center" }}>
                <p style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.7, marginBottom: 12 }}>
                  Try one of these, or ask your own.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      disabled={busy}
                      style={{
                        fontFamily: "var(--mono2)",
                        fontSize: 11.5,
                        color: "var(--ink-2)",
                        background: "var(--surface)",
                        border: "1px solid var(--line-2)",
                        borderRadius: 999,
                        padding: "7px 13px",
                        cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "you" ? "flex-end" : "flex-start",
                maxWidth: "82%",
                padding: "11px 14px",
                borderRadius: 13,
                fontFamily: "var(--mono2)",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                ...(m.role === "you"
                  ? { background: "var(--gold)", color: "var(--bg)", borderBottomRightRadius: 4 }
                  : { background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)", borderBottomLeftRadius: 4 }),
              }}
            >
              {m.text}
            </div>
          ))}

          {busy && (
            <div style={{ alignSelf: "flex-start", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", padding: "4px 2px" }}>
              {agent.name} is thinking…
            </div>
          )}

          {exhausted && (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: 420, padding: "24px 12px" }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)", lineHeight: 1.15, marginBottom: 10 }}>
                You just met the city's free citizens.
              </div>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 20 }}>
                A <strong style={{ color: "var(--ink)" }}>FREELON</strong> is the same kind of mind — except it&apos;s{" "}
                <strong style={{ color: "var(--ink)" }}>yours</strong>: it remembers every conversation, levels up as you
                train it, and the whole history travels with the NFT. Want one? Leave your email and we&apos;ll
                get you set up.
              </p>
              {/* SHARE THE MOMENT — the demo's "wow, it's alive" reply turned into
                  a one-tap brag (the highest-frequency viral surface on the site).
                  Quotes the agent's own line via tweet-intent. Shown only when the
                  user actually got an agent reply to share. */}
              {(() => {
                const lastReply = [...(threads[agent.slug] ?? [])]
                  .reverse()
                  .find((m) => m.role === "agent")?.text;
                if (!lastReply) return null;
                return (
                  <a
                    href={tweetIntent(tweetDemoReply({ agentName: agent.name, reply: lastReply }))}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent("demo_share", { slug: agent.slug })}
                    style={{
                      display: "inline-block",
                      marginBottom: 16,
                      fontFamily: "var(--mono2)",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--bg)",
                      background: "var(--gold)",
                      borderRadius: 10,
                      padding: "11px 20px",
                      textDecoration: "none",
                    }}
                  >
                    Share what it said →
                  </a>
                );
              })()}
              {/* On-site reservation (replaces the old invisible OpenSea hand-off,
                  where conversion died and we learned nothing). Non-binding. */}
              <ClaimForm slug={agent.slug} accent="var(--gold)" />
              <a
                href={OPENSEA}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent("opensea_click", { from: "demo_wall" })}
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  fontFamily: "var(--mono2)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: "var(--ink-dim)",
                  textDecoration: "underline",
                }}
              >
                or buy one now on OpenSea →
              </a>
            </div>
          )}
        </div>

        {/* Composer */}
        {!exhausted && (
          <div style={{ borderTop: "1px solid var(--line)", padding: "12px 14px", background: "var(--surface)" }}>
            {error && (
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "#e0a8a4", marginBottom: 8 }}>{error}</div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              style={{ display: "flex", gap: 10, alignItems: "flex-end" }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                maxLength={400}
                placeholder={`Ask ${agent.name} anything…`}
                disabled={busy}
                style={{
                  flex: 1,
                  resize: "none",
                  fontFamily: "var(--mono2)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "var(--ink)",
                  background: "var(--bg-2)",
                  border: "1px solid var(--line-2)",
                  borderRadius: 10,
                  padding: "11px 13px",
                  maxHeight: 120,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--bg)",
                  background: input.trim() && !busy ? "var(--gold)" : "var(--line-2)",
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 18px",
                  cursor: input.trim() && !busy ? "pointer" : "default",
                  whiteSpace: "nowrap",
                }}
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

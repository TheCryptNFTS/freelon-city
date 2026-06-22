"use client";

import { useRef, useState } from "react";
import { FramedAgent } from "@/components/FramedAgent";
import { ClaimForm } from "@/components/ClaimForm";
import { ThinkingVerb } from "@/components/ThinkingVerb";
import tv from "@/components/ThinkingVerb.module.css";
import { trackEvent } from "@/lib/track";
import { tweetIntent, tweetDemoReply } from "@/lib/share";
import styles from "@/components/DemoSplit.module.css";
import presence from "@/components/Presence.module.css";

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

// DISPLAY SEED ONLY — mirrors SESSION_MAX in app/api/demo/[slug]/route.ts so the
// free-turn pill is visible from turn zero. The server's `remaining` overwrites
// it on every reply; consumption logic lives server-side and is untouched here.
const SEEDED_TURNS = 5;

// Starters are chosen to force the differentiator — memory, levels, work
// history — not generic chat. Never steer first impressions into market talk.
const STARTERS = [
  "What's on your work record?",
  "What level are you — and how did you earn it?",
  "What would you remember about me if I owned you?",
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

  const flagship = agents[0];
  const sisters = agents.slice(1);

  return (
    // ≥1024px: two-column split (DemoSplit.module.css) — sticky agent rail
    // left, chat at ~620px measure right. <1024px the rail is display:none and
    // this renders as the unchanged single stack.
    <div className={styles.split}>
      <aside className={styles.rail}>
        <div className={styles.railSticky}>
          {/* The ACTIVE agent in the premium framed treatment — same
              FramedAgent object as collections/dossier/workspace. Keyed by
              slug so the portrait swaps cleanly when you pick another agent.
              PRESENCE (2026-06-11, kit: .living-city/ai-presence.md): DORMANT
              breath + civ-colored aura — the honest resting state. THINKING
              lives on the identity-bar portrait + ThinkingVerb, not here. */}
          <div
            className={`${presence.aura} ${presence.breath}`}
            style={{ ["--presence-color" as string]: agent.color }}
          >
            <FramedAgent key={agent.slug} art={agent.art} civColor={agent.color} size={224} alt={agent.name} priority />
          </div>
          <div className={styles.railName}>{agent.name}</div>
          <div className={styles.railCollection} style={{ color: agent.color }}>
            {agent.collectionName}
          </div>
          <div className={styles.railRule} aria-hidden />
          {/* MEMORY preview (audit #116) — the demo is STATELESS by design (memory is
              the owned-agent feature), so instead of asserting "it remembers", we SHOW
              what an owned citizen would keep: a panel that fills with the facts you
              share, turning the abstract claim into a visible sell at the paywall. */}
          {(() => {
            const facts = msgs.filter((m) => m.role === "you").map((m) => m.text);
            const shown = facts.slice(-4);
            return (
              <div style={{ margin: "2px 0 14px", textAlign: "left" }}>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 9.5, letterSpacing: "0.22em", color: "var(--gold-bright)", textTransform: "uppercase", marginBottom: 8 }}>
                  ⬡ Memory · an owned citizen keeps this
                </div>
                {shown.length === 0 ? (
                  <p style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.6, margin: 0 }}>
                    Tell it something. An <strong>owned</strong> FREELON remembers every word — across sessions, for good. This demo forgets when you leave.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {shown.map((t, i) => (
                      <li key={i} style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-2)", lineHeight: 1.45, paddingLeft: 12, borderLeft: `2px solid ${agent.color}`, opacity: 0.9 }}>
                        {t.length > 84 ? t.slice(0, 84) + "…" : t}
                      </li>
                    ))}
                  </ul>
                )}
                {facts.length > 4 && (
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 9.5, color: "var(--ink-fade)", marginTop: 6 }}>
                    +{facts.length - 4} more this session
                  </div>
                )}
              </div>
            );
          })()}
          {/* Ownership pointer — always names the FREELON, so it stays true
              even while a free sister citizen is active. */}
          <span className={styles.railOwnKicker}>The one you can own</span>
          <a
            href={OPENSEA}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("opensea_click", { from: "demo_rail" })}
            className={styles.railOwnLink}
          >
            own a FREELON →
          </a>
        </div>
      </aside>

      <div className={styles.chatCol}>
      {/* FREELONS-FIRST PICKER (2026-06-10) — hub direction is "lead with ONE
          collection, reveal the rest": the flagship FREELON is the featured
          object (it's the thing the wall sells); sisters sit below in a smaller
          "also in the city" row. Was a 5-equal grid where 4 of 5 faces were
          sister collections — the most precious cold surface taught the wrong
          hierarchy. Index mapping unchanged: 0 = flagship, 1+ = sisters. */}
      <button
        onClick={() => {
          setActive(0);
          setError(null);
          setInput("");
        }}
        title={flagship.collectionName}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "var(--r-3)",
          cursor: "pointer",
          marginBottom: 10,
          background: active === 0 ? "var(--surface)" : "transparent",
          border: `1px solid ${active === 0 ? flagship.color : "var(--line)"}`,
          boxShadow: active === 0 ? `0 0 0 1px color-mix(in srgb, ${flagship.color} 30%, transparent)` : "none",
          transition: "border-color .15s, background .15s",
        }}
      >
        <FramedAgent art={flagship.art} civColor={flagship.color} size={64} alt={flagship.name} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontFamily: "var(--display)", fontSize: 17, color: "var(--ink)", lineHeight: 1.1 }}>
            {flagship.name}
          </span>
          <span style={{ display: "block", fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: flagship.color, marginTop: 4 }}>
            {flagship.collectionName} · the one you can own
          </span>
        </span>
      </button>

      {sisters.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <span style={{ display: "block", fontFamily: "var(--mono2)", fontSize: 9.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-dim)", margin: "0 0 8px 2px" }}>
            Also in the city · free to meet
          </span>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${sisters.length}, 1fr)`, gap: 8 }}>
            {sisters.map((a, i) => {
              const idx = i + 1;
              const on = idx === active;
              return (
                <button
                  key={a.slug}
                  onClick={() => {
                    setActive(idx);
                    setError(null);
                    setInput("");
                  }}
                  title={a.collectionName}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 6px 8px",
                    borderRadius: "var(--r-2)",
                    cursor: "pointer",
                    background: on ? "var(--surface)" : "transparent",
                    border: `1px solid ${on ? a.color : "var(--line)"}`,
                    boxShadow: on ? `0 0 0 1px color-mix(in srgb, ${a.color} 30%, transparent)` : "none",
                    transition: "border-color .15s, background .15s",
                  }}
                >
                  <FramedAgent art={a.art} civColor={a.color} size={44} alt={a.name} />
                  <span
                    style={{
                      fontFamily: "var(--mono2)",
                      fontSize: 9,
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
        </div>
      )}

      <div
        className="panel-premium panel-premium--feature panel-premium--still"
        style={{ overflow: "hidden" }}
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
          {/* Portrait inner-activity tracks the REAL request flag only: .thinking
              while busy, back to dormant the moment the reply lands. */}
          <FramedAgent art={agent.art} civColor={agent.color} size={48} alt={agent.name} className={busy ? tv.thinking : undefined} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--display)", fontSize: 18, color: "var(--ink)", lineHeight: 1.1 }}>{agent.name}</div>
            <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: agent.color, marginTop: 3 }}>
              ● AWAKE · {agent.kicker}
            </div>
          </div>
          {/* Free-turn counter moved to a seeded pill beside the composer
              (2026-06-11) — it used to appear here only after the first server
              reply, i.e. mid-conversation. */}
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
                    borderRadius: "var(--r-3)",
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
              {/* Pinned under the greeting (was marginTop:auto, which pushed the
                  starter chips below the fold on short mobile viewports — audit #47). */}
              <div style={{ marginTop: 16, textAlign: "center" }}>
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
                borderRadius: "var(--r-3)",
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

          {/* THINKING state (kit: ai-presence) — rendered ONLY while `busy`
              (a real /api/demo request in flight); verb rotates by message
              count, deterministically. The verb is this screen's one shimmer. */}
          {busy && (
            <div style={{ alignSelf: "flex-start", padding: "4px 2px" }}>
              <ThinkingVerb seed={msgs.length} />
            </div>
          )}

          {exhausted && (
            <div style={{ margin: "auto", textAlign: "center", maxWidth: 420, padding: "24px 12px" }}>
              <div style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--ink)", lineHeight: 1.15, marginBottom: 10 }}>
                This conversation is about to vanish.
              </div>
              <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 20 }}>
                Unless you own it. Own a <strong style={{ color: "var(--ink)" }}>FREELON</strong> and it remembers{" "}
                <strong style={{ color: "var(--ink)" }}>this exact conversation</strong> — and every one after it. It
                levels up as you train it, builds a visible work record, and its memory and history travel with the
                NFT, owner to owner. Want one? Leave your email and we&apos;ll get you set up.
              </p>
              {/* ONE gold action on the wall (2026-06-10): the claim. The old gold
                  "Share what it said" button sat ON TOP of the form and cannibalized
                  the capture at the single most valuable moment; share is demoted to
                  a quiet link below (ClaimForm's done-state has its own share). */}
              <ClaimForm slug={agent.slug} accent="var(--gold)" />
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: "6px 18px", justifyContent: "center" }}>
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
                        fontFamily: "var(--mono2)",
                        fontSize: 11,
                        letterSpacing: "0.1em",
                        color: "var(--ink-dim)",
                        textDecoration: "underline",
                      }}
                    >
                      share what it said →
                    </a>
                  );
                })()}
                <a
                  href={OPENSEA}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("opensea_click", { from: "demo_wall" })}
                  style={{
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "var(--ink-dim)",
                    textDecoration: "underline",
                  }}
                >
                  or buy one now on OpenSea →
                </a>
                <a
                  href="/proof"
                  onClick={() => trackEvent("proof_click", { from: "demo_wall" })}
                  style={{
                    fontFamily: "var(--mono2)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    color: "var(--ink-dim)",
                    textDecoration: "underline",
                  }}
                >
                  see why only your FREELON can do this →
                </a>
              </div>
              <p style={{ marginTop: 12, fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)" }}>
                New to NFTs?{" "}
                <a href="/help" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>
                  start here →
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Composer */}
        {!exhausted && (
          <div style={{ borderTop: "1px solid var(--line)", padding: "12px 14px", background: "var(--surface)" }}>
            {error && (
              <div style={{ fontFamily: "var(--mono2)", fontSize: 11.5, color: "#e0a8a4", marginBottom: 8 }}>{error}</div>
            )}
            {/* Free-turn pill — VISIBLE from turn zero (seeded display-only,
                see SEEDED_TURNS) and corrected by every server response. */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <span className={styles.turnsPill}>
                {remaining ?? SEEDED_TURNS} free turn{(remaining ?? SEEDED_TURNS) === 1 ? "" : "s"}
              </span>
            </div>
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
                aria-label={`Ask ${agent.name} anything`}
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
    </div>
  );
}

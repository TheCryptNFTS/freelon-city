"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FramedAgent } from "@/components/FramedAgent";
import { FREELON_DEMO_DISPLAY } from "@/lib/demo-freelon";
import { trackEvent } from "@/lib/track";

/**
 * MEMORY PROOF — the homepage's "understanding by demonstration" beat (2026-06-09).
 *
 * The moat FREELON CITY sells is that your character REMEMBERS you and the
 * history travels with the NFT. The live /demo can't show that — it's stateless
 * per turn and metered by the shared free-run budget, so it must never sit on the
 * highest-traffic surface (homepage) where it would drain or be abused.
 *
 * So this module is DETERMINISTIC and ZERO-COST: it uses the visitor's OWN typed
 * fact to stage the remember-loop (say a thing → it's written to memory → it
 * recalls the thing "later"), then hands off to the real live agent at /demo and
 * the buy at OpenSea. No LLM call, no budget spend, no abuse vector, always works.
 * Copy-safe: no value/return claims.
 */

const CHIPS = [
  "I ship side projects at 2am",
  "I'm learning to trade",
  "I design brutalist interfaces",
];

// THE JOB MENU (V1 SIGNAL OS, 2026-06-10): the job beat gains a CHOICE so the
// staged loop teaches "you pick the work" — jobs are pull, not push. Outputs
// stay deterministic templates: no LLM, no budget spend, no reward claims.
const JOBS = [
  {
    id: "plan",
    label: "Plan my next move",
    out: (f: string) =>
      `Job done. Three moves, from what I know about you: lean in — “${f}” is leverage. Ship one thing this week. Tell the city when you do.`,
  },
  {
    id: "name",
    label: "Name what I'm building",
    out: (f: string) =>
      `Done. Name it after the habit, not the dream — “${f}” already sounds like a name waiting. I'd cut it to two words and own them.`,
  },
  {
    id: "bio",
    label: "Write my one-liner",
    out: (f: string) =>
      `Done. Try: “${f}” — unapologetic, present tense. That's not a bio, it's a position. I'll hold the longer story.`,
  },
] as const;

const OPENSEA = "https://opensea.io/collection/freelons";
const MAX = 80;

// Phases of the staged proof. Each later phase reveals one more transcript beat.
// 0 idle · 1 user+thinking · 2 ack · 3 memory-written · 4 later-divider · 5 recall+CTA
// 6 job-working · 7 job-output · 8 record-chips (the optional JOB beat, 2026-06-10:
// the demo taught remember-only; this one extra beat stages the train/work loop —
// job → output → XP + public record — still deterministic, still zero-cost).
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function MemoryProof() {
  const a = FREELON_DEMO_DISPLAY;
  const [fact, setFact] = useState("");
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>(0);
  const [job, setJob] = useState<(typeof JOBS)[number] | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startedRef = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function run(text: string) {
    const f = text.trim().replace(/\s+/g, " ").slice(0, MAX);
    if (!f || phase !== 0) return;
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("memory_proof_run");
    }
    setFact(f);
    setInput("");
    setPhase(1);

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const at = reduce
      ? [0, 0, 0, 0, 0]
      : [700, 1500, 2400, 3300, 0]; // ack, chip, divider, recall
    const set = (p: Phase, ms: number) =>
      timers.current.push(setTimeout(() => setPhase(p), ms));
    set(2, at[0]);
    set(3, at[1]);
    set(4, at[2]);
    set(5, at[3]);
  }

  function runJob(j: (typeof JOBS)[number]) {
    if (phase !== 5) return;
    trackEvent("memory_proof_job");
    setJob(j);
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setPhase(6);
    timers.current.push(setTimeout(() => setPhase(7), reduce ? 0 : 900));
    timers.current.push(setTimeout(() => setPhase(8), reduce ? 0 : 1900));
  }

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase(0);
    setFact("");
    setInput("");
    setJob(null);
  }

  return (
    <div className="mproof">
      <div className="mproof__head">
        <FramedAgent art={a.art} civColor={a.color} size={46} alt={a.name} />
        <div className="mproof__id">
          <div className="mproof__name">{a.name}</div>
          <div className="mproof__kicker" style={{ color: a.color }}>● AWAKE · A CITIZEN OF FREELON CITY</div>
        </div>
        {/* Honesty chip, visible DURING the loop, not just in the footnote —
            "unclear demo vs live" is a documented trust wound. */}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--mono2)",
            fontSize: 9.5,
            letterSpacing: "0.2em",
            color: "var(--ink-dim)",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "3px 9px",
            whiteSpace: "nowrap",
          }}
        >
          STAGED PREVIEW
        </span>
        {phase > 0 && (
          <button type="button" className="mproof__reset" onClick={reset}>↺ again</button>
        )}
      </div>

      <div className="mproof__stage">
        {phase === 0 && (
          <div className="mproof__intro">
            <p className="mproof__lead">Tell {a.name} one thing to remember about you.</p>
            <div className="mproof__chips">
              {CHIPS.map((c) => (
                <button key={c} type="button" className="mproof__chip" onClick={() => run(c)}>{c}</button>
              ))}
            </div>
          </div>
        )}

        {phase > 0 && (
          <div className="mproof__thread">
            <div className="mproof__row mproof__row--you"><span className="mproof__bubble mproof__bubble--you">{fact}</span></div>

            {phase === 1 && <div className="mproof__thinking">{a.name} is listening…</div>}

            {phase >= 2 && (
              <div className="mproof__row mproof__row--agent">
                <span className="mproof__bubble mproof__bubble--agent">
                  Noted: “{fact}.” I&apos;ll keep it — most minds forget you by morning. I won&apos;t.
                </span>
              </div>
            )}

            {phase >= 3 && (
              <div className="mproof__memchip"><span className="dot" />MEMORY WRITTEN · STORED TO THIS CITIZEN</div>
            )}

            {phase >= 4 && <div className="mproof__divider"><span>you close the tab · you come back, later</span></div>}

            {phase >= 5 && (
              <div className="mproof__row mproof__row--agent">
                <span className="mproof__bubble mproof__bubble--agent">
                  You&apos;re back. Last time, you told me: “{fact}.” I remember. So — what do we build today?
                </span>
              </div>
            )}

            {/* THE JOB BEAT — second act: memory was the hook, work is the
                loop. The visitor PICKS the job (jobs are pull) → output →
                XP + rep + public record. Still deterministic, still zero-cost. */}
            {phase === 5 && (
              <div style={{ marginTop: 4 }}>
                <p style={{ margin: "0 0 8px", fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)" }}>
                  Now give {a.name} its first job — you pick the work:
                </p>
                <div className="mproof__chips">
                  {JOBS.map((j) => (
                    <button key={j.id} type="button" className="mproof__chip" onClick={() => runJob(j)}>
                      {j.label} →
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === 6 && <div className="mproof__thinking">{a.name} is working…</div>}

            {phase >= 7 && (
              <div className="mproof__row mproof__row--agent">
                <span className="mproof__bubble mproof__bubble--agent">
                  {(job ?? JOBS[0]).out(fact)}
                </span>
              </div>
            )}

            {phase >= 8 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <div className="mproof__memchip"><span className="dot" />XP +10 · IT LEVELS AS IT WORKS</div>
                <div className="mproof__memchip"><span className="dot" />REP +1 · RELIABLE</div>
                <div className="mproof__memchip"><span className="dot" />WRITTEN TO ITS PUBLIC RECORD</div>
              </div>
            )}
          </div>
        )}
      </div>

      {phase >= 5 && (
        <div className="mproof__foot">
          {/* "permanent" overclaim removed 2026-06-10 (history is off-chain;
              COPY_LEGAL_CHECKLIST bans implied on-chain durability). */}
          <p className="mproof__sell">
            That memory is saved to this citizen — and when one is yours, every job it does
            lands on a public record that travels with the NFT.
          </p>
          <div className="mproof__cta">
            <Link className="btn btn-primary btn-sm" href="/demo" onClick={() => trackEvent("memory_proof_to_demo")}>
              <span className="ttl">Talk to a live one — free →</span>
            </Link>
            <a className="btn btn-secondary btn-sm" href={OPENSEA} target="_blank" rel="noreferrer" onClick={() => trackEvent("memory_proof_to_opensea")}>
              <span className="ttl">Own a FREELON →</span>
            </a>
          </div>
          <p style={{ margin: "10px 0 0", fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)" }}>
            This was a staged taste.{" "}
            <Link href="/report" style={{ color: "var(--ink-2)", textDecoration: "underline" }} onClick={() => trackEvent("memory_proof_to_report")}>
              See real citizens&apos; public records →
            </Link>
          </p>
        </div>
      )}

      {phase === 0 && (
        <form className="mproof__composer" onSubmit={(e) => { e.preventDefault(); run(input); }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={MAX}
            placeholder={`Tell ${a.name} something true about you…`}
            aria-label={`Tell ${a.name} one thing to remember`}
            className="mproof__input"
          />
          <button type="submit" disabled={!input.trim()} className="btn btn-primary btn-sm mproof__send">
            <span className="ttl">Remember this →</span>
          </button>
        </form>
      )}
    </div>
  );
}

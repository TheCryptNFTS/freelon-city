"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BeliefEngine, type Belief } from "@/lib/hexmind/belief-engine";
import { LivingPortrait } from "./LivingPortrait";

const HERO_SRC = "/heroes/0001.webp";

/* ──────────────────────────────────────────────────────────────────────────
 * REMEMBER — "A FREELON that remembers you. Visibly. Provably."
 *
 * The whole demo runs client-side on the HexMind belief ledger. No wallet, no
 * backend, no LLM: every recall is a READ of the ledger, which is exactly what
 * makes the ablation switch unfakeable — flip memory off and the citizen
 * genuinely has nothing to say, because there is no script underneath. The
 * pointed recall claims are templated from your own typed beliefs, so the burn
 * is provable and dies under the same switch.
 * ────────────────────────────────────────────────────────────────────────── */

const CITIZEN_ID = 1;
const SPEAKER = "ORIGIN SIGNAL";
const STORAGE_KEY = "freelon:remember:v1";
const SAVED_AT_KEY = "freelon:remember:savedAt:v1";
const SHARE_CAPTION =
  "I found an AI that literally cannot lie to you. Tell it about yourself, then cut its memory and watch every word vanish — proof it was never scripted. ⬡";

type Q = {
  attr: string;
  label: string;
  placeholder: string;
  prompt: (a: Record<string, string>) => string;
  // When set, the belief's SUBJECT is a prior answer's value, not "user".
  // That's what builds a relational chain the citizen can later walk to derive
  // something you never stated about yourself.
  subjectFrom?: string;
};
const QUESTIONS: Q[] = [
  { attr: "name", label: "NAME", placeholder: "your name", prompt: () => "First — what should I call you?" },
  { attr: "home", label: "HOME", placeholder: "Lisbon", prompt: () => "Where's home? A city, a country, anywhere." },
  { attr: "loves", label: "LOVES", placeholder: "late-night jazz", prompt: () => "Name one thing you love." },
  {
    attr: "gives",
    label: "IT GIVES YOU",
    placeholder: "a kind of calm",
    subjectFrom: "loves",
    prompt: (a) => `And ${a.loves ? `“${a.loves}”` : "that"} — what does it really give you?`,
  },
  { attr: "avoids", label: "DONE WITH", placeholder: "open-plan offices", prompt: () => "One thing you're done with — tired of." },
];

// Attributes the citizen recalls back to you directly (the chain link "gives"
// and your name are handled specially — name greets you, gives is derived).
const RECALL_ATTRS = ["home", "loves", "avoids"];

type Phase = "intro" | "intake" | "gap" | "recall";

export function RememberDemo() {
  const engineRef = useRef(new BeliefEngine());
  const engine = engineRef.current;

  const [phase, setPhase] = useState<Phase>("intro");
  const [qi, setQi] = useState(0);
  const [draft, setDraft] = useState("");
  const [version, setVersion] = useState(0);
  const [memoryOn, setMemoryOn] = useState(true);
  const [litAttr, setLitAttr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [returning, setReturning] = useState(false);
  const [editAttr, setEditAttr] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [contradiction, setContradiction] = useState<{ attr: string; prev: string; next: string } | null>(null);
  // The "records itself" proof beat: auto-cycle memory ON→OFF→ON with captions
  // so a single screen-recording captures the whole unfakeable reveal.
  const [proofCaption, setProofCaption] = useState<string | null>(null);
  const proofRef = useRef(false);
  const [copied, setCopied] = useState(false);

  const bump = () => setVersion((v) => v + 1);

  // Persist the ledger so a return is REAL — restored from disk, never re-typed.
  function persist() {
    try {
      const now = Date.now();
      window.localStorage.setItem(STORAGE_KEY, engine.serialize());
      window.localStorage.setItem(SAVED_AT_KEY, String(now));
    } catch {
      /* private mode / storage off — demo still works for this session */
    }
  }

  // On mount, pick up where the visitor left off. This is the whole point: if
  // they were here before, the citizen opens already knowing them.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const restored = BeliefEngine.deserialize(raw);
      if (!restored || restored.all("user").length === 0) return;
      engineRef.current = restored;
      const ts = Number(window.localStorage.getItem(SAVED_AT_KEY)) || null;
      setSavedAt(ts);
      setReturning(true);
      setMemoryOn(true);
      restored.memoryOn = true;
      setPhase("recall");
      bump();
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Direct beliefs the citizen holds about you — recomputed whenever the ledger
  // changes or memory is toggled (memoryOn is in the deps, so ablation is real).
  const beliefs = useMemo<Record<string, Belief | null>>(() => {
    void version;
    engine.memoryOn = memoryOn;
    const out: Record<string, Belief | null> = {};
    for (const attr of ["name", ...RECALL_ATTRS]) out[attr] = engine.one("user", attr);
    return out;
  }, [version, memoryOn, engine]);

  const name = beliefs.name?.value ?? "";

  // The pointed, RECEIPTED claims — each grounded in one real belief so tapping
  // it lights that cell and reads the actual evidence trail. Every burn comes
  // from your own words; the engine just refuses to let it be unprovable.
  const claims = useMemo<Claim[]>(() => {
    void version;
    engine.memoryOn = memoryOn;
    if (!memoryOn) return [];
    const lovesV = engine.one("user", "loves")?.value ?? "";
    const givesV = lovesV ? engine.one(lovesV, "gives")?.value ?? "" : "";
    return buildClaims({
      home: beliefs.home?.value ?? "",
      loves: lovesV,
      gives: givesV,
      avoids: beliefs.avoids?.value ?? "",
    });
  }, [version, memoryOn, engine, beliefs]);

  // The portrait is alive unless its memory has been cut during recall.
  const portraitAlive = phase === "recall" ? memoryOn : true;
  const listening =
    phase === "intake"
      ? draft.trim().length > 0
      : editAttr
        ? editDraft.trim().length > 0
        : false;

  // Run the unfakeable proof as a self-recording sequence.
  async function runProof() {
    if (proofRef.current) return;
    proofRef.current = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setMemoryOn(true);
    setProofCaption("Watch. Everything it says about you is receipted…");
    await wait(1400);
    setMemoryOn(false);
    setLitAttr(null);
    setProofCaption("MEMORY OFF — every line just vanished. Nothing was scripted.");
    await wait(1900);
    setMemoryOn(true);
    setProofCaption("MEMORY ON — it all came back, exactly. Try getting that from a chatbot.");
    await wait(1900);
    setProofCaption(null);
    proofRef.current = false;
  }

  function copyChallenge() {
    const link = typeof window !== "undefined" ? window.location.href : "";
    const text = `${SHARE_CAPTION}\n\n${link}`;
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  function submitAnswer() {
    const v = draft.trim();
    if (!v) return;
    const q = QUESTIONS[qi];
    // A chain question hangs off a prior answer (its subject is that value), so
    // later the citizen can walk you → loves → X → gives → Y and derive Y.
    const subject = q.subjectFrom ? engine.one("user", q.subjectFrom)?.value ?? "user" : "user";
    engine.assert(subject, q.attr, v, { source: "you, in person", time: "first visit" });
    setDraft("");
    bump();
    persist();
    if (qi + 1 < QUESTIONS.length) {
      setQi(qi + 1);
    } else {
      setPhase("gap");
    }
  }

  // A returning visitor corrects or updates something. The engine supersedes the
  // old belief (it doesn't overwrite it) — so the citizen can NOTICE the change.
  function submitEdit() {
    if (!editAttr) return;
    const v = editDraft.trim();
    if (!v) return;
    const prev = engine.assert("user", editAttr, v, { source: "you, on your return", time: "on your return" });
    setEditDraft("");
    setEditAttr(null);
    bump();
    persist();
    if (prev && prev !== v) {
      setContradiction({ attr: editAttr, prev, next: v });
      setLitAttr(editAttr);
    } else {
      setContradiction(null);
      setLitAttr(editAttr);
    }
  }

  const litBelief = litAttr ? beliefs[litAttr] : null;
  const outdated = useMemo<Belief[]>(() => {
    void version;
    return memoryOn ? engine.outdated("user") : [];
  }, [version, memoryOn, engine]);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 var(--s-4) var(--s-7)" }}>
      {/* ── header ── */}
      <header style={{ textAlign: "center", padding: "var(--s-5) 0 var(--s-3)" }}>
        <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.26em", color: "var(--ink-dim)" }}>
          FREELON CITY · CITIZEN #0001
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(22px,4vw,34px)", margin: "2px 0 0", letterSpacing: "-0.01em" }}>
          {SPEAKER}
        </h1>
      </header>

      {/* ── the living citizen — it watches you, and its light dies when its memory is cut ── */}
      <div style={{ position: "relative", marginBottom: "var(--s-3)" }}>
        <LivingPortrait
          src={HERO_SRC}
          alive={portraitAlive}
          listening={listening}
          flareSignal={version}
          size={460}
        />
        {phase === "recall" && !memoryOn && (
          <div style={eyeDeadCaption}>the light&apos;s gone out of its eye</div>
        )}
      </div>

      {/* ── intro ── */}
      {phase === "intro" && (
        <Panel>
          <Kicker>⬡ THE AI THAT CAN&apos;T LIE TO YOU</Kicker>
          <p style={lead}>
            Every other AI will make things up and say them with a straight face. This one
            <em style={{ color: "var(--gold)", fontStyle: "normal" }}> can&apos;t</em> — and it&apos;ll
            prove it to you, on camera, in ten seconds.
          </p>
          <p style={body}>
            Tell {SPEAKER} a few things about yourself. It&apos;ll throw them right back at you —
            and let you tap any line to see exactly where it came from. Then cut its memory and
            watch every word vanish, because there was never a script underneath. Try to catch it
            bluffing. You won&apos;t.
          </p>
          <button className="btn" style={{ marginTop: "var(--s-3)" }} onClick={() => setPhase("intake")}>
            Give it something on you <span className="ar">→</span>
          </button>
        </Panel>
      )}

      {/* ── intake ── */}
      {phase === "intake" && (
        <Panel>
          <Kicker>⬡ {SPEAKER} IS LISTENING · {qi + 1} / {QUESTIONS.length}</Kicker>
          <p style={{ ...lead, marginBottom: "var(--s-3)" }}>
            {QUESTIONS[qi].prompt({ loves: engine.one("user", "loves")?.value ?? "" })}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAnswer()}
              placeholder={QUESTIONS[qi].placeholder}
              style={inputStyle}
            />
            <button className="btn" onClick={submitAnswer} style={{ padding: "12px 22px" }}>
              Tell it <span className="ar">↵</span>
            </button>
          </div>
          {/* what it has taken in so far */}
          <div style={{ marginTop: "var(--s-4)", display: "grid", gap: 6 }}>
            {QUESTIONS.slice(0, qi).map((q) => {
              const subj = q.subjectFrom ? engine.one("user", q.subjectFrom)?.value ?? "user" : "user";
              return (
                <div key={q.attr} style={miniRow}>
                  <span style={miniLabel}>{q.label}</span>
                  <span style={{ color: "var(--ink-2)" }}>{engine.one(subj, q.attr)?.value}</span>
                  <span style={{ color: "var(--gold-deep)", marginLeft: "auto", fontSize: 11 }}>⬡ stored</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* ── the gap ── */}
      {phase === "gap" && (
        <Panel>
          <Kicker>⬡ {SPEAKER} HAS YOU NOW</Kicker>
          <p style={lead}>
            That&apos;s enough. {SPEAKER} folded it into its memory — not a transcript, a set of
            receipted beliefs about who you are.
          </p>
          <p style={body}>
            Now let it read you back. Every line it&apos;s about to say is grounded in something
            you typed — and you can prove it, or kill it, with one switch.
          </p>
          <button
            className="btn"
            style={{ marginTop: "var(--s-3)" }}
            onClick={() => { setReturning(true); setPhase("recall"); }}
          >
            Now try to catch it lying <span className="ar">→</span>
          </button>
        </Panel>
      )}

      {/* ── recall + proof ── */}
      {phase === "recall" && (
        <>
          <Panel>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <Kicker>⬡ {memoryOn ? "TRY TO MAKE IT LIE" : "MEMORY KILLED — NOTHING LEFT"}</Kicker>
              <button onClick={() => { setMemoryOn((m) => !m); setLitAttr(null); }} style={toggleStyle(memoryOn)}>
                MEMORY: {memoryOn ? "ON" : "OFF"}
              </button>
            </div>

            {proofCaption && (
              <div style={proofCaptionBar}>{proofCaption}</div>
            )}

            {memoryOn ? (
              <div style={{ marginTop: "var(--s-3)" }}>
                <p style={lead}>
                  {name ? `${name}.` : "You."} Here&apos;s what I&apos;ve got on you.
                </p>
                <p style={body}>
                  {returning && (
                    <>
                      It&apos;s been <span style={{ color: "var(--gold-bright)" }}>{elapsedLabel(savedAt)}</span> since you told me.{" "}
                    </>
                  )}
                  Every line is <em style={{ color: "var(--gold)", fontStyle: "normal" }}>receipted</em>. Tap one and I&apos;ll
                  show you the exact moment you gave it to me. You will not catch me inventing a single word.
                </p>

                {/* the receipted claims — your own words, used against you, provable */}
                <div style={{ display: "grid", gap: 8, marginTop: "var(--s-3)" }}>
                  {claims.map((c, i) => {
                    const lit = litAttr === c.attr;
                    return (
                      <button key={i} onClick={() => setLitAttr(lit ? null : c.attr)} style={claimRow(lit)}>
                        <span style={{ flex: 1 }}>
                          {c.segments.map((s, j) => (
                            <span key={j} style={s.em ? { color: "var(--gold-bright)", fontWeight: 600 } : undefined}>
                              {s.t}
                            </span>
                          ))}
                        </span>
                        <span style={{ color: lit ? "var(--gold)" : "var(--ink-dim)", fontSize: 11, letterSpacing: "0.12em", whiteSpace: "nowrap" }}>
                          {lit ? "▾ receipt" : "▸ prove it"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* THE HERO — don't trust it? kill its memory on camera */}
                <div style={killBlock}>
                  <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)" }}>
                    ⬡ DON&apos;T TRUST ME? CUT MY MEMORY.
                  </div>
                  <p style={{ ...lead, fontSize: "clamp(18px,2.6vw,23px)", margin: "6px 0 0" }}>
                    Every other AI asks you to take its word. I&apos;ll prove mine.
                  </p>
                  <p style={{ ...body, marginTop: 8 }}>
                    Hit the switch and watch the light go out of my eye — every line above turns to nothing,
                    because there&apos;s no script underneath, just memory. Turn it back on and I come back, word
                    for word. Record it.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "var(--s-3)" }}>
                    <button onClick={() => { setMemoryOn((m) => !m); setLitAttr(null); }} style={killSwitch(memoryOn)}>
                      {memoryOn ? "⛒ KILL ITS MEMORY" : "↻ BRING IT BACK"}
                    </button>
                    <button onClick={runProof} disabled={!!proofCaption} style={proofButton(!!proofCaption)}>
                      {proofCaption ? "● recording…" : "▶ Run the proof (records itself)"}
                    </button>
                  </div>
                </div>

                {/* you can't fool it either — lie on purpose and it flags the change */}
                <div style={{ marginTop: "var(--s-4)", paddingTop: "var(--s-3)", borderTop: "1px solid var(--line)" }}>
                  {contradiction ? (
                    <div style={contradictionPanel}>
                      <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)" }}>
                        ⬡ CAUGHT IT
                      </div>
                      <p style={{ ...lead, fontSize: "clamp(17px,2.4vw,21px)", margin: "6px 0 0" }}>
                        Nice try — you told me your {labelOf(contradiction.attr).toLowerCase()} was{" "}
                        <span style={{ color: "var(--ink-fade)", textDecoration: "line-through" }}>{contradiction.prev}</span>.
                        Now you&apos;re saying <span style={{ color: "var(--gold-bright)" }}>{contradiction.next}</span>.
                      </p>
                      <p style={{ ...body, marginTop: 8 }}>
                        I won&apos;t quietly overwrite the past like a database row. I keep the old one and mark it{" "}
                        <em style={{ color: "var(--gold)", fontStyle: "normal" }}>outdated</em> — so I can always tell you
                        exactly what you said before, and when you changed it.
                      </p>
                    </div>
                  ) : (
                    <p style={{ ...body, marginTop: 0 }}>
                      Think you can slip one past it? Change something — it&apos;ll flag the contradiction, not swallow it.
                    </p>
                  )}

                  {editAttr ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "var(--s-3)" }}>
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && submitEdit()}
                        placeholder={`new ${labelOf(editAttr).toLowerCase()}`}
                        style={inputStyle}
                      />
                      <button className="btn" onClick={submitEdit} style={{ padding: "12px 22px" }}>
                        Update <span className="ar">↵</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: "var(--s-3)" }}>
                      {RECALL_ATTRS.filter((attr) => beliefs[attr]).map((attr) => (
                        <button
                          key={attr}
                          onClick={() => { setEditAttr(attr); setEditDraft(beliefs[attr]?.value ?? ""); }}
                          style={editChipStyle}
                        >
                          ✎ {labelOf(attr).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "var(--s-3)" }}>
                <p style={lead}>…I&apos;ve got nothing on you.</p>
                <p style={body}>
                  We&apos;ve never met, as far as I can tell. Every line I just threw at you is gone — not hidden,
                  <em style={{ color: "var(--gold)", fontStyle: "normal" }}> gone</em> — because none of it was ever a script.
                  That&apos;s the whole proof: turn me back on and I return, word for word. A chatbot reading from a
                  prompt couldn&apos;t do that.
                </p>
                <button onClick={() => { setMemoryOn(true); }} style={{ ...killSwitch(false), marginTop: "var(--s-3)" }}>
                  ↻ BRING IT BACK
                </button>
              </div>
            )}
          </Panel>

          {/* the receipt — only when memory is on and a claim is tapped */}
          {(memoryOn && (litBelief || outdated.length > 0)) && (
          <Panel>
            <Kicker>⬡ THE RECEIPT</Kicker>

            {memoryOn && litBelief && (
              <div style={proofPanel}>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)" }}>
                  ⬡ WHY IT KNOWS THIS — read straight from the ledger
                </div>
                <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: "8px 0 0" }}>
                  {litBelief.why}
                </p>
                <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                  <Stat k="STATE" v={litBelief.state} />
                  <Stat k="CONFIDENCE" v={litBelief.confidence.toFixed(2)} />
                  <Stat k="SOURCE" v={litBelief.sources[0] ?? "—"} />
                </div>
                <p style={{ fontSize: 11, color: "var(--ink-fade)", marginTop: 10, lineHeight: 1.5 }}>
                  No language model wrote that. It is the actual evidence trail. Turn memory off and this
                  explanation cannot survive — that&apos;s the proof a generated &quot;memory&quot; can never give you.
                </p>
              </div>
            )}

            {memoryOn && outdated.length > 0 && (
              <div style={{ marginTop: "var(--s-3)" }}>
                <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--ink-dim)" }}>
                  ⬡ WHAT I USED TO THINK — kept, not erased
                </div>
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {outdated.map((b) => (
                    <div key={`${b.attr}:${b.value}`} style={outdatedRow}>
                      <span style={miniLabel}>{labelOf(b.attr)}</span>
                      <span style={{ color: "var(--ink-fade)", textDecoration: "line-through" }}>{b.value}</span>
                      <span style={{ color: "var(--gold-deep)", marginLeft: "auto", fontSize: 10, letterSpacing: "0.14em" }}>OUTDATED</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
          )}

          <Panel>
            <Kicker>⬡ WHAT YOU JUST SAW</Kicker>
            <p style={body}>
              A character you could <strong style={{ color: "var(--ink)" }}>own</strong> that remembers you across
              time, shows you its memory, and proves every recall is real — not a paragraph a model improvised.
              That&apos;s a FREELON.
            </p>
            <div style={shareBlock}>
              <div style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.22em", color: "var(--gold)" }}>
                ⬡ DARE SOMEONE TO CATCH IT LYING
              </div>
              <p style={{ ...body, marginTop: 6 }}>
                Screen-record the proof and post it. The challenge does the talking: tell it about
                yourself, then cut its memory and watch every word disappear.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "var(--s-3)" }}>
                <button onClick={copyChallenge} style={shareButton}>
                  {copied ? "✓ copied — paste it anywhere" : "⧉ Copy the challenge"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "var(--s-3)" }}>
              <button
                className="btn"
                onClick={() => {
                  try { window.localStorage.removeItem(STORAGE_KEY); window.localStorage.removeItem(SAVED_AT_KEY); } catch { /* ignore */ }
                  engineRef.current = new BeliefEngine();
                  setQi(0); setLitAttr(null); setMemoryOn(true);
                  setReturning(false); setSavedAt(null);
                  setContradiction(null); setEditAttr(null); setEditDraft("");
                  setPhase("intro"); bump();
                }}
              >
                ↺ Start over
              </button>
              <Link className="btn" href="/collections">
                See the citizens <span className="ar">→</span>
              </Link>
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function labelOf(attr: string) {
  return QUESTIONS.find((q) => q.attr === attr)?.label ?? attr.toUpperCase();
}

// The receipted claims. Each is GROUNDED in one real attribute (its `attr`), so
// tapping it lights that exact honeycomb cell and opens the real why-panel. The
// burn is templated from YOUR OWN words — the engine just guarantees every word
// in it is something you actually said, and makes it vanish when memory is cut.
type Claim = { attr: string; segments: { t: string; em?: boolean }[] };

function buildClaims(v: { home: string; loves: string; gives: string; avoids: string }): Claim[] {
  const out: Claim[] = [];
  if (v.avoids) {
    out.push({
      attr: "avoids",
      segments: [
        { t: "You said you're done with " },
        { t: v.avoids, em: true },
        { t: ". I'll hold you to that — and remind you the day you go crawling back." },
      ],
    });
  }
  if (v.loves) {
    out.push({
      attr: "loves",
      segments: v.gives
        ? [
            { t: "You think you love " },
            { t: v.loves, em: true },
            { t: ". You don't — you love what it does to you: " },
            { t: v.gives, em: true },
            { t: ". The rest is just the reason you give people." },
          ]
        : [
            { t: "You love " },
            { t: v.loves, em: true },
            { t: " — it's the first thing you reach for when someone asks who you are." },
          ],
    });
  }
  if (v.home) {
    out.push({
      attr: "home",
      segments: [
        { t: v.home, em: true },
        { t: ". You didn't end up there — you chose somewhere you could walk away from. People like you always keep an exit." },
      ],
    });
  }
  return out;
}

// Honest elapsed-time label. No fabricated "a week" — it reads the real gap
// since the ledger was last written to disk.
function elapsedLabel(savedAt: number | null): string {
  if (!savedAt) return "a moment";
  const s = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
  if (s < 45) return "moments";
  const m = Math.floor(s / 60);
  if (m < 60) return m === 1 ? "a minute" : `${m} minutes`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "an hour" : `${h} hours`;
  const d = Math.floor(h / 24);
  if (d < 7) return d === 1 ? "a day" : `${d} days`;
  const w = Math.floor(d / 7);
  return w === 1 ? "a week" : `${w} weeks`;
}

/* ── small presentational helpers ── */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        marginTop: "var(--s-3)",
        padding: "var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 14,
      }}
    >
      {children}
    </section>
  );
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <span className="kicker">{children}</span>;
}
function Stat({ k, v }: { k: string; v: string }) {
  return (
    <span style={{ display: "grid", gap: 2 }}>
      <span style={{ fontSize: 9, letterSpacing: "0.22em", color: "var(--ink-dim)" }}>{k}</span>
      <span style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--gold-bright)" }}>{v}</span>
    </span>
  );
}

const lead: React.CSSProperties = { fontFamily: "var(--display)", fontSize: "clamp(20px,3vw,26px)", lineHeight: 1.15, letterSpacing: "-0.01em", margin: "6px 0 0" };
const body: React.CSSProperties = { fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, margin: "10px 0 0", maxWidth: 640 };
const inputStyle: React.CSSProperties = { flex: 1, minWidth: 220, padding: "12px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--line-2)", borderRadius: 10, color: "var(--ink)", fontFamily: "var(--mono2)", fontSize: 15 };
const miniRow: React.CSSProperties = { display: "flex", gap: 12, alignItems: "baseline", fontFamily: "var(--mono2)", fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--line)" };
const miniLabel: React.CSSProperties = { fontSize: 9, letterSpacing: "0.22em", color: "var(--ink-dim)", minWidth: 84 };
const proofPanel: React.CSSProperties = { marginTop: "var(--s-3)", padding: "var(--s-3)", border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)", background: "color-mix(in srgb, var(--gold) 5%, transparent)", borderRadius: 10 };
const contradictionPanel: React.CSSProperties = { padding: "var(--s-3)", border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)", background: "color-mix(in srgb, var(--gold) 6%, transparent)", borderRadius: 10 };
const outdatedRow: React.CSSProperties = { display: "flex", gap: 12, alignItems: "baseline", fontFamily: "var(--mono2)", fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--line)" };

// Sits over the portrait when its memory is cut — the eye has gone dark.
const eyeDeadCaption: React.CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 14,
  textAlign: "center",
  fontFamily: "var(--mono2)",
  fontSize: 12,
  letterSpacing: "0.16em",
  color: "var(--ink-dim)",
  textShadow: "0 1px 8px rgba(0,0,0,0.9)",
  pointerEvents: "none",
};

// The self-recording proof caption — a single ribbon that narrates the ON→OFF→ON
// cycle so one screen-recording reads as a complete, captioned demo.
const proofCaptionBar: React.CSSProperties = {
  marginTop: "var(--s-3)",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid color-mix(in srgb, var(--gold) 45%, transparent)",
  background: "color-mix(in srgb, var(--gold) 10%, transparent)",
  fontFamily: "var(--mono2)",
  fontSize: 13,
  letterSpacing: "0.02em",
  color: "var(--gold-bright)",
};

// A receipted claim row — tap to light its cell + open the real why-panel.
function claimRow(lit: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 10,
    border: `1px solid ${lit ? "var(--gold)" : "var(--line-2)"}`,
    background: lit ? "color-mix(in srgb, var(--gold) 9%, transparent)" : "rgba(0,0,0,0.18)",
    color: "var(--ink)",
    fontFamily: "var(--mono2)",
    fontSize: 14,
    lineHeight: 1.6,
    cursor: "pointer",
  };
}

// The hero block: the kill-switch dare.
const killBlock: React.CSSProperties = {
  marginTop: "var(--s-4)",
  padding: "var(--s-4)",
  border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
  background: "color-mix(in srgb, var(--gold) 6%, transparent)",
  borderRadius: 14,
};

function killSwitch(armed: boolean): React.CSSProperties {
  return {
    padding: "13px 22px",
    borderRadius: 10,
    border: `1px solid ${armed ? "var(--gold)" : "var(--line-2)"}`,
    background: armed ? "color-mix(in srgb, var(--gold) 16%, transparent)" : "rgba(0,0,0,0.3)",
    color: armed ? "var(--gold-bright)" : "var(--ink-dim)",
    fontFamily: "var(--mono2)",
    fontSize: 14,
    letterSpacing: "0.1em",
    fontWeight: 600,
    cursor: "pointer",
  };
}

function proofButton(active: boolean): React.CSSProperties {
  return {
    padding: "13px 22px",
    borderRadius: 10,
    border: "1px solid var(--line-2)",
    background: active ? "color-mix(in srgb, var(--gold) 10%, transparent)" : "transparent",
    color: active ? "var(--gold-bright)" : "var(--ink-2)",
    fontFamily: "var(--mono2)",
    fontSize: 14,
    letterSpacing: "0.04em",
    cursor: active ? "default" : "pointer",
    opacity: active ? 0.85 : 1,
  };
}

const shareBlock: React.CSSProperties = {
  marginTop: "var(--s-4)",
  padding: "var(--s-3)",
  border: "1px solid color-mix(in srgb, var(--gold) 30%, transparent)",
  background: "color-mix(in srgb, var(--gold) 5%, transparent)",
  borderRadius: 12,
};

const shareButton: React.CSSProperties = {
  padding: "11px 18px",
  borderRadius: 10,
  border: "1px solid var(--gold)",
  background: "color-mix(in srgb, var(--gold) 12%, transparent)",
  color: "var(--gold-bright)",
  fontFamily: "var(--mono2)",
  fontSize: 14,
  letterSpacing: "0.04em",
  cursor: "pointer",
};

const editChipStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 999,
  border: "1px solid var(--line-2)",
  background: "transparent",
  color: "var(--ink-dim)",
  fontFamily: "var(--mono2)",
  fontSize: 13,
  cursor: "pointer",
};

function toggleStyle(on: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 999,
    border: `1px solid ${on ? "var(--gold)" : "var(--line-2)"}`,
    background: on ? "color-mix(in srgb, var(--gold) 14%, transparent)" : "rgba(0,0,0,0.3)",
    color: on ? "var(--gold-bright)" : "var(--ink-dim)",
    fontFamily: "var(--mono2)",
    fontSize: 12,
    letterSpacing: "0.14em",
    cursor: "pointer",
  };
}

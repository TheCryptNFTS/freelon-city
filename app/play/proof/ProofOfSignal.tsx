"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import { CivGlyph } from "@/components/CivGlyph";
import { tweetIntent, tweetProof, tweetProofPractice } from "@/lib/share";
import { cue } from "@/lib/arcade-feedback";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";
import { ArcadeTutorial } from "@/components/ArcadeTutorial";
import {
  PROOF_CODE_LEN,
  PROOF_MAX_ATTEMPTS,
  SIGNALS,
  proofCode,
  proofDayKey,
  proofDayNumber,
  scoreGuess,
  shareGrid,
  isSolved,
  type Peg,
} from "@/lib/proof-config";

/**
 * Proof of Signal — daily deterministic puzzle, fully client-side.
 *
 * The board, palette, and result are all derived from the day's code (computed
 * on mount so SSR/CSR can't mismatch across a UTC-midnight boundary). Progress
 * + streak persist in localStorage; there is no server and no economy.
 */

type Status = "playing" | "won" | "lost";
type SaveV1 = { guesses: string[][]; status: Status };
type Streak = { streak: number; lastDayKey: string };
type Mode = "daily" | "practice";
type Tier = "scout" | "signal" | "deep";

/**
 * Difficulty tiers — only the daily is the canonical, everyone-gets-the-same
 * puzzle (always SIGNAL: 5 signals / 6 tries), so its shared share-card stays
 * comparable. PRACTICE runs a fresh local frequency at the chosen tier; it
 * never touches the daily save, streak, or comparability — pure off-day reps.
 */
const TIERS: Record<Tier, { len: number; tries: number; label: string; sub: string }> = {
  scout: { len: 4, tries: 7, label: "SCOUT", sub: "4 signals · 7 tries" },
  signal: { len: 5, tries: 6, label: "SIGNAL", sub: "5 signals · 6 tries" },
  deep: { len: 6, tries: 6, label: "DEEP", sub: "6 signals · 6 tries" },
};
const DAILY_TIER: Tier = "signal";

/** A fresh, non-deterministic frequency for a practice drill (local only). */
function randomCode(len: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < len; i++) out.push(SIGNALS[Math.floor(Math.random() * SIGNALS.length)]);
  return out;
}

const PEG_STYLE: Record<Peg, { bg: string; ring: string; label: string }> = {
  locked: { bg: "var(--gold-bright)", ring: "var(--gold-bright)", label: "LOCKED" },
  carrier: { bg: "var(--neon-cyan)", ring: "var(--neon-cyan)", label: "CARRIER" },
  dead: { bg: "transparent", ring: "var(--line-2)", label: "DEAD AIR" },
};

function saveKey(dayKey: string) {
  // v2: code length grew 4→5, so old 4-signal saves must not rehydrate into
  // the new 5-cell board. A fresh key cleanly retires them.
  return `freelon:proof:v2:${dayKey}`;
}
const STREAK_KEY = "freelon:proof:v1:streak";
const BEST_KEY = "freelon:proof:v1:best";
// Practice personal-bests: fewest attempts to crack each tier. Local only,
// like the rest of practice — gives off-day reps a goal to beat.
const PRACTICE_BEST_KEY = "freelon:proof:v1:practice-best";
type PracticeBest = Partial<Record<Tier, number>>;

export function ProofOfSignal() {
  const [mounted, setMounted] = useState(false);
  const [day, setDay] = useState(0);
  const [dayKey, setDayKey] = useState("");
  const [code, setCode] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [copied, setCopied] = useState(false);

  // Practice (off-day drills) — fully local, never persisted, never on the
  // daily save/streak. The daily above stays canonical.
  const [mode, setMode] = useState<Mode>("daily");
  const [tier, setTier] = useState<Tier>("signal");
  const [pCode, setPCode] = useState<string[]>([]);
  const [pGuesses, setPGuesses] = useState<string[][]>([]);
  const [pCurrent, setPCurrent] = useState<string[]>([]);
  const [pStatus, setPStatus] = useState<Status>("playing");
  const [practiceBest, setPracticeBest] = useState<PracticeBest>({});
  const [newBest, setNewBest] = useState(false);
  // A lost code stays hidden until the player chooses to reveal it — so a
  // loss invites another think instead of force-spoiling the answer.
  const [revealed, setRevealed] = useState(false);

  // ── mount: resolve today's puzzle + restore saved progress ───────────────
  useEffect(() => {
    const d = proofDayNumber();
    const k = proofDayKey();
    setDay(d);
    setDayKey(k);
    setCode(proofCode(d));
    try {
      const raw = localStorage.getItem(saveKey(k));
      if (raw) {
        const s = JSON.parse(raw) as SaveV1;
        setGuesses(s.guesses ?? []);
        setStatus(s.status ?? "playing");
      }
      const sr = localStorage.getItem(STREAK_KEY);
      if (sr) setStreak((JSON.parse(sr) as Streak).streak ?? 0);
      const br = localStorage.getItem(BEST_KEY);
      if (br) setBestStreak(parseInt(br, 10) || 0);
      const pb = localStorage.getItem(PRACTICE_BEST_KEY);
      if (pb) setPracticeBest(JSON.parse(pb) as PracticeBest);
    } catch {
      /* corrupt/blocked storage — start fresh */
    }
    setMounted(true);
  }, []);

  // ── active puzzle: daily vs practice ─────────────────────────────────────
  const isDaily = mode === "daily";
  const activeTier: Tier = isDaily ? DAILY_TIER : tier;
  const codeLen = TIERS[activeTier].len;
  const maxAttempts = TIERS[activeTier].tries;
  const aCode = isDaily ? code : pCode;
  const aGuesses = isDaily ? guesses : pGuesses;
  const aCurrent = isDaily ? current : pCurrent;
  const aStatus = isDaily ? status : pStatus;

  // ── derived scoring of completed rows ────────────────────────────────────
  const scored = useMemo(
    () => aGuesses.map((g) => ({ guess: g, pegs: scoreGuess(g, aCode) })),
    [aGuesses, aCode],
  );
  const pegRows = scored.map((s) => s.pegs);

  const remainingRows = maxAttempts - aGuesses.length;
  const canSubmit = aStatus === "playing" && aCurrent.length === codeLen;

  // ── actions ──────────────────────────────────────────────────────────────
  const pick = (slug: string) => {
    if (aStatus !== "playing") return;
    const set = isDaily ? setCurrent : setPCurrent;
    set((c) => {
      if (c.length >= codeLen) return c;
      cue("tap");
      return [...c, slug];
    });
  };

  const backspace = () => {
    if (aStatus !== "playing") return;
    (isDaily ? setCurrent : setPCurrent)((c) => c.slice(0, -1));
  };

  const submit = () => {
    if (aCurrent.length !== codeLen || aStatus !== "playing") return;
    const pegs = scoreGuess(aCurrent, aCode);
    const solved = isSolved(pegs);
    const nextGuesses = [...aGuesses, aCurrent];
    const nextStatus: Status = solved
      ? "won"
      : nextGuesses.length >= maxAttempts
        ? "lost"
        : "playing";
    cue(solved ? "win" : nextStatus === "lost" ? "lose" : "clear");

    if (!isDaily) {
      // practice — ephemeral board, no streak, but we keep a per-tier
      // personal-best (fewest attempts) so drills have something to chase.
      setPGuesses(nextGuesses);
      setPCurrent([]);
      setPStatus(nextStatus);
      if (nextStatus === "won") {
        const attempts = nextGuesses.length;
        const prev = practiceBest[tier];
        if (prev === undefined || attempts < prev) {
          const updated = { ...practiceBest, [tier]: attempts };
          setPracticeBest(updated);
          setNewBest(true);
          try {
            localStorage.setItem(PRACTICE_BEST_KEY, JSON.stringify(updated));
          } catch {
            /* storage blocked — best still held in-session */
          }
        }
      }
      return;
    }

    setGuesses(nextGuesses);
    setCurrent([]);
    setStatus(nextStatus);
    try {
      localStorage.setItem(
        saveKey(dayKey),
        JSON.stringify({ guesses: nextGuesses, status: nextStatus } satisfies SaveV1),
      );
      // streak resolves once, on the transition into a terminal state
      if (nextStatus !== "playing") {
        const raw = localStorage.getItem(STREAK_KEY);
        const prev: Streak | null = raw ? (JSON.parse(raw) as Streak) : null;
        let next: number;
        if (nextStatus === "lost") {
          next = 0;
        } else {
          // won: continue the streak only if yesterday was the last solved day
          const y = proofDayKey(new Date(Date.now() - 86_400_000));
          next = prev && prev.lastDayKey === y ? prev.streak + 1 : 1;
        }
        localStorage.setItem(
          STREAK_KEY,
          JSON.stringify({ streak: next, lastDayKey: dayKey } satisfies Streak),
        );
        setStreak(next);
        if (next > bestStreak) {
          localStorage.setItem(BEST_KEY, String(next));
          setBestStreak(next);
        }
      }
    } catch {
      /* storage blocked — game still playable in-session */
    }
  };

  // ── practice controls ────────────────────────────────────────────────────
  const startPractice = (t: Tier) => {
    setTier(t);
    setMode("practice");
    setPCode(randomCode(TIERS[t].len));
    setPGuesses([]);
    setPCurrent([]);
    setPStatus("playing");
    setRevealed(false);
    setNewBest(false);
    cue("tap");
  };
  const newPractice = () => {
    setPCode(randomCode(codeLen));
    setPGuesses([]);
    setPCurrent([]);
    setPStatus("playing");
    setRevealed(false);
    setNewBest(false);
    cue("tap");
  };
  const goDaily = () => {
    setMode("daily");
    setRevealed(false);
    setNewBest(false);
    cue("tap");
  };

  const resultText = () =>
    isDaily
      ? tweetProof({
          day,
          attempts: aGuesses.length,
          max: maxAttempts,
          solved: aStatus === "won",
          grid: shareGrid(pegRows),
        })
      : tweetProofPractice({
          tier: TIERS[activeTier].label,
          len: codeLen,
          attempts: aGuesses.length,
          max: maxAttempts,
          solved: aStatus === "won",
          grid: shareGrid(pegRows),
        });

  const share = () => {
    if (typeof window !== "undefined") {
      window.open(tweetIntent(resultText()), "_blank", "noopener");
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(resultText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — share button still works */
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="manifesto" style={{ minHeight: "60vh" }}>
        <section className="manifesto-hero">
          <span className="kicker">⬡ PROOF OF SIGNAL</span>
          <h1>Tuning the <em>transmission</em>…</h1>
        </section>
      </div>
    );
  }

  const terminal = aStatus !== "playing";

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">
          ⬡ PROOF OF SIGNAL · {isDaily ? `DAY ${day}` : `${TIERS[activeTier].label} DRILL`}
        </span>
        <h1>
          Can you still <em>receive</em>?
        </h1>
        <p className="lead">
          {isDaily
            ? `The city broadcasts one frequency a day — ${PROOF_CODE_LEN} signals, in order, drawn from the ten doctrines. Tune to it in ${PROOF_MAX_ATTEMPTS} tries. Everyone gets the same transmission.`
            : `Off-day reps — a fresh ${codeLen}-signal frequency at ${TIERS[activeTier].label} difficulty. Practice never touches your daily streak.`}
        </p>
      </section>

      {/* How-this-works callout — 2026-05-31. Discord feedback: players
          treated this as a progression game ("uncovering puzzle bits",
          "how far to unlock clues") and one played it wrong for 30 min.
          It's Mastermind/Wordle — one hidden code, deduce it from the dot
          feedback. There is nothing to unlock and nothing to grind. This
          names the genre and the dots in plain English up front. */}
      <details className="proof-howto" open style={{
        maxWidth: 420,
        margin: "0 auto 18px",
        border: "1px solid var(--line)",
        borderTop: "2px solid var(--gold-bright)",
        background: "var(--bg-2)",
        padding: "12px 16px 14px",
        borderRadius: 8,
      }}>
        <summary style={{
          cursor: "pointer",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "var(--gold-bright)",
          textTransform: "uppercase",
          listStyle: "none",
        }}>
          ⬡ How this works — it&apos;s Wordle for signals
        </summary>
        <div style={{
          marginTop: 10,
          fontFamily: "var(--mono2)",
          fontSize: 12.5,
          lineHeight: 1.65,
          color: "var(--ink-2)",
        }}>
          <p style={{ margin: "0 0 8px" }}>
            There is <strong>one hidden code</strong> of {codeLen} signals. Guess
            it. After each guess the dots tell you how close you were:
          </p>
          <ul style={{ margin: "0 0 8px", paddingLeft: 0, listStyle: "none", display: "grid", gap: 4 }}>
            <li><Dot peg="locked" /> <strong>LOCKED</strong> — right signal, right spot.</li>
            <li><Dot peg="carrier" /> <strong>CARRIER</strong> — right signal, wrong spot.</li>
            <li><Dot peg="dead" /> <strong>DEAD AIR</strong> — not in the code at all.</li>
          </ul>
          <p style={{ margin: 0, color: "var(--ink-dim)" }}>
            Use the dots to narrow it down and crack the code within your tries.
            <strong> There are no clues to unlock and nothing to grind</strong> — it&apos;s
            pure deduction. One puzzle a day, same for everyone.
          </p>
        </div>
      </details>

      {/* mode switch — daily (canonical) vs practice (local drills) */}
      <div className="proof-modes">
        <button
          type="button"
          className={`proof-mode${isDaily ? " is-on" : ""}`}
          onClick={goDaily}
        >
          DAILY
        </button>
        <button
          type="button"
          className={`proof-mode${!isDaily ? " is-on" : ""}`}
          onClick={() => startPractice(tier)}
        >
          PRACTICE
        </button>
      </div>

      {/* difficulty tiers — only in practice */}
      {!isDaily && (
        <div className="proof-tiers">
          {(Object.keys(TIERS) as Tier[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`proof-tier${tier === t ? " is-on" : ""}`}
              onClick={() => startPractice(t)}
            >
              <span className="proof-tier__label">{TIERS[t].label}</span>
              <span className="proof-tier__sub">{TIERS[t].sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* streak line (daily only — practice has no streak) */}
      {isDaily && (
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: streak > 0 ? "var(--gold-bright)" : "var(--ink-fade)",
            margin: "16px 0 18px",
          }}
        >
          {streak > 0 ? `⬡ STREAK ${streak} DAY${streak === 1 ? "" : "S"}` : "NO STREAK YET"}
          {bestStreak > 0 && (
            <span style={{ color: "var(--ink-fade)" }}> · BEST {bestStreak}</span>
          )}
        </div>
      )}

      {/* practice personal-best for the current tier */}
      {!isDaily && (
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: practiceBest[tier] !== undefined ? "var(--gold-bright)" : "var(--ink-fade)",
            margin: "16px 0 18px",
          }}
        >
          {practiceBest[tier] !== undefined
            ? `⬡ ${TIERS[tier].label} BEST · ${practiceBest[tier]} ${practiceBest[tier] === 1 ? "TRY" : "TRIES"}`
            : `${TIERS[tier].label} · NO BEST YET`}
        </div>
      )}

      {/* board: one row per attempt */}
      <div style={{ display: "grid", gap: 8, maxWidth: 420, margin: "0 auto" }}>
        {/* completed rows */}
        {scored.map((row, ri) => (
          <Row key={`g${ri}`} signals={row.guess} pegs={row.pegs} len={codeLen} />
        ))}
        {/* current editable row */}
        {!terminal && (
          <Row signals={aCurrent} pegs={null} active len={codeLen} />
        )}
        {/* empty remaining rows */}
        {!terminal &&
          Array.from({ length: Math.max(0, remainingRows - 1) }).map((_, i) => (
            <Row key={`e${i}`} signals={[]} pegs={null} len={codeLen} />
          ))}
      </div>

      {/* result panel */}
      {terminal && (
        <div
          style={{
            maxWidth: 420,
            margin: "20px auto 0",
            border: `1px solid ${aStatus === "won" ? "var(--gold-bright)" : "var(--line)"}`,
            borderTop: `3px solid ${aStatus === "won" ? "var(--gold-bright)" : "var(--neon-magenta)"}`,
            background: "var(--bg-2)",
            padding: "20px 18px",
            textAlign: "center",
            boxShadow:
              aStatus === "won" ? "0 0 32px rgba(200,167,93,0.22)" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.24em",
              color: aStatus === "won" ? "var(--gold-bright)" : "var(--neon-magenta)",
              marginBottom: 8,
            }}
          >
            {aStatus === "won"
              ? isDaily
                ? "⬡ SIGNAL LOCKED"
                : `⬡ ${TIERS[activeTier].label} FREQUENCY CRACKED`
              : "✕ LOST IN THE NOISE"}
          </div>
          <div
            style={{
              fontFamily: "var(--display)",
              fontSize: "clamp(22px, 6vw, 32px)",
              color: "var(--ink)",
              lineHeight: 1.05,
              marginBottom: 6,
            }}
          >
            {aStatus === "won"
              ? `${aGuesses.length}/${maxAttempts}`
              : "THE FREQUENCY ESCAPED"}
          </div>
          {!isDaily && aStatus === "won" && newBest && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.24em",
                color: "var(--gold-bright)",
                marginBottom: 6,
              }}
            >
              ⬡ NEW {TIERS[activeTier].label} BEST
            </div>
          )}
          {/* on a loss, the code stays hidden until the player asks for it —
             a loss invites another think rather than force-spoiling the answer */}
          {aStatus === "lost" &&
            (revealed ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  margin: "10px 0 4px",
                }}
              >
                {aCode.map((slug, i) => (
                  <Cell key={i} slug={slug} peg="locked" small />
                ))}
              </div>
            ) : (
              <button
                onClick={() => {
                  setRevealed(true);
                  cue("tap");
                }}
                className="proof-btn"
                style={{ margin: "10px auto 4px" }}
              >
                ⬡ REVEAL THE FREQUENCY
              </button>
            ))}
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink-dim)",
              margin: "10px auto 16px",
              maxWidth: 320,
            }}
          >
            {isDaily
              ? aStatus === "won"
                ? "You received the transmission. Come back tomorrow for a new frequency."
                : "The city went quiet. A new frequency broadcasts tomorrow."
              : aStatus === "won"
                ? "Clean reception. Run another drill or step up the difficulty."
                : "Lost in the noise. Re-tune and run it again."}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {!isDaily && (
              <button onClick={newPractice} className="proof-btn proof-btn--gold">
                NEW PUZZLE →
              </button>
            )}
            <button onClick={share} className={`proof-btn${isDaily ? " proof-btn--gold" : ""}`}>
              SHARE TO X →
            </button>
            <button onClick={copyResult} className="proof-btn">
              {copied ? "COPIED" : "COPY RESULT"}
            </button>
          </div>
        </div>
      )}

      {/* signal palette + controls (hidden once terminal) */}
      {!terminal && (
        <div style={{ maxWidth: 420, margin: "20px auto 0" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
            }}
          >
            {SIGNALS.map((slug) => {
              const c = CIVILIZATIONS[slug];
              return (
                <button
                  key={slug}
                  onClick={() => pick(slug)}
                  disabled={aCurrent.length >= codeLen}
                  title={`${c.name} · ${c.doctrine}`}
                  className="proof-sig"
                  style={{ "--civ": c.color } as React.CSSProperties}
                >
                  <CivGlyph slug={slug} color={c.color} size={22} title={c.name} />
                  <span className="proof-sig__color" style={{ color: c.color }}>
                    {colorWord(slug)}
                  </span>
                  <span className="proof-sig__name">{c.doctrine}</span>
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              justifyContent: "center",
            }}
          >
            <button
              onClick={backspace}
              disabled={current.length === 0}
              className="proof-btn"
            >
              ← DELETE
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="proof-btn proof-btn--gold"
            >
              TRANSMIT
            </button>
          </div>
        </div>
      )}

      {/* legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          justifyContent: "center",
          marginTop: 22,
          flexWrap: "wrap",
        }}
      >
        {(["locked", "carrier", "dead"] as Peg[]).map((p) => (
          <span
            key={p}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--mono)",
              fontSize: 9,
              letterSpacing: "0.16em",
              color: "var(--ink-fade)",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: PEG_STYLE[p].bg,
                border: `1px solid ${PEG_STYLE[p].ring}`,
              }}
            />
            {PEG_STYLE[p].label}
          </span>
        ))}
      </div>

      {/* funnel CTA */}
      <div
        style={{
          maxWidth: 420,
          margin: "26px auto 0",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--ink-dim)",
            lineHeight: 1.6,
            marginBottom: 14,
          }}
        >
          Every citizen of FREELON CITY is born tuned to one of these ten
          doctrines. Find yours.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn btn-primary btn-sm" href="/sync">
            <span className="ttl">FIND YOUR SIGNAL →</span>
          </Link>
          <Link className="btn btn-secondary btn-sm" href="/civilizations">
            <span className="ttl">THE TEN DOCTRINES</span>
          </Link>
          <Link className="btn btn-ghost btn-sm" href="/play">
            <span className="ttl">← ARCADE</span>
          </Link>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
          <ArcadeSoundToggle />
          <ArcadeTutorial
            game="proof"
            title="Proof of Signal"
            accent="var(--gold-bright)"
            steps={[
              { glyph: "◇", text: "One hidden frequency a day — five signals drawn from the ten doctrines. Guess it." },
              { glyph: "✦", text: "After each guess, tiles show how close you are. You get six tries to tune in." },
              { glyph: "⬡", text: "Same daily for everyone — or hit PRACTICE for endless drills at three difficulties." },
            ]}
          />
        </div>
      </div>

      <style>{`
        .proof-sig {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          padding: 10px 4px;
          border: 1px solid var(--line);
          border-top: 2px solid var(--civ);
          background: var(--bg-2);
          border-radius: 8px;
          cursor: pointer;
          transition: transform .12s ease, border-color .12s ease, background .12s ease;
        }
        .proof-sig:hover:not(:disabled) {
          transform: translateY(-2px);
          background: var(--surface-2);
          box-shadow: 0 0 14px color-mix(in srgb, var(--civ) 30%, transparent);
        }
        .proof-sig:disabled { opacity: 0.4; cursor: not-allowed; }
        .proof-sig__color {
          font-family: var(--mono2); font-size: 9px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; line-height: 1;
        }
        .proof-sig__name {
          font-family: var(--mono2); font-size: 7px; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--ink-fade); text-align: center;
          line-height: 1.1;
        }
        .proof-btn {
          font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em;
          text-transform: uppercase;
          border: 1px solid var(--line); background: var(--surface);
          color: var(--ink-dim); padding: 10px 18px; cursor: pointer;
          border-radius: 6px; transition: border-color .12s, color .12s, background .12s;
        }
        .proof-btn:hover:not(:disabled) { color: var(--ink); border-color: var(--line-2); }
        .proof-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .proof-btn--gold {
          color: var(--gold-bright); border-color: var(--gold-bright);
          background: var(--surface-2);
        }
        .proof-btn--gold:hover:not(:disabled) { background: var(--tint-gold); }

        .proof-modes { display: flex; gap: 0; justify-content: center; margin: 4px auto 0; max-width: 280px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
        .proof-mode { flex: 1; font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; padding: 9px 10px; background: var(--bg-2); color: var(--ink-fade); border: none; cursor: pointer; transition: background .12s, color .12s; }
        .proof-mode + .proof-mode { border-left: 1px solid var(--line); }
        .proof-mode:hover { color: var(--ink-dim); }
        .proof-mode.is-on { background: var(--surface-2); color: var(--gold-bright); }
        .proof-tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 420px; margin: 12px auto 0; }
        .proof-tier { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 9px 4px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 8px; cursor: pointer; transition: border-color .12s, background .12s; }
        .proof-tier:hover { border-color: var(--line-2); }
        .proof-tier.is-on { border-color: var(--gold-bright); background: var(--surface-2); }
        .proof-tier__label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; color: var(--ink); }
        .proof-tier.is-on .proof-tier__label { color: var(--gold-bright); }
        .proof-tier__sub { font-family: var(--mono2); font-size: 8px; letter-spacing: 0.06em; color: var(--ink-fade); }
      `}</style>
    </div>
  );
}

/** The short, salient identifier for a signal: its color word (matches the
 *  glyph tint), e.g. "blue-synthesis" → "BLUE". This is what makes the board
 *  readable by name instead of by glyph-memorisation. */
function colorWord(slug: string): string {
  return slug.split("-")[0].toUpperCase();
}

/** A single board cell — a slot showing a chosen signal (glyph + color word, so
 *  every row reads as names), tinted by its peg result once scored. */
function Cell({
  slug,
  peg,
  small,
}: {
  slug: string | null;
  peg: Peg | null;
  small?: boolean;
}) {
  const w = small ? 44 : 64;
  const h = small ? 52 : 70;
  const glyph = small ? 18 : 26;
  const civ = slug ? CIVILIZATIONS[slug as keyof typeof CIVILIZATIONS] : null;
  const ring = peg ? PEG_STYLE[peg].ring : "var(--line)";
  const isLockedOrCarrier = peg === "locked" || peg === "carrier";
  return (
    <div
      title={civ ? `${civ.name}` : undefined}
      style={{
        width: w,
        height: h,
        flex: small ? "0 0 auto" : "1 1 0",
        maxWidth: w,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: civ ? 4 : 0,
        padding: "4px 2px",
        border: `1px solid ${ring}`,
        borderRadius: 8,
        background: peg === "dead" ? "var(--surface)" : "var(--bg-2)",
        boxShadow: isLockedOrCarrier
          ? `inset 0 0 0 1px ${ring}, 0 0 10px color-mix(in srgb, ${ring} 35%, transparent)`
          : "none",
        transition: "border-color .2s, box-shadow .2s",
        position: "relative",
      }}
    >
      {civ && <CivGlyph slug={slug as string} color={civ.color} size={glyph} title={civ.name} />}
      {civ && (
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: small ? 6 : 7,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            lineHeight: 1,
            color: peg === "dead" ? "var(--ink-fade)" : "var(--ink-dim)",
          }}
        >
          {colorWord(slug as string)}
        </span>
      )}
      {peg && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 3,
            right: 4,
            fontFamily: "var(--mono)",
            fontSize: 8,
            color: PEG_STYLE[peg].ring,
            opacity: peg === "dead" ? 0.5 : 1,
          }}
        >
          {peg === "locked" ? "⬡" : peg === "carrier" ? "◐" : "·"}
        </span>
      )}
    </div>
  );
}

/** One attempt row: `len` cells, padded with empties. */
function Row({
  signals,
  pegs,
  active,
  len = PROOF_CODE_LEN,
}: {
  signals: string[];
  pegs: Peg[] | null;
  active?: boolean;
  len?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        outline: active ? "1px dashed var(--line-2)" : "none",
        outlineOffset: 4,
        borderRadius: 8,
      }}
    >
      {Array.from({ length: len }).map((_, i) => (
        <Cell key={i} slug={signals[i] ?? null} peg={pegs ? pegs[i] : null} />
      ))}
    </div>
  );
}

/** Inline legend dot — used by the "how this works" callout. */
function Dot({ peg }: { peg: Peg }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 9,
        height: 9,
        borderRadius: "50%",
        marginRight: 4,
        verticalAlign: "middle",
        background: PEG_STYLE[peg].bg,
        border: `1px solid ${PEG_STYLE[peg].ring}`,
      }}
    />
  );
}

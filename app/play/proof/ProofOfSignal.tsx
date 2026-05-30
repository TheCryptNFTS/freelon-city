"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CIVILIZATIONS } from "@/lib/constants";
import { CivGlyph } from "@/components/CivGlyph";
import { tweetIntent, tweetProof } from "@/lib/share";
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

export function ProofOfSignal() {
  const [mounted, setMounted] = useState(false);
  const [day, setDay] = useState(0);
  const [dayKey, setDayKey] = useState("");
  const [code, setCode] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [current, setCurrent] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("playing");
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);

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
    } catch {
      /* corrupt/blocked storage — start fresh */
    }
    setMounted(true);
  }, []);

  // ── derived scoring of completed rows ────────────────────────────────────
  const scored = useMemo(
    () => guesses.map((g) => ({ guess: g, pegs: scoreGuess(g, code) })),
    [guesses, code],
  );
  const pegRows = scored.map((s) => s.pegs);

  const remainingRows = PROOF_MAX_ATTEMPTS - guesses.length;
  const canSubmit = status === "playing" && current.length === PROOF_CODE_LEN;

  // ── actions ──────────────────────────────────────────────────────────────
  const pick = useCallback(
    (slug: string) => {
      if (status !== "playing") return;
      setCurrent((c) => {
        if (c.length >= PROOF_CODE_LEN) return c;
        cue("tap");
        return [...c, slug];
      });
    },
    [status],
  );

  const backspace = useCallback(() => {
    if (status !== "playing") return;
    setCurrent((c) => c.slice(0, -1));
  }, [status]);

  const submit = useCallback(() => {
    if (current.length !== PROOF_CODE_LEN || status !== "playing") return;
    const nextGuesses = [...guesses, current];
    const pegs = scoreGuess(current, code);
    const solved = isSolved(pegs);
    const nextStatus: Status = solved
      ? "won"
      : nextGuesses.length >= PROOF_MAX_ATTEMPTS
        ? "lost"
        : "playing";

    setGuesses(nextGuesses);
    setCurrent([]);
    setStatus(nextStatus);
    cue(solved ? "win" : nextStatus === "lost" ? "lose" : "clear");

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
      }
    } catch {
      /* storage blocked — game still playable in-session */
    }
  }, [current, guesses, code, status, dayKey]);

  const share = useCallback(() => {
    const text = tweetProof({
      day,
      attempts: guesses.length,
      max: PROOF_MAX_ATTEMPTS,
      solved: status === "won",
      grid: shareGrid(pegRows),
    });
    if (typeof window !== "undefined") {
      window.open(tweetIntent(text), "_blank", "noopener");
    }
  }, [day, guesses.length, status, pegRows]);

  const copyResult = useCallback(async () => {
    const text = tweetProof({
      day,
      attempts: guesses.length,
      max: PROOF_MAX_ATTEMPTS,
      solved: status === "won",
      grid: shareGrid(pegRows),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — share button still works */
    }
  }, [day, guesses.length, status, pegRows]);

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

  const terminal = status !== "playing";

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">⬡ PROOF OF SIGNAL · DAY {day}</span>
        <h1>
          Can you still <em>receive</em>?
        </h1>
        <p className="lead">
          The city broadcasts one frequency a day — {PROOF_CODE_LEN} signals,
          in order, drawn from the ten doctrines. Tune to it in{" "}
          {PROOF_MAX_ATTEMPTS} tries. Everyone gets the same transmission.
        </p>
      </section>

      {/* streak line */}
      <div
        style={{
          textAlign: "center",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.2em",
          color: streak > 0 ? "var(--gold-bright)" : "var(--ink-fade)",
          marginBottom: 18,
        }}
      >
        {streak > 0 ? `⬡ STREAK ${streak} DAY${streak === 1 ? "" : "S"}` : "NO STREAK YET"}
      </div>

      {/* board: one row per attempt */}
      <div style={{ display: "grid", gap: 8, maxWidth: 420, margin: "0 auto" }}>
        {/* completed rows */}
        {scored.map((row, ri) => (
          <Row key={`g${ri}`} signals={row.guess} pegs={row.pegs} />
        ))}
        {/* current editable row */}
        {!terminal && (
          <Row signals={current} pegs={null} active />
        )}
        {/* empty remaining rows */}
        {!terminal &&
          Array.from({ length: Math.max(0, remainingRows - 1) }).map((_, i) => (
            <Row key={`e${i}`} signals={[]} pegs={null} />
          ))}
      </div>

      {/* result panel */}
      {terminal && (
        <div
          style={{
            maxWidth: 420,
            margin: "20px auto 0",
            border: `1px solid ${status === "won" ? "var(--gold-bright)" : "var(--line)"}`,
            borderTop: `3px solid ${status === "won" ? "var(--gold-bright)" : "var(--neon-magenta)"}`,
            background: "var(--bg-2)",
            padding: "20px 18px",
            textAlign: "center",
            boxShadow:
              status === "won" ? "0 0 32px rgba(200,167,93,0.22)" : "none",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.24em",
              color: status === "won" ? "var(--gold-bright)" : "var(--neon-magenta)",
              marginBottom: 8,
            }}
          >
            {status === "won" ? "⬡ SIGNAL LOCKED" : "✕ LOST IN THE NOISE"}
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
            {status === "won"
              ? `${guesses.length}/${PROOF_MAX_ATTEMPTS}`
              : "THE FREQUENCY ESCAPED"}
          </div>
          {/* on a loss, reveal the code so the day still teaches the ten */}
          {status === "lost" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                margin: "10px 0 4px",
              }}
            >
              {code.map((slug, i) => (
                <Cell key={i} slug={slug} peg="locked" small />
              ))}
            </div>
          )}
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--ink-dim)",
              margin: "10px auto 16px",
              maxWidth: 320,
            }}
          >
            {status === "won"
              ? "You received the transmission. Come back tomorrow for a new frequency."
              : "The city went quiet. A new frequency broadcasts tomorrow."}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={share} className="proof-btn proof-btn--gold">
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
                  disabled={current.length >= PROOF_CODE_LEN}
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
              { glyph: "◇", text: "One hidden frequency a day — four signals drawn from the ten doctrines. Guess it." },
              { glyph: "✦", text: "After each guess, tiles show how close you are. You get eight tries to tune in." },
              { glyph: "⬡", text: "Same puzzle for everyone, every day. Solve it and share your result to X." },
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

/** One attempt row: PROOF_CODE_LEN cells, padded with empties. */
function Row({
  signals,
  pegs,
  active,
}: {
  signals: string[];
  pegs: Peg[] | null;
  active?: boolean;
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
      {Array.from({ length: PROOF_CODE_LEN }).map((_, i) => (
        <Cell key={i} slug={signals[i] ?? null} peg={pegs ? pegs[i] : null} />
      ))}
    </div>
  );
}

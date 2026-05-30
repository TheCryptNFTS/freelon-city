"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cue } from "@/lib/arcade-feedback";
import { awardXp } from "@/lib/arcade-progress";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";
import {
  dayNumber,
  dayKey,
  dailyRng,
  resolveStreak,
  type StreakState,
} from "@/lib/daily";

/**
 * The Cipher — prototype #3 (the community ARG / glue).
 *
 * Five stages. Each is a small puzzle whose answer is grounded in real
 * FREELON CITY lore (the 404 event, the chants, the shape taxonomy, the OG
 * tagline). Solve a stage to unlock the next AND reveal one fragment of a
 * lost transmission. Collect all five and the transmission reassembles.
 *
 * Answers are checked case-insensitively against a small accept-list, with a
 * progressive hint after wrong tries. Progress persists in localStorage so a
 * solver can come back. Self-contained: no server, no spoilers in the DOM
 * (answers are normalized + compared, never rendered until solved).
 */

const SAVE_KEY = "freelon::play::cipher::v2";

type Stage = {
  n: number;
  kicker: string;
  clue: string;
  // shown verbatim — the puzzle surface
  cipher?: string;
  accept: string[]; // normalized accepted answers
  hint: string;
  fragment: string; // revealed on solve — one line of the transmission
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]/g, "");

const STAGES: Stage[] = [
  {
    n: 1,
    kicker: "FRAGMENT I · THE ERROR",
    clue: "The city is named for a number — the first error it ever threw. Four digits. Type it.",
    accept: ["4040", "404"],
    hint: "It's also the total supply of citizens.",
    fragment: "WE DID NOT VANISH —",
  },
  {
    n: 2,
    kicker: "FRAGMENT II · THE CHANT",
    clue: "A civilization's chant, shifted forward by four letters. Shift it back and name the DOCTRINE that chants it.",
    cipher: "AI LIEV. AI WCRG.",
    accept: ["synthesis", "bluesynthesis", "blue"],
    hint: "Shift each letter back 4: A→W, I→E … 'WE HEAR. WE SYNC.' Who syncs?",
    fragment: "WE MOVED.",
  },
  {
    n: 3,
    kicker: "FRAGMENT III · THE RAREST FORM",
    clue: "Sixteen sacred shapes hold the city. Only ten citizens wear the rarest — a high pointed gothic arch, the cathedral form. Name the shape.",
    accept: ["sanctum"],
    hint: "It starts with S and means a holy inner place.",
    fragment: "THE HEX IS NOT LOST.",
  },
  {
    n: 4,
    kicker: "FRAGMENT IV · COUNT THE LIGHTS",
    clue: "How many signal civilizations make up FREELON CITY? Spell the number or type the digits.",
    accept: ["10", "ten"],
    hint: "Blue, Red, Green, Purple, White, Pink, Black, Gold, Void, Silver.",
    fragment: "IT IS HELD —",
  },
  {
    n: 5,
    kicker: "FRAGMENT V · THE TAGLINE",
    clue: "Complete the city's oldest line. \"The hex didn't disappear. It ______.\"",
    accept: ["moved", "itmoved"],
    hint: "Same word that ends Fragment II's transmission.",
    fragment: "— BY EVERY ONE OF US.",
  },
];

type Save = { solved: number; tries: Record<number, number> };
const EMPTY: Save = { solved: 0, tries: {} };

// ── Daily Cryptogram ──────────────────────────────────────────────────────
// The story above is a fixed 5-stage ARG; the daily is the replayable hook:
// one Caesar-shifted FREELON CITY transmission per UTC day (seeded so everyone
// gets the same puzzle), a Wordle-style guess budget, and a streak. Decode the
// line before you run out of tries to bank the day.
type Mode = "story" | "daily";
const DAILY_MAX_TRIES = 5;
const STREAK_KEY = "freelon::play::cipher::streak::v1";
const DAILY_RESULT_KEY = "freelon::play::cipher::daily::v1";
type DailyResult = { dayKey: string; won: boolean; tries: number };

// Short canonical lore lines — uppercase A–Z + spaces only so a Caesar shift
// is clean and the decoded answer is recognisable. norm() ignores spacing on
// compare, so the player doesn't have to match punctuation exactly.
const PHRASES = [
  "WE DID NOT VANISH WE MOVED",
  "THE HEX DID NOT DISAPPEAR IT MOVED",
  "RESTORE THE SIGNAL",
  "THE CITY WAS NEVER GONE",
  "EVERY ONE OF US CARRIES THE HEX",
  "FOUR ZERO FOUR THE FIRST ERROR",
  "WE HEAR WE SYNC",
  "THE THRONE DECREES THE LIGHT",
  "DUST RUNNERS CARRY THE SIGNAL",
  "SWEEP THE CORRUPTED SPARE THE LIVING",
  "TEN CIVILIZATIONS ONE GRID",
  "THE SHAPE TAXONOMY IS THE BRAND",
  "HOLD THE LINE OF TRANSMISSION",
  "A CITIZEN COMES BACK ONLINE",
  "THE CHOIR TUNES THE OPEN BAND",
];

const caesar = (s: string, shift: number) =>
  s.replace(/[A-Z]/g, (c) =>
    String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65),
  );

// Coerce anything from localStorage into a valid Save. `solved` is clamped to
// a real integer in [0, STAGES.length]; a non-number (e.g. "x") previously
// rendered a broken "X/5" finale. `tries` falls back to an empty map.
function sanitize(raw: unknown): Save {
  if (!raw || typeof raw !== "object") return { solved: 0, tries: {} };
  const o = raw as Record<string, unknown>;
  const n =
    typeof o.solved === "number" && Number.isFinite(o.solved) ? o.solved : 0;
  const solved = Math.max(0, Math.min(STAGES.length, Math.floor(n)));
  const tries =
    o.tries && typeof o.tries === "object"
      ? (o.tries as Record<number, number>)
      : {};
  return { solved, tries };
}

export function Cipher() {
  const [save, setSave] = useState<Save>(EMPTY);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [justSolved, setJustSolved] = useState(false);

  // ── daily cryptogram state ────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>("story");
  const [dayNum, setDayNum] = useState(0);
  const [today, setToday] = useState("");
  const [dStreak, setDStreak] = useState(0);
  const streakRef = useRef<StreakState | null>(null);
  const [dResult, setDResult] = useState<DailyResult | null>(null);
  const [dWrong, setDWrong] = useState(0); // wrong guesses used today
  const [dInput, setDInput] = useState("");
  const [dShake, setDShake] = useState(false);
  const playedToday = dResult != null && dResult.dayKey === today;

  // The day's puzzle: a seeded phrase + Caesar shift (deterministic per day).
  const daily = useMemo(() => {
    if (!dayNum) return null;
    const rng = dailyRng(dayNum, "cipher");
    const phrase = PHRASES[Math.floor(rng() * PHRASES.length)];
    const shift = 1 + Math.floor(rng() * 25);
    return { phrase, shift, cipher: caesar(phrase, shift) };
  }, [dayNum]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw) setSave(sanitize(JSON.parse(raw)));
    } catch {
      /* ignore — fall through to a fresh save */
    }

    setDayNum(dayNumber());
    setToday(dayKey());
    try {
      const s = window.localStorage.getItem(STREAK_KEY);
      if (s) {
        const parsed = JSON.parse(s) as StreakState;
        streakRef.current = parsed;
        setDStreak(parsed.streak || 0);
      }
      const d = window.localStorage.getItem(DAILY_RESULT_KEY);
      if (d) {
        const parsed = JSON.parse(d) as DailyResult;
        setDResult(parsed);
        if (parsed.dayKey === dayKey()) setDWrong(parsed.tries);
      }
    } catch {
      /* corrupt prefs are non-fatal */
    }
  }, []);

  const persist = useCallback((s: Save) => {
    setSave(s);
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  const current = STAGES[save.solved]; // undefined when all solved
  const done = save.solved >= STAGES.length;

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!current) return;
      const guess = norm(input);
      if (current.accept.some((a) => norm(a) === guess) && guess.length > 0) {
        const nextSolved = save.solved + 1;
        persist({
          solved: nextSolved,
          tries: save.tries,
        });
        setInput("");
        setJustSolved(true);
        // Lifetime arcade XP (local-only, cosmetic) for recovering a fragment.
        awardXp("cipher", 25);
        cue(nextSolved >= STAGES.length ? "win" : "special");
        setTimeout(() => setJustSolved(false), 1400);
      } else {
        const tries = { ...save.tries, [current.n]: (save.tries[current.n] ?? 0) + 1 };
        persist({ ...save, tries });
        cue("error");
        // Respect reduced-motion preference — skip the shake (vestibular safety).
        const reduce =
          typeof window !== "undefined" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!reduce) {
          setShake(true);
          setTimeout(() => setShake(false), 450);
        }
      }
    },
    [current, input, persist, save],
  );

  const reset = useCallback(() => persist(EMPTY), [persist]);

  // Bank the daily result + resolve the streak. Win = decoded before the guess
  // budget runs out; loss = ran out of tries. One attempt-set per day.
  const bankDaily = useCallback(
    (won: boolean, wrongUsed: number) => {
      const next = resolveStreak(streakRef.current, won);
      streakRef.current = next;
      setDStreak(next.streak);
      const result: DailyResult = { dayKey: today, won, tries: wrongUsed };
      setDResult(result);
      try {
        window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
        window.localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
      } catch {
        /* persistence is best-effort */
      }
    },
    [today],
  );

  const submitDaily = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!daily || playedToday) return;
      const guess = norm(dInput);
      if (guess.length === 0) return;
      if (guess === norm(daily.phrase)) {
        setDInput("");
        // Lifetime arcade XP — more for a clean decode (fewer wrong guesses).
        awardXp("cipher", 40 + (DAILY_MAX_TRIES - dWrong) * 5);
        cue("win");
        bankDaily(true, dWrong);
        return;
      }
      const wrong = dWrong + 1;
      setDWrong(wrong);
      setDInput("");
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (wrong >= DAILY_MAX_TRIES) {
        cue("lose");
        bankDaily(false, wrong);
      } else {
        cue("error");
        if (!reduce) {
          setDShake(true);
          setTimeout(() => setDShake(false), 450);
        }
      }
    },
    [daily, playedToday, dInput, dWrong, bankDaily],
  );

  const dTriesLeft = Math.max(0, DAILY_MAX_TRIES - dWrong);
  // Mercy hint: after burning more than half the budget, reveal the shift.
  const dShowShift = dWrong >= 3 && !playedToday;

  const triesOnCurrent = current ? save.tries[current.n] ?? 0 : 0;
  const showHint = triesOnCurrent >= 2;

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">
          {mode === "daily"
            ? `⬡ DAILY CRYPTOGRAM · DAY ${dayNum}`
            : `⬡ ARG · THE CIPHER · ${save.solved}/5 DECODED`}
        </span>
        <h1>
          A transmission <em>broke apart</em>.
        </h1>
        <p className="lead">
          {mode === "daily"
            ? "Decode today's shifted line. One puzzle a day — keep the streak."
            : "Reassemble it, one fragment at a time."}
        </p>
      </section>

      {/* mode toggle — STORY (fixed 5-stage ARG) vs DAILY (seeded cryptogram) */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}
      >
        {(["story", "daily"] as Mode[]).map((m, k) => {
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "7px 18px",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.2em",
                fontWeight: 700,
                cursor: "pointer",
                border: "1px solid var(--line)",
                borderRight: k === 0 ? "none" : "1px solid var(--line)",
                borderRadius: k === 0 ? "6px 0 0 6px" : "0 6px 6px 0",
                background: active ? "var(--gold-bright)" : "transparent",
                color: active ? "#0a0e27" : "var(--ink-fade)",
                boxShadow: active ? "0 0 14px var(--gold-bright)" : "none",
                transition: "all .15s",
              }}
            >
              {m === "daily" ? "⬡ DAILY" : "▤ STORY"}
            </button>
          );
        })}
      </div>

      {mode === "daily" && (
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "center",
            alignItems: "baseline",
            marginBottom: 22,
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "var(--ink-fade)",
          }}
        >
          <span style={{ color: dStreak > 0 ? "var(--gold-bright)" : "var(--ink-fade)" }}>
            ⬡ STREAK {dStreak}
          </span>
          {!playedToday && <span>TRIES LEFT {dTriesLeft}</span>}
        </div>
      )}

      {mode === "story" && (
      <>
      {/* progress pips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        {STAGES.map((s, i) => (
          <span
            key={s.n}
            style={{
              width: 26,
              height: 4,
              background:
                i < save.solved ? "var(--gold-bright)" : "var(--line-2)",
              boxShadow:
                i < save.solved ? "0 0 8px var(--gold-bright)" : "none",
              transition: "background .3s",
            }}
          />
        ))}
      </div>

      {/* assembled transmission so far */}
      <div
        style={{
          maxWidth: 560,
          margin: "0 auto 28px",
          border: "1px solid var(--line)",
          background: "var(--bg-2)",
          padding: "20px 22px",
          minHeight: 80,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.26em",
            color: "var(--ink-fade)",
            marginBottom: 12,
          }}
        >
          ⬡ RECOVERED TRANSMISSION
        </div>
        {save.solved === 0 ? (
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 13,
              color: "var(--ink-fade)",
              letterSpacing: "0.1em",
            }}
          >
            ░░░░░░ ░░░ ░░░ ░░░░░░ ░░░░░░░░░░ ░░░░░░ ░░░░░
          </div>
        ) : (
          <div
            style={{
              fontFamily: "var(--display)",
              fontStyle: "italic",
              fontSize: "clamp(18px, 3vw, 24px)",
              lineHeight: 1.4,
              color: done ? "var(--gold-bright)" : "var(--ink)",
              textShadow: done ? "0 0 18px rgba(233,201,132,.4)" : "none",
            }}
          >
            {STAGES.slice(0, save.solved)
              .map((s) => s.fragment)
              .join(" ")}
          </div>
        )}
      </div>

      {/* active stage OR finale */}
      {!done && current ? (
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            border: "1px solid var(--line)",
            borderLeft: "2px solid var(--neon-cyan)",
            background: "var(--surface)",
            padding: "22px 24px",
            transform: shake ? "translateX(0)" : undefined,
            animation: shake ? "cipher-shake .4s" : undefined,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.26em",
              color: "var(--neon-cyan)",
              marginBottom: 14,
            }}
          >
            {current.kicker}
          </div>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.55,
              color: "var(--ink)",
              margin: "0 0 16px",
            }}
          >
            {current.clue}
          </p>

          {current.cipher && (
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 20,
                letterSpacing: "0.18em",
                color: "var(--gold-bright)",
                background: "var(--bg)",
                border: "1px dashed var(--line-2)",
                padding: "14px 16px",
                textAlign: "center",
                margin: "0 0 18px",
              }}
            >
              {current.cipher}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="decode here…"
              autoFocus
              spellCheck={false}
              style={{
                flex: 1,
                background: "var(--bg)",
                border: "1px solid var(--line-2)",
                color: "var(--ink)",
                fontFamily: "var(--mono)",
                fontSize: 15,
                letterSpacing: "0.08em",
                padding: "12px 14px",
                outline: "none",
              }}
            />
            <button className="btn btn-primary" type="submit">
              <span className="ttl">DECODE →</span>
            </button>
          </form>

          {showHint && (
            <div
              style={{
                marginTop: 14,
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--ink-dim)",
                letterSpacing: "0.06em",
              }}
            >
              HINT · {current.hint}
            </div>
          )}
          {justSolved && (
            <div
              style={{
                marginTop: 12,
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--success-bright)",
              }}
            >
              ✓ FRAGMENT RECOVERED
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            textAlign: "center",
            border: "1px solid var(--gold)",
            background: "var(--bg-2)",
            padding: "32px 24px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.26em",
              color: "var(--gold-bright)",
              marginBottom: 14,
            }}
          >
            ⬡ SIGNAL RESTORED
          </div>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--ink-dim)",
              margin: "0 0 22px",
            }}
          >
            You reassembled the transmission. The city was never gone — it
            moved. Now you carry it.
          </p>
          <div
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link className="btn btn-primary" href="/citizens">
              <span className="ttl">OWN A CITIZEN ↗</span>
            </Link>
            <Link className="btn btn-secondary" href="/lore">
              <span className="ttl">READ THE LORE</span>
            </Link>
          </div>
        </div>
      )}
      </>
      )}

      {/* ── DAILY CRYPTOGRAM ─────────────────────────────────────────────── */}
      {mode === "daily" && daily && (
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            border: "1px solid var(--line)",
            borderLeft: "2px solid var(--gold-bright)",
            background: "var(--surface)",
            padding: "22px 24px",
            animation: dShake ? "cipher-shake .4s" : undefined,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.26em",
              color: "var(--gold-bright)",
              marginBottom: 14,
            }}
          >
            ⬡ INTERCEPTED TRANSMISSION · SHIFTED
          </div>

          {/* the ciphertext */}
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: "clamp(15px, 4vw, 22px)",
              letterSpacing: "0.16em",
              color: "var(--gold-bright)",
              background: "var(--bg)",
              border: "1px dashed var(--line-2)",
              padding: "16px",
              textAlign: "center",
              margin: "0 0 18px",
              wordBreak: "break-word",
            }}
          >
            {daily.cipher}
          </div>

          {playedToday ? (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  color: dResult?.won ? "var(--success-bright)" : "var(--state-danger)",
                  marginBottom: 10,
                }}
              >
                {dResult?.won ? "✓ DECODED" : "✕ TRANSMISSION LOST"}
              </div>
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontStyle: "italic",
                  fontSize: "clamp(16px, 3vw, 22px)",
                  color: "var(--ink)",
                  marginBottom: 14,
                }}
              >
                “{daily.phrase}”
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: dStreak > 0 ? "var(--gold-bright)" : "var(--ink-fade)",
                  marginBottom: 8,
                }}
              >
                ⬡ STREAK {dStreak}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  color: "var(--ink-fade)",
                }}
              >
                ONE TRANSMISSION A DAY — COME BACK TOMORROW
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={submitDaily} style={{ display: "flex", gap: 10 }}>
                <input
                  value={dInput}
                  onChange={(e) => setDInput(e.target.value)}
                  placeholder="decode the transmission…"
                  autoFocus
                  spellCheck={false}
                  style={{
                    flex: 1,
                    background: "var(--bg)",
                    border: "1px solid var(--line-2)",
                    color: "var(--ink)",
                    fontFamily: "var(--mono)",
                    fontSize: 15,
                    letterSpacing: "0.08em",
                    padding: "12px 14px",
                    outline: "none",
                  }}
                />
                <button className="btn btn-primary" type="submit">
                  <span className="ttl">DECODE →</span>
                </button>
              </form>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--ink-dim)",
                  letterSpacing: "0.06em",
                }}
              >
                <span>TRIES LEFT · {dTriesLeft}</span>
                {dShowShift && <span>HINT · SHIFTED BY {daily.shift}</span>}
              </div>
            </>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          marginTop: 28,
          flexWrap: "wrap",
        }}
      >
        <Link className="btn btn-ghost" href="/play">
          <span className="ttl">← ARCADE</span>
        </Link>
        <button className="btn btn-ghost" onClick={reset} style={{ opacity: 0.6 }}>
          <span className="ttl">RESET</span>
        </button>
        <ArcadeSoundToggle />
      </div>

      <style>{`
        @keyframes cipher-shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

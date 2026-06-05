"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cue } from "@/lib/arcade-feedback";
import { tweetCipher, tweetIntent } from "@/lib/share";
import { awardXp, getProgress, equippedCosmetic } from "@/lib/arcade-progress";
import { ArcadeSoundToggle } from "@/components/ArcadeSoundToggle";
import { ArcadeTutorial } from "@/components/ArcadeTutorial";
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

const STAGES_PER_SEASON = 5;

type Season = { n: number; codename: string; stages: Stage[] };

const SEASON_ONE: Stage[] = [
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

// Season 2 — a fresh 5-stage transmission. Every answer is grounded in lore
// already live elsewhere in the city (castes, structures, the war sink, the
// sweep creed) so it stays canon and solvable, not invented.
const SEASON_TWO: Stage[] = [
  {
    n: 1,
    kicker: "FRAGMENT I · THE CARRIER",
    clue: "Dust Runners carry the signal across the outer city on one structure. Name the build.",
    accept: ["dust relay", "dustrelay", "relay"],
    hint: "Restore the Signal — the Dust Runner's structure.",
    fragment: "THE GRID REMEMBERS —",
  },
  {
    n: 2,
    kicker: "FRAGMENT II · THE SHIFTED OATH",
    clue: "A creed, shifted forward by five letters. Shift it back and read it.",
    cipher: "MTQI YMJ QNSJ",
    accept: ["hold the line", "holdtheline"],
    hint: "Shift each letter back 5: M→H, T→O, Q→L …",
    fragment: "EVERY HAND THAT HELD IT.",
  },
  {
    n: 3,
    kicker: "FRAGMENT III · THE COMPUTERS",
    clue: "Which caste computes pure signal inside the Synth Core? Two words.",
    accept: ["synth ascended", "synthascended"],
    hint: "Only 66 exist; their structure is the Synth Core.",
    fragment: "WE ARE THE SIGNAL NOW —",
  },
  {
    n: 4,
    kicker: "FRAGMENT IV · THE SINK",
    clue: "Burning real hex toward a civilization in the weekly war is called a ______. One word.",
    accept: ["tribute"],
    hint: "The Reckoning — you pay one to muster a side.",
    fragment: "NOT LOST,",
  },
  {
    n: 5,
    kicker: "FRAGMENT V · THE SWEEP CREED",
    clue: "Complete the sweeper's one rule: \"Sweep the corrupted, spare the ______.\"",
    accept: ["living", "theliving"],
    hint: "Sweep Run's single law — never sweep these.",
    fragment: "ONLY MOVED — AGAIN.",
  },
];

const STORY_SEASONS: Season[] = [
  { n: 1, codename: "THE FIRST TRANSMISSION", stages: SEASON_ONE },
  { n: 2, codename: "THE SECOND TRANSMISSION", stages: SEASON_TWO },
];

type Save = { solved: number; tries: Record<number, number>; season: number };
const EMPTY: Save = { solved: 0, tries: {}, season: 1 };

// ── Daily Cryptogram ──────────────────────────────────────────────────────
// The story above is a fixed 5-stage ARG; the daily is the replayable hook:
// one Caesar-shifted FREELON CITY transmission per UTC day (seeded so everyone
// gets the same puzzle), a Wordle-style guess budget, and a streak. Decode the
// line before you run out of tries to bank the day.
type Mode = "story" | "daily";
// Multi-stage daily: three escalating intercepts share ONE attempt budget.
// Every wrong guess AND every bought hint spends one attempt — that shared
// pool is the "hint economy": you can grind guesses or pay for the shift.
const DAILY_STAGES = 3;
const DAILY_BUDGET = 7;
const STREAK_KEY = "freelon::play::cipher::streak::v1";
const DAILY_RESULT_KEY = "freelon::play::cipher::daily::v1";
type DailyStageResult = { solved: boolean; hint: boolean };
type DailyResult = {
  dayKey: string;
  won: boolean;
  tries: number;
  // Per-stage outcome for the brand-glyph share grid (older v1 blobs omit it).
  stages?: DailyStageResult[];
};

// Brand-glyph share grid: ⬡ decoded clean · ◇ decoded with a bought hint ·
// ✕ never decoded. One glyph per stage, the recognisable spoiler-free hook.
function cipherGrid(stages: DailyStageResult[]): string {
  return stages.map((s) => (s.solved ? (s.hint ? "◇" : "⬡") : "✕")).join(" ");
}

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
  if (!raw || typeof raw !== "object") return { ...EMPTY };
  const o = raw as Record<string, unknown>;
  const n =
    typeof o.solved === "number" && Number.isFinite(o.solved) ? o.solved : 0;
  const solved = Math.max(0, Math.min(STAGES_PER_SEASON, Math.floor(n)));
  const tries =
    o.tries && typeof o.tries === "object"
      ? (o.tries as Record<number, number>)
      : {};
  // Older v1 blobs predate seasons → default to season 1.
  const sv =
    typeof o.season === "number" && Number.isFinite(o.season) ? Math.floor(o.season) : 1;
  const season = Math.max(1, Math.min(STORY_SEASONS.length, sv));
  return { solved, tries, season };
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
  const [dWrong, setDWrong] = useState(0); // attempts spent today (guesses + hints)
  const [dStage, setDStage] = useState(0); // current stage index 0..DAILY_STAGES-1
  const [dStageDone, setDStageDone] = useState<DailyStageResult[]>([]); // solved stages
  const [dHintShown, setDHintShown] = useState(false); // shift hint bought for THIS stage
  const [dInput, setDInput] = useState("");
  const [dShake, setDShake] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [themeAccent, setThemeAccent] = useState("var(--gold-bright)");
  const playedToday = dResult != null && dResult.dayKey === today;

  // The day's puzzle: DAILY_STAGES distinct seeded phrases, each Caesar-shifted
  // (deterministic per day; shifts grow so later stages bite harder).
  const daily = useMemo(() => {
    if (!dayNum) return null;
    const rng = dailyRng(dayNum, "cipher");
    const used = new Set<number>();
    const stages: { phrase: string; shift: number; cipher: string }[] = [];
    for (let s = 0; s < DAILY_STAGES; s++) {
      let pi = Math.floor(rng() * PHRASES.length);
      let guard = 0;
      while (used.has(pi) && guard++ < PHRASES.length) pi = Math.floor(rng() * PHRASES.length);
      used.add(pi);
      const phrase = PHRASES[pi];
      const shift = 1 + Math.floor(rng() * 25);
      stages.push({ phrase, shift, cipher: caesar(phrase, shift) });
    }
    return { stages };
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

    setThemeAccent(equippedCosmetic(getProgress(), "cipherTheme").accent);
  }, []);

  const persist = useCallback((s: Save) => {
    setSave(s);
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  // Active story season → its 5 stages. A local alias keeps the rest of the
  // component (which reads `STAGES`) unchanged while the data is now seasonal.
  const seasonIdx = Math.min(STORY_SEASONS.length - 1, Math.max(0, (save.season ?? 1) - 1));
  const storySeason = STORY_SEASONS[seasonIdx];
  const STAGES = storySeason.stages;
  const hasNextSeason = (save.season ?? 1) < STORY_SEASONS.length;

  const current = STAGES[save.solved]; // undefined when all solved
  const done = save.solved >= STAGES.length;

  // Advance to the next season's transmission — fresh stages, season bumped.
  const beginNextSeason = useCallback(() => {
    persist({ solved: 0, tries: {}, season: Math.min(STORY_SEASONS.length, (save.season ?? 1) + 1) });
    setInput("");
    cue("special");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [persist, save.season]);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!current) return;
      const guess = norm(input);
      if (current.accept.some((a) => norm(a) === guess) && guess.length > 0) {
        const nextSolved = save.solved + 1;
        persist({ ...save, solved: nextSolved });
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

  const reset = useCallback(
    () => persist({ solved: 0, tries: {}, season: save.season ?? 1 }),
    [persist, save.season],
  );

  // Bank the daily result + resolve the streak. Win = every stage decoded
  // before the shared budget runs out; loss = ran out of attempts. One
  // attempt-set per day; `stages` drives the brand-glyph share grid.
  const bankDaily = useCallback(
    (won: boolean, wrongUsed: number, stages: DailyStageResult[]) => {
      const next = resolveStreak(streakRef.current, won);
      streakRef.current = next;
      setDStreak(next.streak);
      const result: DailyResult = { dayKey: today, won, tries: wrongUsed, stages };
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
      const stage = daily.stages[dStage];
      if (!stage) return;
      const guess = norm(dInput);
      if (guess.length === 0) return;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (guess === norm(stage.phrase)) {
        // Stage decoded. Record whether a shift hint was bought for it.
        const done = [...dStageDone, { solved: true, hint: dHintShown }];
        setDStageDone(done);
        setDInput("");
        setDHintShown(false);
        if (dStage + 1 >= DAILY_STAGES) {
          // Final stage cleared → full decode. Clean stages (no hint) pay more.
          const clean = done.filter((s) => !s.hint).length;
          awardXp("cipher", 40 + clean * 15 + (DAILY_BUDGET - dWrong) * 5);
          cue("win");
          bankDaily(true, dWrong, done);
        } else {
          setDStage(dStage + 1);
          cue("special");
        }
        return;
      }

      // Wrong guess spends one attempt.
      const wrong = dWrong + 1;
      setDWrong(wrong);
      setDInput("");
      if (wrong >= DAILY_BUDGET) {
        // Budget gone — current + remaining stages count as lost.
        const lost: DailyStageResult[] = [...dStageDone];
        while (lost.length < DAILY_STAGES) lost.push({ solved: false, hint: false });
        cue("lose");
        bankDaily(false, wrong, lost);
      } else {
        cue("error");
        if (!reduce) {
          setDShake(true);
          setTimeout(() => setDShake(false), 450);
        }
      }
    },
    [daily, playedToday, dInput, dWrong, dStage, dStageDone, dHintShown, bankDaily],
  );

  // Hint economy: buy this stage's shift for one attempt from the shared pool.
  const buyHint = useCallback(() => {
    if (!daily || playedToday || dHintShown) return;
    const wrong = dWrong + 1;
    setDWrong(wrong);
    setDHintShown(true);
    cue("tap");
    if (wrong >= DAILY_BUDGET) {
      // Spending the last attempt on a hint ends the day on the current stage.
      const lost: DailyStageResult[] = [...dStageDone];
      while (lost.length < DAILY_STAGES) lost.push({ solved: false, hint: false });
      cue("lose");
      bankDaily(false, wrong, lost);
    }
  }, [daily, playedToday, dHintShown, dWrong, dStageDone, bankDaily]);

  const shareDaily = useCallback(() => {
    if (!dResult || !dResult.stages) return;
    const solved = dResult.stages.filter((s) => s.solved).length;
    const text = tweetCipher({
      day: dayNum,
      solved,
      stages: DAILY_STAGES,
      won: dResult.won,
      grid: cipherGrid(dResult.stages),
    });
    // Copy the grid to the clipboard (best-effort) AND open the X intent.
    try {
      void navigator.clipboard?.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1600);
    } catch {
      /* clipboard optional */
    }
    window.open(tweetIntent(text), "_blank", "noopener");
  }, [dResult, dayNum]);

  const dTriesLeft = Math.max(0, DAILY_BUDGET - dWrong);
  const dCurrentStage = daily?.stages[dStage] ?? null;

  const triesOnCurrent = current ? save.tries[current.n] ?? 0 : 0;
  const showHint = triesOnCurrent >= 2;

  return (
    <div className="manifesto" style={{ paddingBottom: 64 }}>
      <section className="manifesto-hero" style={{ paddingBottom: 8 }}>
        <span className="kicker">
          {mode === "daily"
            ? `⬡ DAILY CRYPTOGRAM · DAY ${dayNum}${playedToday ? "" : ` · STAGE ${Math.min(dStage + 1, DAILY_STAGES)}/${DAILY_STAGES}`}`
            : `⬡ ARG · THE CIPHER · S${save.season ?? 1} · ${save.solved}/${STAGES.length} DECODED`}
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
          {!playedToday && <span>ATTEMPTS LEFT {dTriesLeft}</span>}
          {/* stage progress pips — three intercepts to decode */}
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {Array.from({ length: DAILY_STAGES }).map((_, i) => {
              const r = dResult?.stages?.[i] ?? dStageDone[i];
              const filled = playedToday ? r?.solved : i < dStage;
              return (
                <span
                  key={i}
                  aria-hidden
                  style={{
                    width: 9,
                    height: 9,
                    transform: "rotate(45deg)",
                    background: filled ? "var(--gold-bright)" : i === dStage && !playedToday ? "var(--ink-dim)" : "var(--line-2)",
                    boxShadow: filled ? "0 0 7px var(--gold-bright)" : "none",
                  }}
                />
              );
            })}
          </span>
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
            ⬡ {storySeason.codename} · RESTORED
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
            {hasNextSeason
              ? " But the grid is still talking — another intercept just locked on."
              : " Every known transmission is decoded — more are still incoming."}
          </p>
          <div
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}
          >
            {hasNextSeason && (
              <button type="button" className="btn btn-primary" onClick={beginNextSeason}>
                <span className="ttl">DECODE THE NEXT TRANSMISSION →</span>
              </button>
            )}
            <Link className={hasNextSeason ? "btn btn-secondary" : "btn btn-primary"} href="/citizens">
              <span className="ttl">OWN A CITIZEN ↗</span>
            </Link>
            <Link className="btn btn-secondary" href="/canon#civilizations">
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
            borderLeft: `2px solid ${themeAccent}`,
            background: "var(--surface)",
            padding: "22px 24px",
            animation: dShake ? "cipher-shake .4s" : undefined,
          }}
        >
          {playedToday ? (
            // ── result: full decoded transmission + brand-glyph share grid ──
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  color: dResult?.won ? "var(--success-bright)" : "var(--state-danger)",
                  marginBottom: 14,
                }}
              >
                {dResult?.won
                  ? "✓ TRANSMISSION DECODED"
                  : `✕ SIGNAL LOST · ${dResult?.stages?.filter((s) => s.solved).length ?? 0}/${DAILY_STAGES}`}
              </div>
              {daily.stages.map((st, i) => {
                const r = dResult?.stages?.[i];
                return (
                  <div
                    key={i}
                    style={{
                      fontFamily: "var(--display)",
                      fontStyle: "italic",
                      fontSize: "clamp(14px, 2.6vw, 19px)",
                      color: r?.solved ? "var(--ink)" : "var(--ink-fade)",
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ color: r?.solved ? (r.hint ? "var(--ink-dim)" : "var(--gold-bright)") : "var(--state-danger)", marginRight: 8 }}>
                      {r?.solved ? (r.hint ? "◇" : "⬡") : "✕"}
                    </span>
                    {r?.solved ? `“${st.phrase}”` : "░░░░░ ░░░ ░░░░░░"}
                  </div>
                );
              })}
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 18,
                  letterSpacing: "0.3em",
                  color: "var(--gold-bright)",
                  margin: "16px 0 6px",
                }}
              >
                {cipherGrid(dResult?.stages ?? [])}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: dStreak > 0 ? "var(--gold-bright)" : "var(--ink-fade)",
                  marginBottom: 14,
                }}
              >
                ⬡ STREAK {dStreak}
              </div>
              <button className="btn btn-primary" onClick={shareDaily}>
                <span className="ttl">{shareCopied ? "COPIED ✓" : "SHARE GRID →"}</span>
              </button>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  color: "var(--ink-fade)",
                  marginTop: 14,
                }}
              >
                ONE TRANSMISSION A DAY — COME BACK TOMORROW
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.26em",
                  color: themeAccent,
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>⬡ INTERCEPT {dStage + 1} OF {DAILY_STAGES} · SHIFTED</span>
                {dStageDone.length > 0 && (
                  <span style={{ color: "var(--ink-fade)" }}>{dStageDone.length} BANKED</span>
                )}
              </div>

              {/* the current stage's ciphertext */}
              <div
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: "clamp(15px, 4vw, 22px)",
                  letterSpacing: "0.16em",
                  color: themeAccent,
                  background: "var(--bg)",
                  border: "1px dashed var(--line-2)",
                  padding: "16px",
                  textAlign: "center",
                  margin: "0 0 18px",
                  wordBreak: "break-word",
                }}
              >
                {dCurrentStage?.cipher}
              </div>

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
                  alignItems: "center",
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--ink-dim)",
                  letterSpacing: "0.06em",
                }}
              >
                <span>ATTEMPTS LEFT · {dTriesLeft}</span>
                {dHintShown ? (
                  <span style={{ color: themeAccent }}>SHIFTED BY {dCurrentStage?.shift}</span>
                ) : (
                  <button
                    type="button"
                    onClick={buyHint}
                    disabled={dTriesLeft <= 0}
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 11,
                      letterSpacing: "0.12em",
                      color: themeAccent,
                      background: "transparent",
                      border: "1px solid var(--line-2)",
                      borderRadius: 4,
                      padding: "5px 10px",
                      cursor: dTriesLeft > 0 ? "pointer" : "default",
                      opacity: dTriesLeft > 0 ? 1 : 0.4,
                    }}
                  >
                    REVEAL SHIFT · −1
                  </button>
                )}
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
        <ArcadeTutorial
          game="cipher"
          title="The Cipher"
          accent={themeAccent}
          steps={[
            { glyph: "✦", text: "Each stage poses a riddle grounded in FREELON CITY lore — read the clue, type your answer." },
            { glyph: "◇", text: "Solve a stage to reveal one fragment of a lost transmission. Wrong tries surface a hint." },
            { glyph: "⬡", text: "Daily decode: crack three shifted intercepts on one attempt budget. Spend an attempt to reveal a shift, or grind it out. Share your ⬡◇✕ grid." },
          ]}
        />
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

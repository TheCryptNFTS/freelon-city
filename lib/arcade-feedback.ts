/**
 * Arcade feedback — synthesized sound + haptics for the no-wallet arcade games.
 *
 * The biggest "juice" gap versus best-in-class casual games was silence: no
 * audio, no haptics. Rather than ship a pile of .mp3 assets (weight + licensing
 * + autoplay headaches) every cue here is synthesized on the fly with the Web
 * Audio API — a few oscillators with a short gain envelope. Zero network, zero
 * bytes, and the timbre stays on-brand (clean digital "signal" blips).
 *
 * Design rules:
 *  - SSR-safe: all browser access is lazy + guarded, so importing this on the
 *    server is a no-op.
 *  - One shared AudioContext, created on the first real cue (a user gesture),
 *    which is what browsers require to allow audio.
 *  - A single persisted mute pref gates BOTH sound and haptics, so one toggle
 *    silences the game completely.
 *  - Respects prefers-reduced-motion for haptics only (vibration is "motion"
 *    for some users); sound is unaffected by that query.
 */

export type Cue =
  | "tap" // selecting / placing a tile
  | "swap" // committing a swap / reveal
  | "clear" // a match clears
  | "combo" // cascade chain
  | "special" // a special tile forged / big event
  | "levelup" // advanced a level / milestone
  | "win" // run won / puzzle solved
  | "lose" // run lost / game over
  | "error" // illegal move / wrong guess
  | "flag"; // toggling a flag (sweep)

const MUTE_KEY = "freelon::arcade::muted::v1";

let ctx: AudioContext | null = null;
let muted = false;
let loadedPref = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Read the persisted mute pref once (cheap to call repeatedly afterwards). */
function ensurePref(): void {
  if (loadedPref || !isBrowser()) return;
  loadedPref = true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    /* storage blocked — default to unmuted */
  }
}

export function isMuted(): boolean {
  ensurePref();
  return muted;
}

export function setMuted(next: boolean): void {
  ensurePref();
  muted = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

export function toggleMuted(): boolean {
  setMuted(!isMuted());
  return muted;
}

function audioCtx(): AudioContext | null {
  if (!isBrowser()) return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  return ctx;
}

/** One short tone with an attack/decay envelope. */
function tone(
  ac: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  type: OscillatorType,
  peak: number,
) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

/** Per-cue recipe: a list of [freqHz, delaySec, durSec, type, peakGain]. */
type Note = [number, number, number, OscillatorType, number];

const RECIPES: Record<Cue, Note[]> = {
  tap: [[520, 0, 0.07, "square", 0.05]],
  flag: [[360, 0, 0.06, "triangle", 0.06]],
  swap: [
    [440, 0, 0.06, "sine", 0.06],
    [620, 0.05, 0.07, "sine", 0.06],
  ],
  clear: [
    [660, 0, 0.08, "triangle", 0.07],
    [990, 0.04, 0.09, "triangle", 0.05],
  ],
  combo: [
    [523, 0, 0.07, "square", 0.06],
    [659, 0.06, 0.07, "square", 0.06],
    [880, 0.12, 0.1, "square", 0.07],
  ],
  special: [
    [392, 0, 0.09, "sawtooth", 0.06],
    [587, 0.07, 0.09, "sawtooth", 0.06],
    [784, 0.14, 0.14, "sawtooth", 0.07],
  ],
  levelup: [
    [523, 0, 0.09, "triangle", 0.07],
    [659, 0.08, 0.09, "triangle", 0.07],
    [784, 0.16, 0.16, "triangle", 0.08],
  ],
  win: [
    [523, 0, 0.12, "triangle", 0.08],
    [659, 0.1, 0.12, "triangle", 0.08],
    [784, 0.2, 0.12, "triangle", 0.08],
    [1046, 0.3, 0.24, "triangle", 0.09],
  ],
  lose: [
    [330, 0, 0.16, "sawtooth", 0.07],
    [247, 0.12, 0.18, "sawtooth", 0.07],
    [165, 0.26, 0.3, "sawtooth", 0.07],
  ],
  error: [
    [220, 0, 0.1, "square", 0.06],
    [180, 0.06, 0.14, "square", 0.06],
  ],
};

/** Haptic pattern (ms) per cue, used when the device supports vibration. */
const HAPTICS: Partial<Record<Cue, number | number[]>> = {
  tap: 8,
  flag: 10,
  swap: 12,
  clear: 14,
  combo: [10, 30, 18],
  special: [14, 24, 28],
  levelup: [12, 40, 20],
  win: [20, 50, 20, 50, 40],
  lose: [60, 40, 90],
  error: [30, 20, 30],
};

function prefersReducedMotion(): boolean {
  if (!isBrowser() || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Fire a cue: synthesized sound + (where supported) a haptic tap. No-ops when
 * muted, on the server, or when the Web Audio API is unavailable. Safe to call
 * from any event handler.
 */
export function cue(name: Cue): void {
  if (isMuted()) return;
  const ac = audioCtx();
  if (ac) {
    // A context can start suspended until a gesture resumes it.
    if (ac.state === "suspended") void ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    for (const [freq, delay, dur, type, peak] of RECIPES[name]) {
      tone(ac, freq, t0 + delay, dur, type, peak);
    }
  }
  const pattern = HAPTICS[name];
  if (
    pattern != null &&
    !prefersReducedMotion() &&
    isBrowser() &&
    typeof navigator.vibrate === "function"
  ) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* vibration not permitted — ignore */
    }
  }
}

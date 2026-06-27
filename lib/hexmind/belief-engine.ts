/**
 * HexMind belief engine — browser-safe TS port of the headless ledger proven in
 * hexmind/memory_benchmark/engines/hexmind.js (proto005–011).
 *
 * What makes this different from "store the chat and re-prompt":
 *   - A memory is a TYPED belief (subject, attr, value), never a bare string.
 *   - Truth comes from accumulated EVIDENCE (signed +/- with a SOURCE and TIME),
 *     so repetition raises CONFIDENCE and a contradiction is visible, not silently
 *     overwritten.
 *   - The "why" is the REAL evidence trail + supersession path — not a story the
 *     model made up after the fact. It is read directly from the ledger.
 *   - ABLATION is the unfakeable proof: flip `memoryOn` off and every recall
 *     genuinely vanishes, because recall is a READ of this ledger and nothing
 *     else. (Mirrors the proto006 ablation: kill the substrate → the answer is
 *     gone. A scripted reply could not do that.)
 *
 * This module is deliberately tiny and dependency-free so it runs in the browser
 * for the /remember demo. No network, no wallet, no persistence.
 */

export type Evidence = { pol: 1 | -1; source: string; time: string };
export type Fact = {
  subject: string;
  attr: string;
  value: string;
  ev: Evidence[];
  superseded: boolean;
  supersededBy: string | null;
};
export type TruthState = "true" | "false" | "unknown" | "conflicted" | "outdated";

export type Belief = {
  subject: string;
  attr: string;
  value: string;
  state: TruthState;
  confidence: number;
  sources: string[];
  why: string;
  evidence: Evidence[];
};

// Attributes where only ONE current value can hold; a newer value outdates the old.
const SINGLE_VALUED = new Set(["name", "home", "working_on", "loves", "avoids", "gives"]);

function stateOf(pos: number, neg: number): TruthState {
  if (pos > 0 && neg > 0) return "conflicted";
  if (pos > 0) return "true";
  if (neg > 0) return "false";
  return "unknown";
}

function confidenceOf(pos: number, neg: number): number {
  const total = pos + neg;
  if (!total) return 0;
  const net = Math.abs(pos - neg);
  if (!net) return 0;
  const reinforce = 1 - 0.35 * Math.pow(0.55, net - 1);
  return +(reinforce * (net / total)).toFixed(2);
}

export class BeliefEngine {
  private facts = new Map<string, Fact>();
  private order: string[] = [];
  /** The substrate switch. Off = every recall read returns nothing. */
  memoryOn = true;

  private key(s: string, a: string, v: string) {
    return `${a}|${s}>${v}`;
  }

  private touch(subject: string, attr: string, value: string): Fact {
    const k = this.key(subject, attr, value);
    let f = this.facts.get(k);
    if (!f) {
      f = { subject, attr, value, ev: [], superseded: false, supersededBy: null };
      this.facts.set(k, f);
      this.order.push(k);
    }
    return f;
  }

  private pos = (f: Fact) => f.ev.filter((e) => e.pol > 0).length;
  private neg = (f: Fact) => f.ev.filter((e) => e.pol < 0).length;

  private liveState(f: Fact): TruthState {
    if (f.superseded) return "outdated";
    return stateOf(this.pos(f), this.neg(f));
  }

  private whyOf(f: Fact): string {
    const ev = f.ev
      .map((e) => `${e.pol > 0 ? "+" : "−"} ${e.source} · ${e.time}`)
      .join(", ");
    let line = `${f.subject} ${f.attr.replace(/_/g, " ")} "${f.value}" — ${this.liveState(
      f,
    )} (confidence ${confidenceOf(this.pos(f), this.neg(f))}). Evidence: ${ev}`;
    if (f.supersededBy && this.facts.get(f.supersededBy)) {
      line += ` — superseded by "${this.facts.get(f.supersededBy)!.value}"`;
    }
    return line;
  }

  /**
   * The ONLY place beliefs change. A query never mutates the ledger.
   * Returns the value of a prior belief this assertion superseded (so the UI can
   * say "you told me X before"), or null when nothing was contradicted.
   */
  assert(
    subject: string,
    attr: string,
    value: string,
    ev: { pol?: 1 | -1; source: string; time: string },
  ): string | null {
    const v = value.trim();
    if (!v) return null;
    const pol = ev.pol ?? 1;

    let supersededValue: string | null = null;
    if (SINGLE_VALUED.has(attr) && pol === 1) {
      const k = this.key(subject, attr, v);
      for (const [fk, f] of this.facts) {
        if (
          f.subject === subject &&
          f.attr === attr &&
          fk !== k &&
          !f.superseded &&
          this.liveState(f) === "true"
        ) {
          f.superseded = true;
          f.supersededBy = k;
          supersededValue = f.value;
        }
      }
    }

    const f = this.touch(subject, attr, v);
    f.ev.push({ pol, source: ev.source, time: ev.time });
    return supersededValue;
  }

  /** Live true beliefs for (subject, attr), with full provenance. Gated by ablation. */
  current(subject: string, attr: string): Belief[] {
    if (!this.memoryOn) return [];
    const out: Belief[] = [];
    for (const f of this.facts.values()) {
      if (f.subject === subject && f.attr === attr && this.liveState(f) === "true") {
        out.push({
          subject: f.subject,
          attr: f.attr,
          value: f.value,
          state: "true",
          confidence: confidenceOf(this.pos(f), this.neg(f)),
          sources: f.ev.filter((e) => e.pol > 0).map((e) => e.source),
          why: this.whyOf(f),
          evidence: f.ev.slice(),
        });
      }
    }
    return out;
  }

  /** First live belief for an attribute (the common single-valued case). */
  one(subject: string, attr: string): Belief | null {
    return this.current(subject, attr)[0] ?? null;
  }

  /** Everything the engine currently believes about a subject (ablation-gated). */
  all(subject: string): Belief[] {
    if (!this.memoryOn) return [];
    const out: Belief[] = [];
    for (const f of this.facts.values()) {
      if (f.subject === subject && this.liveState(f) === "true") {
        out.push(this.one(subject, f.attr)!);
      }
    }
    // de-dupe by attr|value
    const seen = new Set<string>();
    return out.filter((b) => {
      const k = `${b.attr}|${b.value}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  /** Outdated / superseded beliefs — the "I used to think…" trail. */
  outdated(subject: string): Belief[] {
    const out: Belief[] = [];
    for (const f of this.facts.values()) {
      if (f.subject === subject && f.superseded) {
        out.push({
          subject: f.subject,
          attr: f.attr,
          value: f.value,
          state: "outdated",
          confidence: confidenceOf(this.pos(f), this.neg(f)),
          sources: f.ev.filter((e) => e.pol > 0).map((e) => e.source),
          why: this.whyOf(f),
          evidence: f.ev.slice(),
        });
      }
    }
    return out;
  }

  knows(subject: string, attr: string): boolean {
    return this.memoryOn && this.one(subject, attr) !== null;
  }

  /**
   * Derive a fact the user NEVER stated, by WALKING the ledger: follow live
   * `true` beliefs subject → value → (that value as the next subject) until a
   * terminal node, and return the deepest path of at least two hops. The
   * conclusion is a node the user actually typed, reached along a path the user
   * built — there is no authored punchline, no lookup table, no synonym map. If
   * you ever feel tempted to add one, stop: that is the lie.
   *
   * It is ablation-gated exactly like every other read: memory off → null, so
   * the "it knew something I never told it" reveal genuinely vanishes under the
   * switch, and that vanish is mechanically guaranteed (not a styled animation).
   */
  derive(start: string): { value: string; path: Fact[] } | null {
    if (!this.memoryOn) return null;
    let best: Fact[] = [];
    const liveFrom = (subject: string): Fact[] => {
      const out: Fact[] = [];
      for (const f of this.facts.values()) {
        if (f.subject === subject && this.liveState(f) === "true") out.push(f);
      }
      return out;
    };
    const walk = (subject: string, path: Fact[], seen: Set<string>) => {
      for (const f of liveFrom(subject)) {
        if (seen.has(f.value)) continue; // no cycles
        const next = [...path, f];
        if (next.length > best.length) best = next;
        walk(f.value, next, new Set(seen).add(f.value));
      }
    };
    walk(start, [], new Set([start]));
    return best.length >= 2 ? { value: best[best.length - 1].value, path: best } : null;
  }

  /**
   * Dump the whole ledger so a returning visitor genuinely picks up where they
   * left off. This is what makes "come back later" real rather than scripted:
   * the beliefs below are restored from disk, not re-typed.
   */
  serialize(): string {
    return JSON.stringify({
      v: 1,
      facts: Array.from(this.facts.entries()),
      order: this.order,
      memoryOn: this.memoryOn,
    });
  }

  static deserialize(json: string): BeliefEngine | null {
    const e = new BeliefEngine();
    try {
      const d = JSON.parse(json);
      if (!d || !Array.isArray(d.facts)) return null;
      e.facts = new Map(d.facts as [string, Fact][]);
      e.order = Array.isArray(d.order) ? d.order : [];
      e.memoryOn = d.memoryOn !== false;
    } catch {
      return null;
    }
    return e;
  }
}

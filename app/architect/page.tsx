/**
 * /architect — the persona behind FREELON CITY.
 *
 * Anon-safe: the architect is a persona, not a person. No real name,
 * face, or biographical detail. The page exists so investors, studios,
 * and ingestors have an answer to "who builds this?" — the answer is
 * "one architect, independent, working on it daily."
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Architect",
  description:
    "One architect. Independent. No VC. Building FREELON CITY daily. The city is the work.",
};

export default function ArchitectPage() {
  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      <section style={{ marginBottom: "var(--s-5)" }}>
        <span className="kicker">⬡ THE ARCHITECT</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(44px, 7vw, 80px)", lineHeight: 0.94, letterSpacing: "-0.02em", margin: "10px 0 14px" }}>
          One architect.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>Every carrier builds the city.</em>
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 640 }}>
          FREELON CITY is built and operated by a single architect, working
          independently and daily — but the city itself is built by every
          carrier who posts, sweeps, transmits, or names a citizen. No VC,
          no roadmap pressure, no exit plan. We&apos;re building this thing together.
        </p>
      </section>

      {/* ── PRINCIPLES ── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ PRINCIPLES</span>
        <div style={{ marginTop: "var(--s-3)", display: "grid", gap: "var(--s-3)" }}>
          <Principle
            n="01"
            title="Active beats passive."
            body="Hex flows to carriers who move — sweeps, snipes, sales, daily posts. Sitting still pauses the meter. The city rewards work, not waiting."
          />
          <Principle
            n="02"
            title="Display is enforcement."
            body="When a citizen is dumped below floor, the city refuses to recognize it. No on-chain hooks, no permission needed — the brand layer is the lever."
          />
          <Principle
            n="03"
            title="Brand is the moat."
            body="Mechanics get copied in a week. Voice, glyph, and vocabulary don't. Every surface speaks the same way for a reason."
          />
          <Principle
            n="04"
            title="Anonymity is intentional."
            body="The architect's identity is irrelevant to whether the city moves. The contract, the code, and the numbers are public. That's the trust surface."
          />
          <Principle
            n="05"
            title="4040 is the cap. Always."
            body="No re-mints. No additional supply on the primary contract. Expansion, if it ever happens, lives in adjacent collections — it does not dilute the original."
          />
        </div>
      </section>

      {/* ── OPERATIONAL FACTS ── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ OPERATIONAL FACTS</span>
        <div
          style={{
            marginTop: "var(--s-3)",
            padding: "var(--s-4)",
            border: "1px solid var(--line)",
            background: "rgba(255,255,255,0.02)",
            borderRadius: 12,
            display: "grid",
            gap: 10,
            fontFamily: "var(--mono2)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.7,
          }}
        >
          <Fact label="STATUS"        value="Active · daily commits · independent" />
          <Fact label="FUNDING"       value="None. Secondary royalties are the only revenue." />
          <Fact label="COMMITMENT"    value="No sunset date. No exit timeline." />
          <Fact label="GOVERNANCE"    value="Sole architect. Inputs welcome via /relay & DM." />
          <Fact label="CONTACT"       value={<a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex on X</a>} />
          <Fact label="CODE / BUILD"  value="Next.js 15 · TypeScript · Upstash · Vercel" />
        </div>
      </section>

      {/* ── ON BUS FACTOR ── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ ON BUS FACTOR</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.75, marginTop: "var(--s-2)" }}>
          Honest answer: one architect means the city depends on the architect
          continuing to ship. The mitigations are: (1) the contract is immutable
          and lives forever on Ethereum, (2) the metadata is on IPFS and pinned
          redundantly, (3) the static site can be cloned from any git mirror, and
          (4) the hex ledger is reconstructable from public on-chain events plus
          the small set of off-chain stores. The city as canon does not require
          the architect to maintain anything for the citizens to remain citizens.
        </p>
      </section>

      {/* ── HOW TO TALK TO THE ARCHITECT ── */}
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ TO TALK</span>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginTop: "var(--s-2)" }}>
          DM <a href="https://x.com/4040hex" target="_blank" rel="noreferrer" style={{ color: "var(--gold)" }}>@4040hex</a> on X.
          Coordinate channel rights, partner proposals, press inquiries, or feedback through there.
          The architect reads every signal.
        </p>
      </section>

      <section style={{ marginTop: "var(--s-7)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/numbers"><span className="ttl">SEE PULSE →</span></Link>
          <Link className="btn btn-secondary" href="/roadmap"><span className="ttl">THE ROADMAP →</span></Link>
          <Link className="btn btn-secondary" href="/press"><span className="ttl">PRESS KIT →</span></Link>
        </div>
      </section>
    </div>
  );
}

function Principle({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article
      style={{
        padding: "var(--s-3) var(--s-4)",
        border: "1px solid var(--line)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: "var(--mono2)", fontSize: 10, letterSpacing: "0.28em", color: "var(--gold)" }}>{n}</span>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 20, margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
      </div>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.65, margin: "10px 0 0" }}>{body}</p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, letterSpacing: "0.26em", color: "var(--ink-dim)", textTransform: "uppercase", minWidth: 110 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

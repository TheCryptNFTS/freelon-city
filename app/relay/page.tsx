import type { Metadata } from "next";
import Link from "next/link";
import { REPLY_PROMPTS, tweetIntent } from "@/lib/share";
import { CopyToClipboardButton } from "@/components/CopyToClipboardButton";

export const metadata: Metadata = {
  title: "Relay · post the signal · FREELON CITY",
  description: "Carriers don't drop links. They tag the signal. Ten ready-to-post X templates that lead with @4040hex.",
};

const CAT_LABEL: Record<string, { label: string; color: string }> = {
  "own-post":  { label: "OWN POST",       color: "var(--gold)" },
  "reply":     { label: "REPLY",          color: "#7AB7FF" },
  "quote":     { label: "QUOTE-REPLY",    color: "#A989C7" },
};

export default function RelayPage() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "var(--s-5) var(--s-4) var(--s-7)" }}>
      {/* Hero */}
      <section
        style={{
          padding: "var(--s-6) var(--s-5)",
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(90deg, rgba(5,5,5,0.95) 0%, rgba(5,5,5,0.5) 100%), url(/atmos/sync.webp) center / cover no-repeat",
          border: "1px solid var(--line-2)",
          marginBottom: "var(--s-5)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ RELAY · POST THE SIGNAL</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(36px, 6vw, 56px)", lineHeight: 0.95, margin: "10px 0 10px", letterSpacing: "-0.02em" }}>
          Carriers don&apos;t drop links.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>They tag the signal.</em>
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 560 }}>
          X suppresses posts that lead with links. Every template here leads with
          <strong style={{ color: "var(--gold)" }}> @4040hex</strong> and ends with the URL on the last line.
          Pick one. Fill in the blanks. Post. Earn hex when the city sees it.
        </p>
      </section>

      {/* How it pays */}
      <section
        style={{
          padding: "var(--s-4)",
          borderRadius: 12,
          border: "1px solid var(--line)",
          background: "rgba(255,255,255,0.02)",
          marginBottom: "var(--s-5)",
        }}
      >
        <span className="kicker">⬡ WHY POST</span>
        <ul
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--ink-2)",
            marginTop: 8,
            paddingLeft: 18,
            lineHeight: 1.7,
          }}
        >
          <li>Posting daily resets your <strong style={{ color: "var(--gold)" }}>14-day decay clock</strong> → passive hex keeps flowing</li>
          <li>Tag <strong style={{ color: "var(--gold)" }}>@4040hex</strong> in posts — we see it, we boost it, we credit the carrier</li>
          <li>Drop the URL on the LAST line, never the first — X demotes link-led posts</li>
          <li>Best posts of the week become <strong style={{ color: "var(--gold)" }}>TRANSMISSIONS</strong> on /transmissions (top weekly earns 5,000 ⬡)</li>
        </ul>
      </section>

      {/* Prompt cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "var(--s-3)" }}>
        {REPLY_PROMPTS.map((p) => {
          const cat = CAT_LABEL[p.category];
          return (
            <article
              key={p.id}
              style={{
                padding: "var(--s-4)",
                borderRadius: 12,
                border: `1px solid ${cat.color}33`,
                background: `linear-gradient(180deg, ${cat.color}0a 0%, rgba(0,0,0,0.4) 100%)`,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{
                  padding: "3px 8px",
                  border: `1px solid ${cat.color}66`,
                  borderRadius: 999,
                  fontFamily: "var(--mono2)",
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  color: cat.color,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}>{cat.label}</span>
                <span style={{
                  fontFamily: "var(--display)",
                  fontSize: 13,
                  letterSpacing: "-0.005em",
                  color: cat.color,
                  textTransform: "uppercase",
                }}>{p.hook}</span>
              </div>

              <pre
                style={{
                  fontFamily: "var(--mono2)",
                  fontSize: 12,
                  lineHeight: 1.55,
                  color: "var(--ink)",
                  whiteSpace: "pre-wrap",
                  margin: 0,
                  padding: "12px 14px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  minHeight: 80,
                }}
              >{p.body}</pre>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={tweetIntent(p.body)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, textAlign: "center" }}
                >
                  <span className="ttl">POST TO X →</span>
                </a>
                <CopyToClipboardButton text={p.body} />
              </div>
            </article>
          );
        })}
      </section>

      {/* Rules of the relay */}
      <section
        style={{
          marginTop: "var(--s-6)",
          padding: "var(--s-4)",
          borderRadius: 12,
          border: "1px dashed var(--line-2)",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ RULES OF THE RELAY</span>
        <ul style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-2)", marginTop: 8, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Always tag <strong style={{ color: "var(--gold)" }}>@4040hex</strong> — it&apos;s how we find you and credit you</li>
          <li>Fill in the blanks with YOUR stats, not generic copy</li>
          <li>One post a day max from any single template — fresh angles outperform repetition</li>
          <li>Quote-reply &gt; reply &gt; own-post for engagement (in that order)</li>
          <li>Attach your citizen image or the city&apos;s shareable cards for visual hook</li>
        </ul>
      </section>

      <section style={{ marginTop: "var(--s-6)", textAlign: "center" }}>
        <span className="kicker">⬡ NEXT</span>
        <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: "var(--s-2)" }}>
          <Link className="btn btn-primary" href="/carrier">
            <span className="ttl">CLAIM TODAY&apos;S 10 ⬡ →</span>
          </Link>
          <Link className="btn btn-secondary" href="/transmissions">
            <span className="ttl">TRANSMIT YOUR OWN →</span>
          </Link>
          <Link className="btn btn-secondary" href="/earn">
            <span className="ttl">THE LEDGER →</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

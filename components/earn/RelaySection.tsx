import Link from "next/link";
import { REPLY_PROMPTS, tweetIntent } from "@/lib/share";
import { CopyToClipboardButton } from "@/components/CopyToClipboardButton";
import { ReplySubmit } from "@/components/ReplySubmit";

const CAT_LABEL: Record<string, { label: string; color: string }> = {
  "own-post":  { label: "OWN POST",       color: "var(--gold)" },
  "reply":     { label: "REPLY",          color: "#7AB7FF" },
  "quote":     { label: "QUOTE-REPLY",    color: "#A989C7" },
};

/**
 * Share-to-earn relay. Folded into /earn (#relay) from the former
 * standalone /relay page. Ten ready-to-post X templates + the reply
 * economy claim form (ReplySubmit) + the rules of the relay.
 */
export function RelaySection() {
  return (
    <>
      {/* Sub-hero */}
      <header style={{ marginBottom: "var(--s-4)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ RELAY · POST THE SIGNAL</span>
        <h2 style={{ fontFamily: "var(--display)", fontSize: "clamp(30px, 5vw, 48px)", lineHeight: 0.95, margin: "10px 0 10px", letterSpacing: "-0.02em" }}>
          Carriers don&apos;t drop links.<br />
          <em style={{ color: "var(--gold)", fontStyle: "normal" }}>They tag the signal.</em>
        </h2>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, maxWidth: 560 }}>
          X suppresses posts that lead with links. Every template here leads with
          <strong style={{ color: "var(--gold)" }}> @4040hex</strong> and ends with the URL on the last line.
          Pick one. Fill in the blanks. Post. Earn hex when the city sees it.
        </p>
      </header>

      {/* Reply economy — leads everything else because replies are 270×
          more valuable to the X algo than likes. Carriers paste their
          reply URL, get hex immediately, plus a 24h engagement bonus. */}
      <ReplySubmit />

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
          <li>Best posts of the week become <strong style={{ color: "var(--gold)" }}>TRANSMISSIONS</strong> on /transmissions (authors earn 10% of every boost ⬡)</li>
        </ul>
      </section>

      {/* Prompt cards */}
      <section className="ui-auto-fit-cards" style={{ ["--min-w" as string]: "300px" }}>
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

              <div className="ui-cta-row" style={{ marginTop: "auto" }}>
                <a
                  href={tweetIntent(p.body)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm ui-tap"
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
    </>
  );
}

/**
 * Daily Transmission — folded into /play (2026-05-31) as <section id="daily">.
 * One cryptic transmission per UTC day, rotating the 10 civilizations.
 * Content + logic preserved from the former /daily page (getDailySignal).
 *
 * The host page (/play) sets `export const dynamic = "force-dynamic"` so the
 * day rolls without a redeploy, matching the former page's behavior.
 */
import Link from "next/link";
import { getDailySignal, dayKey } from "@/lib/daily-signal";
import { CIVILIZATIONS } from "@/lib/constants";

export function DailyTransmission() {
  const signal = getDailySignal();
  const civ = CIVILIZATIONS[signal.from];
  const d = dayKey();

  return (
    <section id="daily" style={{ maxWidth: 760, margin: "48px auto 0", scrollMarginTop: 96 }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span className="kicker">⬡ FREELON CITY · DAILY TRANSMISSION · DAY {d}</span>
        <h2
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(28px, 5vw, 52px)",
            lineHeight: 0.96,
            letterSpacing: "-0.02em",
            margin: "12px 0 10px",
          }}
        >
          The city <em>rewards</em> the carriers.
        </h2>
        <p className="lead" style={{ margin: "0 auto", maxWidth: 560 }}>
          Every UTC day, anyone who carries the signal earns +10 ⬡.
          Hold a citizen for a bigger reward. Streaks add more.
        </p>
        <p style={{ margin: "8px auto 0", maxWidth: 560, fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.04em", color: "var(--ink-dim)" }}>
          ⬡ is a reward layer inside the city — not money, not redeemable.
        </p>
      </div>

      <article
        className="verse"
        style={{
          borderLeft: `2px solid ${civ.color}`,
          padding: "28px",
          background: "var(--bg-2)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.28em",
            color: civ.color,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {civ.stamp} · {civ.name} · {civ.doctrine}
        </div>
        <blockquote
          style={{
            fontFamily: "var(--display)",
            fontSize: "clamp(22px, 2.6vw, 30px)",
            lineHeight: 1.25,
            color: "var(--ink)",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          &ldquo;{signal.line}&rdquo;
        </blockquote>
        {signal.cipher ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.24em",
              color: "var(--ink-fade)",
            }}
          >
            CIPHER · {signal.cipher}
          </div>
        ) : null}
        <div
          style={{
            marginTop: 14,
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.24em",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
          }}
        >
          CHANT · {civ.chant}
        </div>
      </article>

      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "var(--gold)",
            textTransform: "uppercase",
          }}
        >
          ⬡ NEXT SIGNAL · 04:04 UTC
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/carrier">
            <span className="ttl">CLAIM YOUR DAILY SIGNAL →</span>
          </Link>
          <Link className="btn btn-secondary" href="/citizens">
            <span className="ttl">OWN A CITIZEN ↗</span>
          </Link>
          <Link className="btn btn-ghost" href="/canon#civilizations">
            <span className="ttl">READ THE LORE</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

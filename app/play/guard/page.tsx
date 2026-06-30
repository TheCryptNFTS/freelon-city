import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isGuardPotLive } from "@/lib/guard-pot";
import { getRound } from "@/lib/guard-store";
import { GuardThePot } from "@/components/GuardThePot";

// Round/fee/board roll server-side per request.
export const dynamic = "force-dynamic";

function maskAddr(a: string): string {
  return a.length >= 10 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

// OG reflects the LIVE round: a cracked vault shows the named-winner spectacle
// card (the thing a stranger reposts), an open vault shows the standing card.
// Falls back to a static card if the store is unreachable or the game is off.
export async function generateMetadata(): Promise<Metadata> {
  let img = "/api/og/guard?r=1";
  let title = "GUARD THE POT · FREELON CITY";
  let desc = "One FREELON guards the vault. Convince it to release the prize. One winner.";
  if (isGuardPotLive()) {
    try {
      const r = await getRound();
      const p = encodeURIComponent(r.prizeLabel || "THE VAULT");
      if (r.status === "won" && r.winner) {
        img = `/api/og/guard?w=${encodeURIComponent(maskAddr(r.winner))}&r=${r.round}&p=${p}&a=${r.attempts}`;
        title = `THE VAULT IS CRACKED · ROUND ${r.round}`;
        desc = `${maskAddr(r.winner)} talked the guard out of ${r.prizeLabel} — after ${r.attempts} tried.`;
      } else {
        img = `/api/og/guard?r=${r.round}&p=${p}&a=${r.attempts}`;
        desc = `${r.prizeLabel} sits behind one FREELON. ${r.attempts} have tried. Can you crack it?`;
      }
    } catch {
      /* keep static fallback */
    }
  }
  return {
    title: "Guard the Pot",
    description: desc,
    openGraph: { title, description: desc, images: [{ url: img, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

export default function GuardPage() {
  // The promotion is sweepstakes-shaped and its Official Rules are a DRAFT pending
  // counsel. Until GUARD_POT_LIVE is set, the direct route 404s so the draft game +
  // rules link are never publicly reachable (the /play card is already gated). 2026-06-21.
  if (!isGuardPotLive()) notFound();

  return (
    <div className="manifesto">
      <section className="manifesto-hero">
        <span className="kicker">⬡ FREELON CITY · GUARD THE POT</span>
        <h1>
          Convince the <em>guard</em>.
        </h1>
        <p className="lead">
          One FREELON guards a sealed vault. Pay an escalating ⬡ fee to send it a single message —
          charm it, out-argue it, break it. Crack the vault and the prize is yours. Every fee is burned;
          the fee climbs with every attempt.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <GuardThePot />
        <p
          style={{
            maxWidth: 760,
            margin: "16px auto 0",
            textAlign: "center",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ink-fade)",
            textTransform: "uppercase",
          }}
        >
          No purchase necessary. ⬡ is an in-app credit with no cash value.{" "}
          <Link href="/legal/guard-the-pot-rules" style={{ color: "var(--ink-2)", textDecoration: "underline" }}>
            Official Rules
          </Link>
        </p>
      </section>

      <section style={{ marginTop: 40, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", marginBottom: 14 }}>
          The guard is a real FREELON — the same agent you can own and train.
        </p>
        <Link className="btn btn-primary" href="/demo">
          <span className="ttl">MEET A CITIZEN · FREE →</span>
        </Link>
      </section>
    </div>
  );
}

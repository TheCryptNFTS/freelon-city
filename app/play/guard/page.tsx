import type { Metadata } from "next";
import Link from "next/link";
import { GuardThePot } from "@/components/GuardThePot";

// Round/fee/board roll server-side per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guard the Pot",
  description:
    "One FREELON guards the vault. Pay an escalating ⬡ fee to send it a message and try to convince it to release the prize. One winner cracks the vault.",
  openGraph: {
    title: "GUARD THE POT · FREELON CITY",
    description: "One FREELON guards the vault. Convince it to release the prize. One winner.",
    images: [{ url: "/api/og/play?t=GUARD%20THE%20POT&k=CRACK%20THE%20VAULT", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GUARD THE POT · FREELON CITY",
    description: "One FREELON guards the vault. Convince it to release the prize. One winner.",
    images: ["/api/og/play?t=GUARD%20THE%20POT&k=CRACK%20THE%20VAULT"],
  },
};

export default function GuardPage() {
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
      </section>

      <section style={{ marginTop: 40, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", marginBottom: 14 }}>
          The guard is a real FREELON — the same agent you can own and train.
        </p>
        <Link className="btn btn-primary" href="/citizens/1">
          <span className="ttl">SEE AN AGENT →</span>
        </Link>
      </section>
    </div>
  );
}

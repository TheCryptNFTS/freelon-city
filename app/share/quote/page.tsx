import type { Metadata } from "next";
import Link from "next/link";

/**
 * /share/quote?q=<reply>&n=<agent>&c=<collection>&color=<hex>
 *
 * The X-share landing for the /demo "wow, it's alive" moment (upgrade audit #115).
 * Its only jobs: (1) emit a summary_large_image card whose image is the themed
 * quote card at /api/og/quote, so a shared demo reply unfurls with a real picture;
 * (2) bounce a human visitor onward to /demo (recruitment funnel). Built by
 * lib/share.ts tweetDemoReply().
 */

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function ogImageUrl(sp: SP): string {
  const qs = new URLSearchParams();
  for (const k of ["q", "n", "c", "color"]) {
    const v = str(sp[k]);
    if (v) qs.set(k, v);
  }
  return `/api/og/quote?${qs.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const n = str(sp.n) || "a citizen";
  const q = str(sp.q);
  const title = `I asked ${n}`;
  const cardTitle = `I asked ${n} of FREELON CITY`;
  const description = q
    ? `“${q.slice(0, 160)}”`
    : "Every citizen of FREELON CITY is an AI character you can talk to. Meet one free.";
  const img = ogImageUrl(sp);
  return {
    title,
    description,
    openGraph: {
      title: cardTitle,
      description,
      images: [{ url: img, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: cardTitle,
      description,
      images: [img],
    },
  };
}

export default async function ShareQuotePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const n = str(sp.n) || "a citizen";
  const q = str(sp.q);
  return (
    <div style={{ maxWidth: 680, margin: "var(--s-6) auto", padding: "0 var(--pad)", textAlign: "center" }}>
      <span className="kicker" style={{ color: "var(--gold)" }}>⬡ FREELON CITY</span>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05, margin: "12px 0 18px" }}>
        I asked {n} — here&apos;s what it said.
      </h1>
      {q && (
        <blockquote
          style={{
            fontFamily: "var(--mono2)", fontSize: 16, lineHeight: 1.6, color: "var(--ink)",
            borderLeft: "2px solid var(--gold)", padding: "10px 0 10px 18px", margin: "0 auto 22px",
            maxWidth: 560, textAlign: "left",
          }}
        >
          “{q}”
        </blockquote>
      )}
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 22 }}>
        Every citizen of FREELON CITY is an AI character you can talk to — free, no wallet.
      </p>
      <Link className="btn btn-primary btn-lg" href="/demo?ref=shq-">
        <span className="ttl">MEET A CITIZEN · FREE →</span>
      </Link>
    </div>
  );
}

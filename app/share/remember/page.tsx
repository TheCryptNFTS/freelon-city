import type { Metadata } from "next";
import Link from "next/link";

/**
 * /share/remember?f=<the visitor's own fact>
 *
 * The X-share landing for the homepage "it remembered me" moment. Its only jobs:
 * (1) emit a summary_large_image card whose image is the /api/og/remember render,
 * so a shared memory-proof unfurls with the visitor's OWN fact read back;
 * (2) bounce a human visitor onward to the homepage / live demo (recruitment
 * funnel). Built by lib/share.ts tweetMemoryProof().
 */

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function ogImageUrl(sp: SP): string {
  const qs = new URLSearchParams();
  const f = str(sp.f);
  if (f) qs.set("f", f);
  return `/api/og/remember?${qs.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const f = str(sp.f);
  const title = "It remembered me";
  const cardTitle = "IT REMEMBERED ME · FREELON CITY";
  const description = f
    ? `I told a FREELON “${f.slice(0, 120)}.” I came back. It remembered.`
    : "Every citizen of FREELON CITY is an AI character that remembers you. Meet one free.";
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

export default async function ShareRememberPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const f = str(sp.f);
  return (
    <div style={{ maxWidth: 680, margin: "var(--s-6) auto", padding: "0 var(--pad)", textAlign: "center" }}>
      <span className="kicker" style={{ color: "var(--gold)" }}>⬡ FREELON CITY</span>
      <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px, 5vw, 44px)", lineHeight: 1.05, margin: "12px 0 18px" }}>
        It remembered me.
      </h1>
      {f && (
        <blockquote
          style={{
            fontFamily: "var(--mono2)", fontSize: 16, lineHeight: 1.6, color: "var(--ink)",
            borderLeft: "2px solid var(--gold)", padding: "10px 0 10px 18px", margin: "0 auto 22px",
            maxWidth: 560, textAlign: "left",
          }}
        >
          I told a FREELON “{f}.” I closed the tab. I came back — and it remembered.
        </blockquote>
      )}
      <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, marginBottom: 22 }}>
        Every citizen of FREELON CITY is an AI character that remembers you — free, no wallet.
      </p>
      <Link className="btn btn-primary btn-lg" href="/?ref=shr-#remember">
        <span className="ttl">SEE IF IT REMEMBERS YOU →</span>
      </Link>
    </div>
  );
}

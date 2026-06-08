import type { Metadata } from "next";
import Link from "next/link";
import { Redirect } from "./Redirect";

/**
 * /share/score?g=sweep&n=12,400&nl=SIGNAL+SWEPT&sub=...&tag=NEW+BEST
 *
 * The X-share landing page for arcade scores. Its only jobs are:
 *   1. emit a summary_large_image card whose image is the themed score card
 *      at /api/og/score (so a shared link unfurls with a real picture);
 *   2. bounce a human visitor onward to the game (recruitment funnel).
 *
 * The arcade game components build links to this route via lib/share.ts.
 */

const GAME_TITLES: Record<string, string> = {
  sweep: "Sweep Run",
  proof: "Proof of Signal",
  cipher: "The Cipher",
  reckoning: "The Reckoning",
  "hex-match": "Hex Match",
};

const VALID_GAMES = new Set(Object.keys(GAME_TITLES));

type SP = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function ogImageUrl(sp: SP): string {
  const keep = ["g", "n", "nl", "sub", "tag"];
  const qs = new URLSearchParams();
  for (const k of keep) {
    const v = str(sp[k]);
    if (v) qs.set(k, v);
  }
  return `/api/og/score?${qs.toString()}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SP>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const g = str(sp.g).toLowerCase();
  const game = VALID_GAMES.has(g) ? GAME_TITLES[g] : "Arcade";
  const n = str(sp.n);
  const nl = str(sp.nl);
  // Document <title>: bare — the root layout template appends "· FREELON CITY".
  const title = n ? `${n} · ${game}` : game;
  // OG/twitter cards aren't run through the title template, so they carry the
  // brand explicitly to stay self-contained when unfurled off-site.
  const cardTitle = n ? `${n} · ${game} · FREELON CITY` : `${game} · FREELON CITY`;
  const description = [nl, str(sp.sub)].filter(Boolean).join(" · ") || "Play the signal.";
  const img = ogImageUrl(sp);
  return {
    title,
    description,
    openGraph: {
      title: cardTitle,
      description,
      images: [{ url: img, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: cardTitle,
      description,
      images: [img],
    },
  };
}

export default async function ShareScorePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const g = str(sp.g).toLowerCase();
  const dest = VALID_GAMES.has(g) ? `/play/${g}` : "/play";
  const game = VALID_GAMES.has(g) ? GAME_TITLES[g] : "the arcade";

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 48,
        textAlign: "center",
      }}
    >
      <Redirect to={dest} />
      <p style={{ letterSpacing: "0.24em", opacity: 0.6, fontSize: 14 }}>⬡ FREELON CITY</p>
      <p style={{ fontSize: 18 }}>Tuning you in to {game}…</p>
      <Link href={dest} style={{ color: "#00D9B8" }}>
        Enter now →
      </Link>
    </main>
  );
}

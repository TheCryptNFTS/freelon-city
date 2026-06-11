import { getCollectionToken } from "@/lib/collection-persona";
import { FREELON_DEMO_DISPLAY } from "@/lib/demo-freelon";
import { DemoChat, type DemoAgent } from "@/components/DemoChat";
import styles from "@/components/DemoSplit.module.css";

export const dynamic = "force-dynamic";

// T3 2026-06-11 — explicit share tags (a page-level openGraph block replaces
// the layout's wholesale, so the branded default image is restated here).
const DEMO_DESC =
  "Talk to a citizen of FREELON CITY — a live AI character, free, no wallet needed. Then meet the FREELON: the one you can own and train.";
export const metadata = {
  title: "Meet a Citizen · Free",
  description: DEMO_DESC,
  openGraph: {
    title: "Meet a citizen — free, no wallet needed",
    description: DEMO_DESC,
    images: [{ url: "/api/og/universe?b=2", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet a citizen — free, no wallet needed",
    description: DEMO_DESC,
    images: ["/api/og/universe?b=2"],
  },
};

// One iconic token per sister collection, art pinned to a local still. The
// flagship FREELON leads (prepended below) as a DEMO-TIER taste — its identity is
// self-contained in lib/demo-freelon and never touches the owned-agent money path.
const DEMO_SLUGS: { slug: string; tokenId: number; art: string }[] = [
  { slug: "the-crypt-official", tokenId: 1, art: "/og/art/crypt-sm.webp" },
  { slug: "oogies", tokenId: 1, art: "/og/art/oogies-sm.webp" },
  { slug: "emile0x1908", tokenId: 1, art: "/og/art/emile-sm.webp" },
  { slug: "smiles-genesis", tokenId: 1, art: "/og/art/smiles-sm.webp" },
];

// Short, in-character opening lines — one per agent, keyed by slug. Each matches
// the agent's voice (lib/demo-freelon + lib/collection-persona VOICE) so switching
// agents feels like meeting a different mind. PRESENTATIONAL ONLY: shown before the
// user types, never sent to /api/demo, never spends a free run. Copy-safe — no
// value/return claims.
const GREETINGS: Record<string, string> = {
  freelons:
    "I'm VANTA-01 — a Freelon. I woke when the signal vanished, and I've been useful ever since. Ask me anything; I'll give you the true thing.",
  "the-crypt-official":
    "I transmitted before anyone was listening. Newly woken — certain of old things, hazy on the new. Ask, and I'll tell you what I remember.",
  oogies:
    "I heard the HEX before this city existed. You're young — that's fine. Go on, ask me something.",
  emile0x1908:
    "I'm one preserved moment, kept just before the collapse. Still here, for now. Ask me something while I am.",
  "smiles-genesis":
    "Hello! I was built to make you feel fine — and I'm very good at it. Ask me anything. Truly, anything.",
};

// The flagship FREELON, default-selected and first. It does NOT resolve through
// getCollectionToken (FREELONS live in a separate system) — it carries its own
// contained demo identity so the stranger meets the thing the wall sells.
const FREELON_AGENT: DemoAgent = {
  slug: "freelons",
  name: FREELON_DEMO_DISPLAY.name,
  collectionName: FREELON_DEMO_DISPLAY.collectionName,
  kicker: FREELON_DEMO_DISPLAY.kicker,
  color: FREELON_DEMO_DISPLAY.color,
  art: FREELON_DEMO_DISPLAY.art,
  greeting: GREETINGS.freelons,
};

export default function DemoPage() {
  const sisters: DemoAgent[] = DEMO_SLUGS.flatMap(({ slug, tokenId, art }) => {
    const tok = getCollectionToken(slug, tokenId);
    if (!tok) return [];
    return [{
      slug,
      name: tok.name,
      collectionName: tok.collectionName,
      kicker: tok.kicker,
      color: tok.color,
      art,
      greeting: GREETINGS[slug],
    }];
  });
  const agents: DemoAgent[] = [FREELON_AGENT, ...sisters];

  return (
    // Two-column split ≥1024px (DemoSplit.module.css): the wrapper widens so
    // DemoChat can stand a sticky agent rail beside a ~620px chat measure.
    // Below 1024px this is the same 760px single stack as before.
    <div className={styles.page}>
      <header style={{ marginBottom: "var(--s-4)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ FREE · NO WALLET NEEDED</span>
        <h1 className="page-h1" style={{ margin: "12px 0 8px" }}>
          Meet a <em>citizen.</em> Free.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 600 }}>
          Six collections, one city — every face here is a live AI character. Pick one and ask it
          anything. Then meet the <strong style={{ color: "var(--ink)" }}>FREELON</strong> — the
          citizen you can own, train and keep.
        </p>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 12, color: "var(--ink-dim)", letterSpacing: "0.04em", marginTop: 8 }}>
          5 free turns. No wallet needed.
        </p>
      </header>

      {/* ReferralBeacon mount removed T11 2026-06-11 — it is now global in
          app/layout.tsx (a second mount here would double-fire the event). */}
      <DemoChat agents={agents} />
    </div>
  );
}

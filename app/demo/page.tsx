import { getCollectionToken } from "@/lib/collection-persona";
import { FREELON_DEMO_DISPLAY } from "@/lib/demo-freelon";
import { DemoChat, type DemoAgent } from "@/components/DemoChat";
import { ReferralBeacon } from "@/components/ReferralBeacon";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Talk to an Agent",
  description:
    "Every citizen of FREELON CITY is an AI character you can chat with. Here are free ones — no wallet needed. Talk to them, then meet the ones you own.",
};

// One iconic token per sister collection, art pinned to a local still. The
// flagship FREELON leads (prepended below) as a DEMO-TIER taste — its identity is
// self-contained in lib/demo-freelon and never touches the owned-agent money path.
const DEMO_SLUGS: { slug: string; tokenId: number; art: string }[] = [
  { slug: "the-crypt-official", tokenId: 1, art: "/og/art/crypt.png" },
  { slug: "oogies", tokenId: 1, art: "/og/art/oogies.png" },
  { slug: "emile0x1908", tokenId: 1, art: "/og/art/emile.png" },
  { slug: "smiles-genesis", tokenId: 1, art: "/og/art/smiles.png" },
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
    <div style={{ maxWidth: 760, margin: "var(--s-6) auto", padding: "0 var(--pad)" }}>
      <header style={{ marginBottom: "var(--s-4)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ FREE · NO WALLET NEEDED</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(30px, 5vw, 48px)", lineHeight: 1.02, margin: "12px 0 8px" }}>
          Meet a <em style={{ color: "var(--gold)", fontStyle: "normal" }}>citizen.</em> Free.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 600 }}>
          Every collection in FREELON CITY is a kind of citizen — Freelons, the Crypt, Oogies, Emile. Each one is a live AI
          character. Pick a citizen, ask it anything — then own a <strong style={{ color: "var(--ink)" }}>FREELON</strong>, the
          one that&apos;s yours to train and keep.
        </p>
      </header>

      <ReferralBeacon />
      <DemoChat agents={agents} />
    </div>
  );
}

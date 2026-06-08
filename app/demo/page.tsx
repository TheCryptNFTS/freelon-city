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
    }];
  });
  const agents: DemoAgent[] = [FREELON_AGENT, ...sisters];

  return (
    <div style={{ maxWidth: 760, margin: "var(--s-6) auto", padding: "0 var(--pad)" }}>
      <header style={{ marginBottom: "var(--s-4)" }}>
        <span className="kicker" style={{ color: "var(--gold)" }}>⬡ FREE · NO WALLET NEEDED</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(30px, 5vw, 48px)", lineHeight: 1.02, margin: "12px 0 8px" }}>
          Meet a <em style={{ color: "var(--gold)", fontStyle: "normal" }}>FREELON.</em> Free.
        </h1>
        <p style={{ fontFamily: "var(--mono2)", fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 600 }}>
          The first is a FREELON — an AI character you <strong style={{ color: "var(--ink)" }}>own and train</strong>, and it
          remembers what you build together. The rest are free citizens from across the city. Pick any, ask it anything —
          then own the one that keeps growing.
        </p>
      </header>

      <ReferralBeacon />
      <DemoChat agents={agents} />
    </div>
  );
}

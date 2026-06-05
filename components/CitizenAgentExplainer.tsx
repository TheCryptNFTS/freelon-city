/**
 * "What can my citizen do?" — plain-English explainer, public, server component.
 * Frames the citizen as an AGENT you own and build up, in words a normal person
 * gets. No jargon. Sits above the owner-only dashboard so everyone understands
 * the pitch even before connecting a wallet.
 */

import { MISSION_DISCLAIMER } from "@/lib/missions/pricing";
import { TryFreeDemo } from "@/components/TryFreeDemo";

// The six practical agent skills (must match lib/missions/abilities/*).
const ABILITIES = [
  { label: "Content", blurb: "writes X posts, threads, captions & content plans in your voice" },
  { label: "Strategy", blurb: "fixes your launch, plans growth & sharpens positioning" },
  { label: "Sales", blurb: "sharpens your pitch, DMs & landing copy" },
  { label: "Research", blurb: "researches markets, summarizes long text, scans competitors" },
  { label: "Design", blurb: "generates visual concepts, image prompts & names" },
  { label: "Red Team", blurb: "finds weak points and red-teams your idea before you ship" },
];

export function CitizenAgentExplainer() {
  return (
    <section className="agent-explainer">
      {/* HOW IT WORKS — the plain "what is this / how do I play" the community kept
          asking for, and the aligned-vs-owned clarity. 4 steps, no jargon. */}
      <div className="agent-howto">
        <span className="kicker">⬡ NEW HERE? HOW IT WORKS</span>
        <ol className="agent-howto-steps">
          <li><strong>Sync your X handle</strong> → the city sorts you into a tribe and shows you that tribe&apos;s face. <em>That citizen is an example — you don&apos;t own it.</em></li>
          <li><strong>Own one</strong> → buy a FREELON on OpenSea. Now it&apos;s yours.</li>
          <li><strong>Unlock it</strong> → a one-time ETH payment activates its AI agent (and drops bonus ⬡ in your wallet).</li>
          <li><strong>Put it to work</strong> → give it jobs (write, strategy, research, images). It levels up, remembers your project, and builds a work history that stays with the NFT.</li>
        </ol>
        <p className="agent-howto-foot"><strong>Aligned ≠ owned.</strong> Syncing shows your tribe&apos;s face; owning means buying the FREELON; unlocking turns its agent on.</p>
      </div>

      <span className="kicker">⬡ SEE IT WORK</span>

      {/* PROOF FIRST — a real example so a visitor witnesses the quality before
          reading anything else. Static illustrative sample (clearly labelled);
          the live version runs on the owner's own citizen in the dashboard. */}
      <div className="agent-demo">
        <span className="agent-demo-label">STRATEGY → “FIX MY LAUNCH”</span>
        <div className="agent-demo-io">
          <p className="agent-demo-you">
            <strong>You:</strong> “$9/mo app that auto-writes 30 days of X posts for indie founders.
            Headline: <em>your AI content co-pilot</em>.”
          </p>
          <div className="agent-demo-agent">
            <strong>The agent:</strong>
            <p><strong>Verdict —</strong> “AI co-pilot” is dead language; you sound like 1,000 other tools. Your real wedge: <em>“Turn one founder brain-dump into 30 days of founder-led X content.”</em></p>
            <p><strong>Weak:</strong> the promise triggers “will it sound like me / is it AI slop?” — handle that objection in the headline.</p>
            <p><strong>5 hooks · 5 ready posts · next 3 actions · brutal red-team notes →</strong></p>
          </div>
        </div>
        <span className="agent-demo-foot">Example output — run it on your own citizen.</span>
      </div>

      {/* THE TASTE — run one real job free, no wallet, before the wall. */}
      <TryFreeDemo />

      {/* THE DO — the single obvious next action, scrolls to the run dashboard. */}
      <a className="btn btn-primary agent-explainer-cta" href="#run">
        <span className="ttl">RUN THIS AGENT →</span>
      </a>

      <p className="agent-explainer-lead">
        It&apos;s a little AI worker that&apos;s yours — it makes things, remembers what you&apos;ve done
        together, and gets better the more you use it. Six things it does:
      </p>
      <ul className="agent-explainer-grid">
        {ABILITIES.map((a) => (
          <li key={a.label}>
            <span className="agent-explainer-name">{a.label}</span>
            <span className="agent-explainer-blurb">{a.blurb}</span>
          </li>
        ))}
      </ul>

      <p className="agent-explainer-foot">
        Every job levels your citizen up and adds to its memory — so the work you put in is stored in the
        agent, not spent.
      </p>
      <p className="agent-explainer-disclaimer">{MISSION_DISCLAIMER}</p>
    </section>
  );
}

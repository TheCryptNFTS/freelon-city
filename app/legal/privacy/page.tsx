import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "Privacy · FREELON CITY" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy" updated="2026-05-21">
      <h2>1. The short version.</h2>
      <p>We do not maintain accounts. We do not collect emails. We do not run analytics that profile you. The little data we do touch is described below.</p>

      <h2>2. What runs on your device.</h2>
      <ul>
        <li><strong>Carrier rank state</strong> — your handle, civilization, rank, streak, and relay count. Stored in your browser&apos;s <code>localStorage</code>. Never leaves your device. Clear your browser to delete it.</li>
        <li><strong>Wallet connection</strong> — if you click Connect, your browser exposes your address to this page. We read it once to check on-chain holding via a public RPC. We do not store it server-side.</li>
        <li><strong>PFP Studio image</strong> — processed entirely in your browser&apos;s canvas. Never uploaded.</li>
      </ul>

      <h2>3. What our server sees.</h2>
      <ul>
        <li><strong>HTTP request logs</strong> — IP address, user agent, path, and timestamp. Retained by our hosting provider (Vercel) for standard durations. Used for security and debugging.</li>
        <li><strong>OpenSea proxy responses</strong> — we relay OpenSea&apos;s public collection stats. We cache results for 5 minutes. We do not log who requested them.</li>
      </ul>

      <h2>4. Third parties we touch.</h2>
      <ul>
        <li><strong>OpenSea</strong> — for floor, holder, and recent sales data.</li>
        <li><strong>Pinata IPFS gateway</strong> — for serving citizen images.</li>
        <li><strong>Public Ethereum RPC</strong> — for verifying wallet holder status.</li>
        <li><strong>Fontshare</strong> — for serving Tanker, Cabinet Grotesk, and Satoshi typefaces.</li>
        <li><strong>Vercel</strong> — for hosting.</li>
      </ul>
      <p>Each third party has its own privacy practices. We do not control them.</p>

      <h2>5. Cookies.</h2>
      <p>We do not set marketing or analytics cookies. Functional cookies (Next.js routing, theme preference) may be set by the framework. There is no cross-site tracking from this site.</p>

      <h2>6. Children.</h2>
      <p>This site is not directed at children under 13. We do not knowingly collect data from children.</p>

      <h2>7. Your rights.</h2>
      <p>Because we do not maintain an account database, there is no account to delete and no profile to export. To remove Carrier state, clear your browser&apos;s site data for freeloncity.com. For all other questions, see the contact at <a href="/legal/dmca">/legal/dmca</a>.</p>

      <h2>8. Changes.</h2>
      <p>If this policy materially changes, the &quot;Updated&quot; date at the top of this page changes too.</p>
    </LegalShell>
  );
}

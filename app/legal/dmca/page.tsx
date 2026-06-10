import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "DMCA + Contact" };

export default function Dmca() {
  return (
    <LegalShell title="DMCA + Contact" updated="2026-05-21">
      <h2>1. Contact.</h2>
      <p>For all matters — DMCA notices, honorary corrections, press, security disclosures, partnership — write to:</p>
      <p style={{ fontFamily: "var(--mono2)", fontSize: 14, color: "var(--gold)" }}>
        contact@freeloncity.com
      </p>
      <p>For project announcements, follow <a href="https://x.com/4040hex" target="_blank" rel="noreferrer">@4040hex on X</a>.</p>

      <h2>2. DMCA notice.</h2>
      <p>To report content on freeloncity.com that you believe infringes a copyright you own or are authorized to enforce, send a written notice to the address above that contains:</p>
      <ol>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the copyrighted work claimed to be infringed.</li>
        <li>The URL of the allegedly infringing material on freeloncity.com.</li>
        <li>Your contact information (address, phone, email).</li>
        <li>A statement that you have a good-faith belief that the use is not authorized.</li>
        <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the owner or authorized to act on behalf of the owner.</li>
      </ol>

      <h2>3. Counter-notice.</h2>
      <p>If you believe your content was removed in error, you may submit a counter-notice with equivalent information.</p>

      <h2>4. Repeat infringer policy.</h2>
      <p>We terminate access for repeat infringers where applicable.</p>

      <h2>5. Limits.</h2>
      <p>We can act on the website surface (freeloncity.com) and our own social channels. We cannot modify the on-chain NFT contract — it is immutable. Where appropriate we will coordinate with secondary marketplaces (OpenSea, etc.) to surface the issue.</p>

      <h2>6. Security disclosures.</h2>
      <p>Found a vulnerability? Email the address above with subject <code>SECURITY</code>. We will respond within 72 hours. Please give us a reasonable window to fix before public disclosure.</p>
    </LegalShell>
  );
}

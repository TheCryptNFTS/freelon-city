import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "Terms of Use" };

export default function Terms() {
  return (
    <LegalShell title="Terms of Use" updated="2026-05-21">
      <h2>1. The contract is the city.</h2>
      <p>FREELON CITY is the on-chain artifact at Ethereum mainnet contract <code>0xa79e73c9828db3fcd7c77be7d9f356fb684b5504</code>. The 4040 citizens are owned by their respective wallets. This website (freeloncity.com) is a viewer, lore archive, and utility surface over the contract — it is not the contract.</p>

      <h2>2. Acceptance.</h2>
      <p>By using this website you accept these Terms. If you do not accept them, do not use the website. Continued use after changes constitutes acceptance of the new version.</p>

      <h2>3. No purchase. No financial advice.</h2>
      <p>Nothing on this site is a solicitation to purchase. Nothing on this site constitutes financial, investment, tax, or legal advice. NFTs are speculative. Prices can and do go to zero. Do not buy what you cannot afford to lose.</p>

      <h2>4. Holder benefits are not contractual.</h2>
      <p>Features described on this site — the PFP Studio gold frame, the Carrier rank, the Daily Signal, naming rights, future utilities — are offered at the discretion of the project. They may change, expand, or be removed. None of them is a promised, contractual, or financialized benefit of owning a citizen.</p>

      <h2>5. PFP Studio.</h2>
      <p>The PFP Studio lets you generate a hex-framed avatar from your own image. By using it, you confirm you have the right to the image you upload. Holder-only frames (gold thick, gold thin) require a verifiable on-chain holding at the time of use. We do not store the uploaded image.</p>

      <h2>6. Carrier rank.</h2>
      <p>The Carrier system is a non-financial status game. Rank is computed from your activity. It is not a token. It has no resale value. It is not transferable. It exists for the cultural experience of FREELON CITY and may be reset or discontinued.</p>

      <h2>7. Daily Signal.</h2>
      <p>The Daily Signal is editorial content. It is not financial signal. It is not a buy or sell indication for any asset.</p>

      <h2>8. Honorary citizens.</h2>
      <p>35 citizens carry the names of real-world individuals as a cultural tribute. The names are used in a documentary, reportorial, and laudatory capacity. See <a href="/legal/honorary-notice">the Honorary Notice</a> for the contact, correction, and removal process.</p>

      <h2>9. Tweet templates.</h2>
      <p>Tweet-intent buttons on this site pre-fill copy you can choose to post. Pressing them does not post — your X client posts only after you confirm. You are responsible for what you post.</p>

      <h2>10. No warranty.</h2>
      <p>The website is provided AS-IS. We do not warrant uninterrupted service, freedom from error, or fitness for any particular purpose. Use at your own risk.</p>

      <h2>11. Limitation of liability.</h2>
      <p>To the maximum extent permitted by law, the project, its operators, and contributors are not liable for any indirect, consequential, exemplary, or punitive damages arising from the use of this website.</p>

      <h2>12. Governing law.</h2>
      <p>These Terms are governed by the laws of England and Wales without regard to conflict-of-law principles. Disputes are subject to the exclusive jurisdiction of the English courts.</p>

      <h2>13. Contact.</h2>
      <p>See <a href="/legal/dmca">/legal/dmca</a> for contact and reporting.</p>
    </LegalShell>
  );
}

import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "Honorary Notice · FREELON CITY" };

export default function HonoraryNotice() {
  return (
    <LegalShell title="Honorary Notice" updated="2026-05-21">
      <h2>1. What this is.</h2>
      <p>35 citizens of FREELON CITY (and 4 one-of-ones) are named after real-world individuals who shaped crypto culture. The naming is a cultural tribute. Each honorary is given a hand-written biographical fragment in the project&apos;s mythology — not a literal biography of the named person.</p>

      <h2>2. What it isn&apos;t.</h2>
      <ul>
        <li>It is not an endorsement of the named individual.</li>
        <li>It is not a claim that the named individual is involved in or approves of the project.</li>
        <li>It is not a financial relationship.</li>
        <li>It is not a likeness — the cultural-tribute fragment is intentionally non-pictorial.</li>
      </ul>

      <h2>3. Pre-filled tweet templates.</h2>
      <p>Each honorary page includes a pre-filled tweet that tags the honoree. Pressing the button does not send anything — it opens X with the draft. A user must independently choose to post.</p>

      <h2>4. If you are an honoree.</h2>
      <p>First, thank you for the work that earned the tribute. If you would like:</p>
      <ul>
        <li><strong>Correction</strong> — your handle, name, or biographical fragment updated — contact us via the channel at <a href="/legal/dmca">/legal/dmca</a> and state what should change.</li>
        <li><strong>Removal</strong> — your name removed from the honorary tier — same channel. We will replace the honoree name with a placeholder and remove the public tribute page within 14 days. The underlying NFT citizen continues to exist on-chain (we cannot change immutable metadata), but the website surface will no longer reference you.</li>
        <li><strong>Formal involvement</strong> — to actively endorse or join — same channel. We will document and announce.</li>
      </ul>

      <h2>5. Response timeline.</h2>
      <p>Reasonable removal and correction requests are honored within 14 days. Urgent issues (impersonation harm, ongoing harassment) are honored on best-effort within 72 hours.</p>

      <h2>6. Provenance.</h2>
      <p>The honoree list and per-citizen attribution are stored in <code>data/citizens.json</code> in the project repository. Changes are version-controlled and timestamped.</p>
    </LegalShell>
  );
}

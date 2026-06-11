import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "Honorary Notice" };

export default function HonoraryNotice() {
  return (
    <LegalShell title="Honorary Notice" updated="2026-06-11">
      <h2>1. What this is.</h2>
      <p>35 citizens of FREELON CITY are named after real-world individuals who shaped crypto culture. The naming is a cultural tribute — homage, not affiliation. Each honorary is given a hand-written biographical fragment in the project&apos;s mythology — not a literal biography of the named person. (The four one-of-one citizens carry invented lore names — ORIGIN SIGNAL, PATIENT ZERO, GENESIS HEX, THE FINAL SIGNAL — and are not named after real people.)</p>

      <h2>2. What it isn&apos;t.</h2>
      <ul>
        <li>It is not an endorsement of the named individual.</li>
        <li>It is not a claim that the named individual is involved in or approves of the project.</li>
        <li>It is not a financial relationship.</li>
        <li>It is not a likeness — the cultural-tribute fragment is intentionally non-pictorial.</li>
      </ul>

      <h2>3. The AI character is not the person.</h2>
      <p>Each citizen — including honoraries — can be operated as an AI character by its holder. For honorary citizens, the AI speaks as a fictional tribute character, not as the named person. It is instructed that it is not the named individual, that it must never claim to be them or speak for them, and that it must say so plainly if asked. Nothing an honorary citizen&apos;s AI says is written, reviewed, or endorsed by the person the citizen is named after.</p>

      <h2>4. Pre-filled tweet templates.</h2>
      <p>Each honorary page includes a pre-filled tweet that tags the honoree and is worded as homage (&quot;named in tribute to&quot; — not affiliation). Pressing the button does not send anything — it opens X with the draft. A user must independently choose to post.</p>

      <h2>5. If you are an honoree.</h2>
      <p>First, thank you for the work that earned the tribute. If you would like:</p>
      <ul>
        <li><strong>Correction</strong> — your handle, name, or biographical fragment updated — contact us via the channel at <a href="/legal/dmca">/legal/dmca</a> and state what should change.</li>
        <li><strong>Removal</strong> — your name removed from the honorary tier — same channel. We will replace the honoree name with a placeholder and remove the public tribute page within 14 days. The underlying NFT citizen continues to exist on-chain. The original metadata file is pinned to decentralized storage, but the collection&apos;s metadata pointer is not frozen: on request we can serve redacted metadata at the display layer, so marketplaces and wallets that honor a metadata refresh stop showing your name. We treat that redaction as part of the removal remedy; third-party caches and copies are outside our control.</li>
        <li><strong>Formal involvement</strong> — to actively endorse or join — same channel. We will document and announce.</li>
      </ul>

      <h2>6. Response timeline.</h2>
      <p>Reasonable removal and correction requests are honored within 14 days. Urgent issues (impersonation harm, ongoing harassment) are honored on best-effort within 72 hours.</p>

      <h2>7. Provenance.</h2>
      <p>The honoree list and per-citizen attribution are stored in <code>data/citizens.json</code> in the project repository. Changes are version-controlled and timestamped.</p>
    </LegalShell>
  );
}

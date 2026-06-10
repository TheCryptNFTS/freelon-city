import type { Metadata } from "next";
import { LegalShell } from "../LegalShell";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <LegalShell title="Privacy" updated="2026-06-09">
      <h2>1. The short version.</h2>
      <p>We keep data collection minimal. You don&apos;t need an account to browse, and our analytics are cookieless and anonymous. The one place we collect personal information is if you choose to reserve a FREELON (&quot;Claim this FREELON&quot;) — there you give us an email and, optionally, a wallet address, plus the referral code of the link you arrived through, described in section 3a below. Aside from that reservation data, we don&apos;t build profiles of you, and general browsing stays anonymous.</p>

      <h2>2. What runs on your device.</h2>
      <ul>
        <li><strong>Carrier rank state</strong> — your handle, civilization, rank, streak, and relay count. Stored in your browser&apos;s <code>localStorage</code>. Never leaves your device. Clear your browser to delete it.</li>
        <li><strong>Wallet connection</strong> — if you click Connect, your browser exposes your address to this page. We read it once to check on-chain holding via a public RPC, and we do not store it server-side — except where you deliberately submit a wallet address as part of a FREELON reservation (see section 3a).</li>
        <li><strong>PFP Studio image</strong> — processed entirely in your browser&apos;s canvas. Never uploaded.</li>
      </ul>

      <h2>3. What our server sees.</h2>
      <ul>
        <li><strong>HTTP request logs</strong> — IP address, user agent, path, and timestamp. Retained by our hosting provider (Vercel) for standard durations. Used for security and debugging.</li>
        <li><strong>OpenSea proxy responses</strong> — we relay OpenSea&apos;s public collection stats. We cache results for 5 minutes. We do not log who requested them.</li>
        <li><strong>Citizen progress</strong> — when a FREELON is given jobs, the resulting progress (its level, reputation, skills, and a short capped log of past jobs) is stored on our server keyed to the <em>token ID of the NFT</em> — not to you, your wallet, or an account. It belongs to the token and travels with it: whoever holds that FREELON sees the same record. This progress is keyed to the token, not to an account or your identity — though reservation or referral data you separately provide (section 3a) can be linked to you.</li>
        <li><strong>City activity counters</strong> — anonymous gameplay state (daily claims, streaks, signal balances) used to run the city, not to profile you.</li>
      </ul>

      <h2>3a. FREELON reservations.</h2>
      <p>If you submit the &quot;Claim this FREELON&quot; form, we store: your email address, an optional wallet address if you provide one, the FREELON token ID you&apos;re reserving, a referral code from the link you arrived through (the <code>?ref=</code> value in the URL), and a timestamp. We use this only to notify you about that FREELON, to contact you about your reservation, and to measure which referral links drive interest. Our legal basis is your consent, given when you submit the form. We keep reservation records until the reservation is resolved or you ask us to delete them. A reservation is <strong>non-binding</strong>: it is not a purchase, deposit, or token lockup, and it grants no ownership or financial right. We will <strong>never</strong> ask you for a seed phrase or private key.</p>

      <h2>4. Third parties we touch.</h2>
      <ul>
        <li><strong>OpenSea</strong> — for floor, holder, and recent sales data.</li>
        <li><strong>Pinata IPFS gateway</strong> — for serving citizen images.</li>
        <li><strong>Public Ethereum RPC</strong> — for verifying wallet holder status.</li>
        <li><strong>Fontshare</strong> — for serving Tanker, Cabinet Grotesk, and Satoshi typefaces.</li>
        <li><strong>Vercel</strong> — for hosting.</li>
        <li><strong>Vercel Web Analytics</strong> — privacy-friendly, cookieless analytics. No personal data, no cross-site tracking, no profiles.</li>
        <li><strong>Upstash</strong> — managed Redis database where FREELON reservation records are stored.</li>
        <li><strong>Email service provider</strong> — if and when we send reservation or notification emails, a third-party email provider delivers them.</li>
      </ul>
      <p>Each third party has its own privacy practices. We do not control them.</p>

      <h2>5. Cookies.</h2>
      <p>We do not set marketing or analytics cookies. Functional cookies (Next.js routing, theme preference) may be set by the framework. There is no cross-site tracking from this site.</p>

      <h2>6. Children.</h2>
      <p>This site is not directed at children, and the FREELON reservation feature is only for people aged 13 or older. We do not knowingly collect data from children under 13. If you believe a child has submitted data, contact us and we will delete it.</p>

      <h2>7. Your rights.</h2>
      <p>Carrier state lives in your browser — clear your site data for freeloncity.com to remove it. For any personal data we hold from a FREELON reservation (email, wallet, referral code, token ID), you may request access to it or its deletion using the contact at <a href="/legal/dmca">/legal/dmca</a>; we honor verified requests. If we send you reservation emails, every one includes an unsubscribe link.</p>

      <h2>8. Changes.</h2>
      <p>If this policy materially changes, the &quot;Updated&quot; date at the top of this page changes too.</p>
    </LegalShell>
  );
}

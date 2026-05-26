import type { Metadata } from "next";
import { cookies } from "next/headers";
import { InlineSync } from "@/components/InlineSync";
import { normalizeHandle } from "@/lib/sync";
import { WalletScanner } from "./WalletScanner";

export const dynamic = "force-dynamic";

// Phase 1 metadata 2026-05-26 — route-specific text, reuses
// /og/home.jpg.
const PAGE_DESC =
  "Sync your wallet to enter FREELON CITY and reveal the signal record connected to what you carry.";
export const metadata: Metadata = {
  title: "Enter the City",
  description: PAGE_DESC,
  openGraph: {
    title: "Enter the City",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Enter the City",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

export default async function SyncPage({
  searchParams,
}: {
  searchParams: Promise<{ r?: string }>;
}) {
  const sp = await searchParams;
  if (sp.r) {
    const ref = normalizeHandle(sp.r);
    if (ref) {
      try {
        const c = await cookies();
        c.set("freelon_ref", ref, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30,
        });
      } catch {
        // best-effort
      }
    }
  }

  return (
    <div
      className="sync-empty"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(10,12,18,0.5) 0%, rgba(10,12,18,0.92) 60%, var(--bg) 100%), url(/atmos/sync.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <section className="sync-hero">
        <span className="kicker">⬡ SIGNAL SCANNER</span>
        <h1>The city <em>detects</em> you</h1>
        <p>
          Paste a wallet, ENS, or X handle. The signal reads your alignment and returns it.
        </p>
      </section>

      <WalletScanner />

      <section
        className="sync-fallback"
        style={{
          maxWidth: 720,
          margin: "var(--s-7) auto 0",
          padding: "var(--s-5) var(--pad) var(--s-6)",
          borderTop: "1px solid var(--line)",
          textAlign: "center",
        }}
      >
        <span
          className="kicker"
          style={{ display: "block", marginBottom: "var(--s-3)" }}
        >
          ⬡ OR SYNC BY HANDLE
        </span>
        <p
          style={{
            color: "var(--ink-2)",
            margin: "0 0 var(--s-3)",
            fontSize: 14,
          }}
        >
          Not a citizen yet. Drop your handle — the city assigns your civ deterministically.
        </p>
        <div className="big-input">
          <InlineSync />
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

/**
 * /passport — index page for the bare passport URL.
 *
 * The real passport viewer is /passport/[address]. Hitting /passport
 * with no address used to 404 (BUG-05 in the bug-hunt audit). This
 * landing explains the route and routes the visitor onward via the
 * canonical /sync entry point, where their address gets resolved.
 *
 * Visual treatment matches the .home-page archival system — no new
 * tokens, no new components, no new copy patterns.
 */

const PAGE_DESC =
  "Each wallet carries a passport. Sync your record to reveal the citizens, signals, and artefacts the city recognises in your address.";

export const metadata: Metadata = {
  title: "Passport",
  description: PAGE_DESC,
  openGraph: {
    title: "Passport",
    description: PAGE_DESC,
    images: [{ url: "/og/home.jpg", width: 1536, height: 1024 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Passport",
    description: PAGE_DESC,
    images: ["/og/home.jpg"],
  },
};

export default function PassportIndex() {
  return (
    <div
      className="home-page"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--s-7) var(--s-4)",
        textAlign: "center",
      }}
    >
      <section className="home-page__recognition">
        <span className="home-page__recognitionKicker">⬡ PASSPORT</span>
        <h1 className="home-page__recognitionHeading">
          Every wallet<br />
          <em>carries a passport.</em>
        </h1>
        <p className="home-page__recognitionBody">
          The city issues no passport on its own. It reads the one your
          wallet already carries — the citizens, signals, and artefacts
          recorded in your address.
          <strong>Sync to reveal yours.</strong>
        </p>
        <Link href="/sync" className="home-page__recognitionLink">
          ⬡ ENTER THE CITY →
        </Link>
      </section>
    </div>
  );
}

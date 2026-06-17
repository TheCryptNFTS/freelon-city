import { permanentRedirect } from "next/navigation";

/**
 * /start is merged into /help (2026-06-17, Algorithm review).
 *
 * /start was built for one Discord quote ("holders overwhelmed") — but that's the
 * wrong problem: an overwhelmed holder needs /help, never a longer sales read. Its
 * own header records that the substantive content (wallet setup, troubleshooting,
 * routines, lingo, FAQ) already MOVED verbatim to /help in the 2026-06-11 split; the
 * 2-minute-guide residue just restated the homepage hero. Two doors to the same pitch
 * is one too many — this permanently redirects so old links resolve, mirroring the
 * /archive → /collections fold.
 */
export default function StartRedirect() {
  permanentRedirect("/help");
}

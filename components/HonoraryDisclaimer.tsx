import Link from "next/link";

/**
 * HONORARY DISCLAIMER CHIP (legal risk-cut 2026-06-11). Small inline chip —
 * deliberately not a banner — rendered on every surface that shows an
 * honoree's real name: /tribute, /tribute/[handle], honorary /citizens/[id],
 * /channel/[handle], and the /agent/[id] workspace. Pass `name` for the
 * per-person copy; omit it on index surfaces that list many honorees.
 * Works in both server and client components.
 */
export function HonoraryDisclaimer({ name }: { name?: string }) {
  return (
    <span className="honorary-disclaimer-chip">
      Named as homage. Not affiliated with or endorsed by {name || "the individuals named"}.{" "}
      <Link href="/legal/honorary-notice">Honorary Notice →</Link>
    </span>
  );
}

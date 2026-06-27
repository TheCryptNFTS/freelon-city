import { redirect } from "next/navigation";

/**
 * /remember is retired (2026-06-26).
 *
 * The weekend "AI that can't lie" memory demo overpromised, and its real asset —
 * the LivingPortrait — now lives where it belongs: as the awakening, cursor-
 * watching hero on every citizen page (and the share card + /embed widget). The
 * route redirects to the genesis citizen, ORIGIN SIGNAL #0001, which carries the
 * tuned living eye. The old demo (components/remember/*) is kept for reference
 * but no longer routed.
 */
export default function RememberPage() {
  redirect("/citizens/1");
}

import { permanentRedirect } from "next/navigation";

/**
 * /archive is merged into /collections (2026-06-08). The two were near-duplicate
 * grids of the same six collections; /collections is now THE universe surface —
 * agent-forward, with the archive's lore (provenance + ownership terminal +
 * graveyard) folded in. This route permanently redirects so old links resolve.
 */
export default function ArchiveRedirect() {
  permanentRedirect("/collections");
}

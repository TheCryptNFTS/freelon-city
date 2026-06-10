/**
 * Reveal-form registry — which VERSIONS of a citizen's art exist, per token.
 *
 * The 4040 collection has been revealed multiple times. ~47% of tokens
 * (#1–1616 + 326 of #1617–2020, minus the skip tiers) have a GEOMETRIC regen
 * in addition to the FIGURATIVE form the site serves everywhere. Holders of
 * those tokens pick which version a render uses as its reference art
 * (Discord ask, 2026-06-10) — identity means the form THEY identify with.
 *
 * Source of truth for availability: the shipped evolution viewer's per-wave
 * GEO lists (phase3/scripts/viewer_clean/index.html), extracted verbatim to
 * lib/geo-waves.json as { tokenId: waveNumber }. Wave image CIDs come from
 * the same viewer file — it is the live on-chain animation_url, so it wins
 * over any older notes. All wave files are zero-padded `0011.jpg`.
 *
 * FREELONS-only: sister collections (OOGIES / Emile / …) have a single image
 * and never reach this module. The pre-character forms (hex-card, 404-report
 * document) are deliberately NOT offered — they aren't citizen portraits and
 * produce nonsense as scene references.
 */

import geoWavesRaw from "@/lib/geo-waves.json";
import { imageUrl, IPFS_GATEWAY } from "@/lib/constants";

const geoWaves = geoWavesRaw as Record<string, number>;

const WAVE_CIDS: Record<number, string> = {
  1: "bafybeiat5ep3t7ywbr2znascn3crejnowk4xnsgo52hcbnnvke7zmae6ri",
  2: "bafybeiajwlzyov66hl3gxpsmzum3m755rkhpwc6inx3pkhf33g2uojqr5q",
  3: "bafybeidioh3ytamihtvjuo6moda6fh7652dtdx3cdi25n3ieouj52fs4r4",
  4: "bafybeidv4zwvzhjesavwnygzuo2rowgzg5tecnlp5wykczl4y6ffuydgmi",
  5: "bafybeia6uyzlpgqc3r44twhflvthemlq6dvbo5gkpmsovmvdzoodx273pm",
};

export type RevealForm = {
  key: "figurative" | "geometric";
  label: string;
  /** Direct IPFS-gateway URL of this form's art (also the render reference). */
  refUrl: string;
};

/** The art versions that EXIST for this token, figurative first (site canon). */
export function formsForCitizen(tokenId: number): RevealForm[] {
  const forms: RevealForm[] = [
    { key: "figurative", label: "Figurative", refUrl: imageUrl(tokenId) },
  ];
  const wave = geoWaves[String(tokenId)];
  const cid = wave ? WAVE_CIDS[wave] : undefined;
  if (cid) {
    forms.push({
      key: "geometric",
      label: "Geometric",
      refUrl: `${IPFS_GATEWAY}/${cid}/${tokenId.toString().padStart(4, "0")}.jpg`,
    });
  }
  return forms;
}

export function isValidFormKey(tokenId: number, key: string): boolean {
  return formsForCitizen(tokenId).some((f) => f.key === key);
}

/** Reference-art URL for a render. Unknown/unavailable keys fall back to the
 *  figurative form (current site canon) — never throws. */
export function formRefUrl(tokenId: number, key?: string): string {
  const forms = formsForCitizen(tokenId);
  return (key && forms.find((f) => f.key === key)?.refUrl) || forms[0].refUrl;
}

/**
 * Hand-tuned hex-eye coordinates for the LivingPortrait gaze layer.
 *
 * The bright hex "eye" in the art sits at a different spot in every piece, so a
 * tracking eye can only be drawn for tokens whose eye location we have actually
 * measured. Everything else gets the art-agnostic life layer (breath, awaken,
 * death) with NO eye — better an honest breathing portrait than an eye glowing
 * on a citizen's chin.
 *
 * Coordinates are a percentage of the framed (square, object-fit: cover,
 * object-position 50% 18%) portrait. Add a token here only after eyeballing it.
 */
export type EyePosition = {
  x: number;
  y: number;
  /** Override the default cool-blue gem if a citizen's eye reads a different hue. */
  color?: string;
  core?: string;
};

const EYE_POSITIONS: Record<number, EyePosition> = {
  // #0001 — ORIGIN SIGNAL (genesis 1/1). The reference tuning.
  1: { x: 50.3, y: 28 },
};

export function eyeFor(tokenId: number): EyePosition | null {
  return EYE_POSITIONS[tokenId] ?? null;
}

export function hasEye(tokenId: number): boolean {
  return tokenId in EYE_POSITIONS;
}

/**
 * <GhostedMask tokenId={n}>{children}</GhostedMask> — PASSTHROUGH (no-op).
 *
 * The punitive "ghosting" mechanic — defacing a holder's citizen art as
 * SIGNAL LOST across the site for listing their own NFT below an arbitrary
 * floor — was removed 2026-06-19 (dump-deterrent rip-out). This wrapper is
 * kept only so existing call sites don't need editing: it renders its children
 * unchanged and makes NO network calls. Safe to inline-replace with the child
 * directly and delete this file in a follow-up.
 */
import type { ReactNode } from "react";

export function GhostedMask({
  children,
}: {
  tokenId: number;
  children: ReactNode;
  force?: boolean;
  variant?: "card" | "hero" | "inline";
}) {
  return <>{children}</>;
}

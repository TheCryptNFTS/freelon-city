/**
 * Client-side `freelon_addr` cookie helpers.
 *
 * `freelon_addr` is the non-HttpOnly viewer-address hint every personal
 * module reads (header pill, MyRank, Watchlist, civ standings). It is NOT
 * auth — auth is the HMAC x-session cookie.
 *
 * 2026-05-30 — the site serves on both freeloncity.com (apex) and
 * www.freeloncity.com. This cookie was host-only (no Domain), so an address
 * stamped on one host wasn't sent on the other — the same split that broke
 * the X session. Scope it to the registrable domain so it spans apex + www.
 * Off-prod (localhost, *.vercel.app) we return no Domain so those keep
 * working with plain host-only cookies. Mirrors lib/x-session.authCookieDomain.
 */

const COOKIE = "freelon_addr";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/** Broadcast a viewer-address change so reactive hooks (useHolder) pick up a
 *  connect/disconnect WITHOUT a page reload. Every connect path already routes
 *  through stamp/clear below, so this is the single source of truth. */
export const VIEWER_ADDR_EVENT = "freelon:addr";
function broadcastAddr(addr: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VIEWER_ADDR_EVENT, { detail: addr }));
}

/** Registrable domain to scope to, or "" off-prod (host-only). */
function cookieDomain(): string {
  if (typeof document === "undefined") return "";
  const host = window.location.hostname.toLowerCase();
  if (host === "freeloncity.com" || host.endsWith(".freeloncity.com")) {
    return "; domain=.freeloncity.com";
  }
  return "";
}

/** Stamp the viewer address so client modules across apex + www recognise it. */
export function stampViewerAddr(addr: string): void {
  if (typeof document === "undefined") return;
  const v = addr.toLowerCase();
  document.cookie = `${COOKIE}=${encodeURIComponent(v)}; path=/; max-age=${MAX_AGE}; samesite=lax${cookieDomain()}`;
  broadcastAddr(v);
}

/**
 * Clear the viewer address. Must use the SAME domain attribute it was set
 * with — a host-only delete won't clear a Domain-scoped cookie. We expire
 * both the domain-scoped and host-only forms so a stale host-only cookie
 * from before this change is also cleared.
 */
export function clearViewerAddr(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax${cookieDomain()}`;
  document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
  broadcastAddr(null);
}

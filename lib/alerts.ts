/**
 * 404 Alerts feed — deterministic, derived from live endpoints.
 *
 * Pure derivation: no Upstash writes. Computes 3-6 alerts each call
 * by fetching the same endpoints the rest of the app uses and turning
 * the current snapshot into "the city noticed" headline lines.
 */

export type Alert = {
  id: string;
  ts: number;
  severity: "info" | "warn" | "crit";
  text: string;
  href?: string;
};

const ROTATING_LINES: { text: string; href?: string; severity: Alert["severity"] }[] = [
  { text: "404 ALERT: The fifth bracket opens at 04:04 UTC", href: "/the-fifth-bracket", severity: "info" },
  { text: "404 ALERT: The signal does not sleep", severity: "info" },
  { text: "404 ALERT: A new citizen will be 404th of the day at 00:00", href: "/daily", severity: "info" },
  { text: "404 ALERT: Gold Sovereignty holders are now outnumbered 7:1", href: "/civilizations", severity: "info" },
  { text: "404 ALERT: The void watches — Doctrine 10 is silent again", href: "/lore", severity: "info" },
  { text: "404 ALERT: A wallet has entered the top 40", href: "/leaderboard", severity: "info" },
];

type StatsResp = { floor: number | null; holders: number | null; volume: number | null };
type RecentResp = { events: Array<{ tokenId: number | null; priceEth: string | null; ts: number | null }> };
type HoldersResp = { totalHolders: number };
type HexResp = { index: number; floor: number; change24h: number | null; change7d: number | null };

function baseUrl(): string {
  // Server-side fetch needs an absolute URL in Next route handlers when called
  // from a route. Vercel provides VERCEL_URL; locally fall back to localhost.
  const env = process.env.VERCEL_URL;
  if (env) return env.startsWith("http") ? env : `https://${env}`;
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}

async function safeJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${baseUrl()}${path}`, { next: { revalidate: 60 } });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

function fmtPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const now = Date.now();

  const [stats, recent, holders, hex] = await Promise.all([
    safeJson<StatsResp>("/api/opensea/stats"),
    safeJson<RecentResp>("/api/opensea/recent"),
    safeJson<HoldersResp>("/api/opensea/holders"),
    safeJson<HexResp>("/api/hex-index"),
  ]);

  const out: Alert[] = [];

  // Holders milestone
  const holderCount = holders?.totalHolders ?? stats?.holders ?? 0;
  if (holderCount > 750) {
    out.push({
      id: `holders-${holderCount}`,
      ts: now,
      severity: "info",
      text: `404 ALERT: ${holderCount} carriers have entered the city`,
      href: "/leaderboard",
    });
  } else if (holderCount > 0) {
    out.push({
      id: `holders-${holderCount}`,
      ts: now,
      severity: "info",
      text: `404 ALERT: ${holderCount} carriers on chain — the city is taking shape`,
      href: "/leaderboard",
    });
  }

  // Recent sale spike
  const lastSale = recent?.events?.[0];
  if (lastSale && lastSale.tokenId !== null && lastSale.priceEth) {
    const priceNum = Number(lastSale.priceEth);
    if (priceNum > 0.005) {
      out.push({
        id: `sale-${lastSale.tokenId}-${lastSale.ts ?? 0}`,
        ts: (lastSale.ts ?? Math.floor(now / 1000)) * 1000,
        severity: "warn",
        text: `404 ALERT: Citizen #${String(lastSale.tokenId).padStart(4, "0")} crossed at ${priceNum.toFixed(4)} ETH — pressure rising`,
        href: `/citizens/${lastSale.tokenId}`,
      });
    } else if (priceNum > 0) {
      out.push({
        id: `sale-${lastSale.tokenId}-${lastSale.ts ?? 0}`,
        ts: (lastSale.ts ?? Math.floor(now / 1000)) * 1000,
        severity: "info",
        text: `404 ALERT: Citizen #${String(lastSale.tokenId).padStart(4, "0")} changed hands at ${priceNum.toFixed(4)} ETH`,
        href: `/citizens/${lastSale.tokenId}`,
      });
    }
  }

  // Hex Index movement
  if (hex && hex.change24h !== null) {
    if (hex.change24h > 5) {
      out.push({
        id: `hex-up-${Math.round(hex.index)}`,
        ts: now,
        severity: "warn",
        text: `404 ALERT: HEX INDEX climbed ${fmtPct(hex.change24h)} in 24h`,
        href: "/earn#hex-index",
      });
    } else if (hex.change24h < -5) {
      out.push({
        id: `hex-down-${Math.round(hex.index)}`,
        ts: now,
        severity: "crit",
        text: `404 ALERT: HEX INDEX fell ${fmtPct(hex.change24h)}`,
        href: "/earn#hex-index",
      });
    } else if (Math.abs(hex.change24h) > 0.5) {
      out.push({
        id: `hex-drift-${Math.round(hex.index)}`,
        ts: now,
        severity: "info",
        text: `404 ALERT: HEX INDEX drifted ${fmtPct(hex.change24h)} in 24h — ${Math.round(hex.index)} now`,
        href: "/earn#hex-index",
      });
    }
  }

  // Floor signal
  if (stats?.floor && stats.floor > 0) {
    out.push({
      id: `floor-${stats.floor.toFixed(4)}`,
      ts: now,
      severity: "info",
      text: `404 ALERT: Floor sits at ${stats.floor.toFixed(4)} ETH — the city noticed`,
      href: "https://opensea.io/collection/freelons",
    });
  }

  // Rotating brand line
  const rotIdx = Math.floor(now / 60000) % ROTATING_LINES.length;
  const rot = ROTATING_LINES[rotIdx];
  out.push({
    id: `brand-${rotIdx}`,
    ts: now,
    severity: rot.severity,
    text: rot.text,
    href: rot.href,
  });

  // Trim to 6 max, but ensure at least the rotating one is present.
  return out.slice(0, 6);
}

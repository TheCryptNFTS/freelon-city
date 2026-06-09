/**
 * GET /api/img?url=<encoded image url>
 *
 * Owned, same-origin image proxy for the Citizen Transmission card. Sister
 * collections (The Crypt, OOGIES, Smiles, Crypt TCG) store their art on the
 * OpenSea CDN (*.seadn.io), which serves NO `access-control-allow-origin`
 * header — so loading those images cross-origin taints the <canvas> and blocks
 * PNG export. Serving them through this route makes them same-origin, so the
 * card can export cleanly without depending on a third-party proxy.
 *
 * SECURITY — this is NOT an open proxy. It only fetches https URLs whose host
 * is on a strict allowlist (the seadn CDN). Anything else returns 400. This
 * prevents the route from being abused as an SSRF pivot or open relay.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0;

// Only these hosts may be proxied. Keep tight.
function hostAllowed(h: string): boolean {
  h = h.toLowerCase();
  return h === "seadn.io" || h.endsWith(".seadn.io");
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "missing url" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "bad url" }, { status: 400 });
  }
  if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 400 });
  }

  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 12_000);
    const res = await fetch(target.toString(), {
      signal: c.signal,
      headers: { Accept: "image/avif,image/webp,image/png,image/*" },
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      return NextResponse.json({ error: "upstream_" + res.status }, { status: 502 });
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      return NextResponse.json({ error: "not_an_image" }, { status: 415 });
    }
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": ct,
        // Same-origin to the page, but harmless to be explicit for canvas use.
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}

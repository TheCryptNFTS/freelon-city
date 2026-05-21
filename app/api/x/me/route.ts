import { NextResponse } from "next/server";
import { getXVerification, getByHandle } from "@/lib/x-store";

export const dynamic = "force-dynamic";

/**
 * GET /api/x/me?bind=<wallet|handle>
 * Returns the X verification record for a given bind key, or null.
 *
 * GET /api/x/me?handle=<xHandle>
 * Returns the verification record by X handle (for tribute pages to show a
 * "verified by holder" badge).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const bind = url.searchParams.get("bind");
  const handle = url.searchParams.get("handle");
  if (!bind && !handle) {
    return NextResponse.json({ error: "missing_param" }, { status: 400 });
  }
  const v = bind ? await getXVerification(bind) : await getByHandle(handle!);
  return NextResponse.json({ verification: v });
}

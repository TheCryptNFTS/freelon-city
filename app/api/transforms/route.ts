import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { listRecentTransforms } from "@/lib/transforms-feed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, read-only: the wall of recently generated image transforms.
export async function GET(req: Request) {
  const rl = await limit(req, "transforms:list", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const transforms = await listRecentTransforms(24);
  return NextResponse.json({ transforms });
}

import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getTransmission, toPublic } from "@/lib/transmissions-store";

// Signals/boosts mutate the transmission in real time. A 30s revalidate
// meant the detail page lagged behind boosts by up to 30s and felt
// broken (boost → score didn't change). Force dynamic + no-store so
// every fetch returns live state. Rate limit above is the real cap.
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const rl = await limit(req, "tx:detail:get", { max: 60, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const t = await getTransmission(id);
  if (!t || t.status !== "live") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(JSON.stringify(toPublic(t)), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store, no-cache, must-revalidate",
    },
  });
}

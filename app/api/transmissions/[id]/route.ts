import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { getTransmission, toPublic } from "@/lib/transmissions-store";

export const revalidate = 30;

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
  return NextResponse.json(toPublic(t));
}

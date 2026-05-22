import { NextResponse } from "next/server";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = await limit(req, "log-error", { max: 20, windowSec: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  try {
    const body = (await req.json()) as { message?: string; stack?: string; url?: string; ua?: string };
    const safe = {
      message: String(body.message || "").slice(0, 500),
      stack: String(body.stack || "").slice(0, 2000),
      url: String(body.url || "").slice(0, 500),
      ua: String(body.ua || "").slice(0, 300),
    };
    console.error("[CLIENT ERROR]", JSON.stringify(safe));
  } catch {}
  return NextResponse.json({ ok: true });
}

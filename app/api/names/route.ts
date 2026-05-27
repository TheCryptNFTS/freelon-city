import { NextResponse } from "next/server";
import { listNames } from "@/lib/name-store";

export const revalidate = 300;

export async function GET() {
  const names = await listNames(200);
  return NextResponse.json({ names });
}

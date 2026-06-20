/**
 * Bulk ghost lookup — RETIRED 2026-06-19 (dump-deterrent rip-out).
 * Nothing is ever ghosted now; always returns an empty set.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  return NextResponse.json({ ids: [] });
}

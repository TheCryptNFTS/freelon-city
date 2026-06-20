/**
 * Ghost lookup — RETIRED 2026-06-19 (dump-deterrent rip-out).
 *
 * The punitive ghosting mechanic was removed; nothing is ever ghosted now.
 * Kept as a stable always-false stub so any lingering caller doesn't 404.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  return NextResponse.json({ ghosted: false });
}

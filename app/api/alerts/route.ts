import { NextResponse } from "next/server";
import { getActiveAlerts } from "@/lib/alerts";

export const revalidate = 60;

export async function GET() {
  try {
    const alerts = await getActiveAlerts();
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
}

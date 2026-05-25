/**
 * GET /api/wallet/{address}/inventory
 *
 * Cross-collection signal inventory scan. Returns ownership across
 * the 6 connected collections defined in lib/collections.ts.
 *
 * Response shape:
 *   { address, scannedAt, collections: [{ collection, count, items[],
 *     truncated, status }] }
 *
 * Cached via OpenSea fetch's per-URL Next revalidate window (2 min),
 * so a flood of paste-the-same-wallet requests stays cheap.
 *
 * Public read. No write side, no auth needed — same surface as the
 * existing /api/wallet/[address]/tokens endpoint.
 */
import { NextResponse } from "next/server";
import { scanWalletSignalInventory } from "@/lib/signal-inventory";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> },
) {
  const { address } = await params;
  const result = await scanWalletSignalInventory(address);
  if (!result) {
    return NextResponse.json(
      { error: "invalid_address" },
      { status: 400 },
    );
  }
  return NextResponse.json(result);
}

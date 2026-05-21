import { NextResponse } from "next/server";
import { getWalletTokens } from "@/lib/wallet-tokens";

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const tokens = await getWalletTokens(address, 200);
  if (!tokens) {
    return NextResponse.json(
      { address, balance: 0, tokenIds: [], truncated: false, error: "invalid-address" },
      { status: 400 }
    );
  }
  return NextResponse.json(tokens);
}

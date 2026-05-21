import { NextResponse } from "next/server";
import { createPublicClient, http, verifyMessage } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT } from "@/lib/constants";
import { getName, setName, validName } from "@/lib/name-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

const client = createPublicClient({ chain: mainnet, transport: http() });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "name-get", { max: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const rec = await getName(cid);
  return NextResponse.json({ id: cid, record: rec });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "name-post", { max: 6 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    address?: string;
    signature?: string;
  };
  const name = body.name?.trim();
  const address = body.address?.toLowerCase();
  const signature = body.signature;

  if (!name || !validName(name)) {
    return NextResponse.json({ error: "invalid name (1-32 chars, A-Z 0-9 space _ -)" }, { status: 400 });
  }
  if (!address || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }

  const message = `I am setting the display name of FREELON CITY citizen #${cid} to "${name}".`;

  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) return NextResponse.json({ error: "signature verification failed" }, { status: 401 });

  let owner: string;
  try {
    owner = String(
      await client.readContract({
        address: CONTRACT as `0x${string}`,
        abi: ABI,
        functionName: "ownerOf",
        args: [BigInt(cid)],
      }),
    ).toLowerCase();
  } catch {
    return NextResponse.json({ error: "could not verify ownership" }, { status: 503 });
  }

  if (owner !== address) {
    return NextResponse.json({ error: "you do not own this citizen" }, { status: 403 });
  }

  await setName(cid, name, address);
  return NextResponse.json({ ok: true, name, owner: address });
}

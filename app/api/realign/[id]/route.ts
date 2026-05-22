import { NextResponse } from "next/server";
import { createPublicClient, http, verifyMessage } from "viem";
import { mainnet } from "viem/chains";
import { CONTRACT, CIVILIZATIONS } from "@/lib/constants";
import { getCitizen } from "@/lib/citizens";
import { getCarrier, putCarrier } from "@/lib/carrier-store";
import { CarrierState } from "@/lib/carrier";
import { normalizeHandle } from "@/lib/sync";
import { getRealignment, setRealignment } from "@/lib/realignment-store";
import { limit, tooManyResponse } from "@/lib/rate-limit";
import { ECONOMY } from "@/lib/economy-constants";

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

const COOLDOWN_MS = 90 * 86400000;
const REALIGN_COST = ECONOMY.REALIGN_COST;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "realign-get", { max: 60 });
  if (!rl.ok) return tooManyResponse(rl);
  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const rec = await getRealignment(cid);
  return NextResponse.json({ id: cid, record: rec });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = await limit(req, "realign", { max: 4 });
  if (!rl.ok) return tooManyResponse(rl);

  const { id } = await params;
  const cid = parseInt(id, 10);
  if (!Number.isFinite(cid) || cid < 1 || cid > 4040) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const citizen = getCitizen(cid);
  if (!citizen) return NextResponse.json({ error: "citizen not found" }, { status: 404 });

  if (citizen.tier !== "Common") {
    return NextResponse.json(
      { error: "realignment is only available for Common-tier citizens" },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    targetCiv?: string;
    address?: string;
    signature?: string;
    handle?: string;
  };

  const targetCiv = (body.targetCiv ?? "").trim();
  const address = body.address?.toLowerCase();
  const signature = body.signature;
  const handle = normalizeHandle(body.handle ?? "");

  if (!address || !signature) {
    return NextResponse.json({ error: "address + signature required" }, { status: 400 });
  }
  if (!handle) {
    return NextResponse.json({ error: "carrier handle required" }, { status: 400 });
  }

  const validCivs = Object.keys(CIVILIZATIONS);
  if (!targetCiv || !validCivs.includes(targetCiv)) {
    return NextResponse.json({ error: "invalid targetCiv" }, { status: 400 });
  }

  const originalCiv = citizen.civilization;
  if (targetCiv === originalCiv) {
    return NextResponse.json({ error: "target must differ from original civilization" }, { status: 400 });
  }

  const existing = await getRealignment(cid);
  if (existing) {
    const elapsed = Date.now() - existing.setAt;
    if (elapsed < COOLDOWN_MS) {
      const nextEligibleAt = existing.setAt + COOLDOWN_MS;
      return NextResponse.json(
        {
          error: "cooldown active",
          nextEligibleAt,
          cooldownMs: COOLDOWN_MS,
        },
        { status: 429 },
      );
    }
  }

  const message = `I am realigning FREELON CITY citizen #${cid} from ${originalCiv} to ${targetCiv}.`;

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

  const carrier = await getCarrier(handle);
  if (!carrier) {
    return NextResponse.json(
      { error: "carrier not found — relay the signal first to earn hex points" },
      { status: 404 },
    );
  }
  if (carrier.hexPoints < REALIGN_COST) {
    return NextResponse.json(
      { error: "insufficient hex points", required: REALIGN_COST, have: carrier.hexPoints },
      { status: 402 },
    );
  }

  const nextCarrier: CarrierState = {
    ...carrier,
    hexPoints: carrier.hexPoints - REALIGN_COST,
    totalSpent: carrier.totalSpent + REALIGN_COST,
  };
  await putCarrier(nextCarrier);

  const rec = {
    citizenId: cid,
    originalCiv,
    alignedCiv: targetCiv,
    owner: address,
    setAt: Date.now(),
  };
  await setRealignment(rec);

  return NextResponse.json({
    ok: true,
    record: rec,
    cost: REALIGN_COST,
    state: nextCarrier,
  });
}

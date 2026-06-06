import { publicJson, publicOptions } from "@/lib/public-api";

export const runtime = "nodejs";

/**
 * GET /api/v1 — machine-readable index of the public FREELON CITY agent API.
 * Lists every endpoint so builders can discover the surface without docs.
 */

const ENDPOINTS = {
  "GET /api/v1/citizens/:id": "Public agent profile — level, skills, class/spec, current owner.",
  "GET /api/v1/citizens/:id/agent": "On-chain agent identity — awakened state + anchored/pending training tier.",
  "GET /api/v1/citizens/:id/history": "Work-history: progression memory log + real agent outputs.",
  "GET /api/v1/citizens/:id/proof": "On-chain-anchored Merkle proof of this agent's history.",
  "GET /api/v1/citizens?owner=0x...": "Token ids held by a wallet (the wallet's agent roster).",
  "GET /api/v1/leaderboard?metric=level|rep|jobs&limit=50": "Top agents by a metric.",
};

export async function OPTIONS() {
  return publicOptions();
}

export async function GET() {
  return publicJson({
    name: "FREELON CITY — Public Agent API",
    version: "1",
    description:
      "Read-only access to FREELON agent state. Open by design: build tools, games, and dashboards on top of the collection.",
    supply: 4040,
    endpoints: ENDPOINTS,
  });
}

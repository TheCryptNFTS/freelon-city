/**
 * Security + quota-burn contract for GET /api/owned-cards.
 *
 * Covers the hardening on app/api/owned-cards/route.ts:
 *   - public `?addr=` read still works (the SPA depends on it)
 *   - when a valid Bearer is present, the SESSION address wins and `?addr=`
 *     is ignored (an authed caller can't enumerate someone else's wallet)
 *   - OWNED_CARDS_REQUIRE_AUTH=true rejects the anonymous path with 401
 *   - the per-address cache short-circuits a repeat hit (no second OpenSea
 *     fan-out), and the page-scan fan-out is capped
 *
 * `openseaFetch` is mocked so no network is touched; we count calls to assert
 * the fan-out cap + cache behavior.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the OpenSea helper BEFORE importing the route. Each mock page returns one
// matching NFT and a `next` cursor, so an uncapped scan would loop forever —
// the cap is what stops it.
const osCalls: string[] = [];
vi.mock("@/lib/opensea-fetch", () => ({
  openseaFetch: vi.fn(async (url: string) => {
    osCalls.push(url);
    return {
      ok: true,
      data: {
        // contract must match collections() for crypttradingcards; use the
        // identifier off the page index so ids stay distinct.
        nfts: [{ contract: CONTRACT, identifier: String(osCalls.length) }],
        next: "cursor-more",
      },
    };
  }),
}));

import { GET } from "@/app/api/owned-cards/route";
import { collectionBySlug } from "@/lib/collections";
import { mintSession } from "@/lib/game-session";

const CONTRACT = (collectionBySlug("crypttradingcards")?.contract || "").toLowerCase();
const ADDR_Q = "0x1111111111111111111111111111111111111111";
const ADDR_SESSION = "0x2222222222222222222222222222222222222222";

function req(url: string, headers?: Record<string, string>): Request {
  return new Request(url, { headers: { "x-real-ip": "127.0.0.1", ...(headers || {}) } });
}

beforeEach(() => {
  osCalls.length = 0;
  delete process.env.OWNED_CARDS_REQUIRE_AUTH;
});

describe("owned-cards: public read", () => {
  it("serves the anonymous ?addr= path and caps the OpenSea fan-out", async () => {
    const res = await GET(req(`http://localhost/api/owned-cards?addr=${ADDR_Q}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.address).toBe(ADDR_Q.toLowerCase());
    expect(body.unknown).toBe(false);
    // Every mock page has a `next`, so an uncapped loop never ends. A bounded
    // fan-out proves MAX_PAGES caps it; truncated must be flagged.
    expect(osCalls.length).toBeGreaterThan(0);
    expect(osCalls.length).toBeLessThanOrEqual(5);
    expect(body.truncated).toBe(true);
  });
});

describe("owned-cards: auth-when-present", () => {
  it("uses the SESSION address and ignores a spoofed ?addr=", async () => {
    const { token } = await mintSession(ADDR_SESSION);
    const res = await GET(
      req(`http://localhost/api/owned-cards?addr=${ADDR_Q}`, {
        authorization: `Bearer ${token}`,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // Session wins; the attacker-supplied ?addr= is discarded.
    expect(body.address).toBe(ADDR_SESSION.toLowerCase());
  });

  it("rejects a bad bearer with 401 even if ?addr= is valid", async () => {
    const res = await GET(
      req(`http://localhost/api/owned-cards?addr=${ADDR_Q}`, {
        authorization: "Bearer not.a.real.token",
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe("owned-cards: strict mode", () => {
  it("OWNED_CARDS_REQUIRE_AUTH=true rejects the anonymous path (401)", async () => {
    process.env.OWNED_CARDS_REQUIRE_AUTH = "true";
    const res = await GET(req(`http://localhost/api/owned-cards?addr=${ADDR_Q}`));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("auth_required");
    // No address resolved -> no OpenSea fan-out at all.
    expect(osCalls.length).toBe(0);
  });

  it("default (flag unset) still serves the public path", async () => {
    const res = await GET(req(`http://localhost/api/owned-cards?addr=${ADDR_Q}`));
    expect(res.status).toBe(200);
  });
});

describe("owned-cards: per-address cache", () => {
  it("a repeat hit for the same wallet skips the OpenSea fan-out", async () => {
    const a = `0x33333333333333333333333333333333333333${"33"}`;
    const r1 = await GET(req(`http://localhost/api/owned-cards?addr=${a}`));
    expect(r1.status).toBe(200);
    const firstCalls = osCalls.length;
    expect(firstCalls).toBeGreaterThan(0);

    const r2 = await GET(req(`http://localhost/api/owned-cards?addr=${a}`));
    expect(r2.status).toBe(200);
    // No additional OpenSea calls on the cached hit.
    expect(osCalls.length).toBe(firstCalls);

    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b2.tokenIds).toEqual(b1.tokenIds);
  });
});

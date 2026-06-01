/**
 * Smoke test for the server-authoritative Crypt match routes (M3 bearer auth).
 *
 * Drives the real route handlers (in-memory match-store + game-session fallback,
 * since no Upstash env in tests) and asserts the authority + security contract:
 *   - create requires a bearer, seats caller P1, returns redacted view + mySeat
 *   - a LEGAL action by the seated active player advances version + returns events
 *   - an ILLEGAL action is rejected (422), version does NOT advance
 *   - a STALE version is a 409 conflict
 *   - the view NEVER leaks seed / rngCursor / any deck[] order / opponent hand
 */

import { describe, it, expect } from "vitest";
import { POST as createMatch } from "@/app/api/match/create/route";
import { POST as matchAction } from "@/app/api/match/[id]/action/route";
import { POST as joinMatch } from "@/app/api/match/[id]/join/route";
import { mintSession } from "@/lib/game-session";

const P1 = "0x1111111111111111111111111111111111111111";
const P2 = "0x2222222222222222222222222222222222222222";

async function bearer(addr: string): Promise<string> {
  const s = await mintSession(addr);
  return s.token;
}

function authHeaders(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-real-ip": "127.0.0.1",
    authorization: `Bearer ${token}`,
  };
}

function actionReq(matchId: string, token: string, body: unknown) {
  return new Request(`http://localhost/api/match/${matchId}/action`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

/** Deep-scan an object graph for any forbidden secret leaking into a view. */
function assertNoSecrets(view: unknown) {
  const json = JSON.stringify(view);
  expect(json).not.toContain('"seed"');
  expect(json).not.toContain("rngCursor");
  expect(json).not.toContain("idCounter");
  expect(json).not.toContain('"deck":');
  const v = view as any;
  expect(v.opponent.hand).toBeUndefined();
  expect(typeof v.opponent.handCount).toBe("number");
  expect(typeof v.opponent.deckCount).toBe("number");
  expect(Array.isArray(v.self.hand)).toBe(true);
}

describe("match routes — server authority (bearer-auth M3)", () => {
  it("creates a match, advances version on legal actions, rejects illegal, blocks stale, never leaks secrets", async () => {
    const t1 = await bearer(P1);
    const t2 = await bearer(P2);

    // --- create (P1 host) ---
    const createRes = await createMatch(
      new Request("http://localhost/api/match/create", {
        method: "POST",
        headers: authHeaders(t1),
      }),
    );
    expect(createRes.status).toBe(200);
    const created = await createRes.json();
    expect(typeof created.matchId).toBe("string");
    expect(created.version).toBe(1);
    expect(created.mySeat).toBe("P1");
    expect(typeof created.view.joinCode).toBe("string"); // seated player sees it
    assertNoSecrets(created.view);

    const matchId = created.matchId as string;

    // --- P2 joins via joinCode so the match has both seats (turn ownership) ---
    const joinRes = await joinMatch(
      new Request(`http://localhost/api/match/${matchId}/join`, {
        method: "POST",
        headers: authHeaders(t2),
        body: JSON.stringify({ joinCode: created.view.joinCode }),
      }),
      { params: Promise.resolve({ id: matchId }) },
    );
    expect(joinRes.status).toBe(200);
    const joined = await joinRes.json();
    expect(joined.mySeat).toBe("P2");
    // Joining seats P2 via a setMatch write, so the live version advanced past 1.
    const vAfterJoin = joined.version as number;
    expect(vAfterJoin).toBeGreaterThanOrEqual(2);

    // --- legal action: P1 ends their turn (P1 is active at start) ---
    const legalRes = await matchAction(
      actionReq(matchId, t1, { version: vAfterJoin, action: { type: "END_TURN", player: "P1" } }),
      { params: Promise.resolve({ id: matchId }) },
    );
    expect(legalRes.status).toBe(200);
    const legal = await legalRes.json();
    expect(legal.version).toBe(vAfterJoin + 1);
    expect(Array.isArray(legal.events)).toBe(true);
    expect(legal.events.some((e: any) => e.type === "TURN_END")).toBe(true);
    assertNoSecrets(legal.view);

    // --- illegal action: P2 plays an out-of-range hand index => REJECTED 422 ---
    // (It IS P2's turn now, and action.player matches the seat, so this reaches
    //  the reducer and is rejected by game rules — not by the auth layer.)
    const illegalRes = await matchAction(
      actionReq(matchId, t2, {
        version: legal.version,
        action: { type: "PLAY_UNIT", player: "P2", handIndex: 999, lane: "front" },
      }),
      { params: Promise.resolve({ id: matchId }) },
    );
    expect(illegalRes.status).toBe(422);
    const illegal = await illegalRes.json();
    expect(illegal.rejected).toBe(true);
    expect(illegal.version).toBe(legal.version); // version did NOT advance on rejection
    assertNoSecrets(illegal.view);

    // --- stale version: P2 replays an old version while store is ahead => 409 ---
    const staleRes = await matchAction(
      actionReq(matchId, t2, { version: vAfterJoin, action: { type: "END_TURN", player: "P2" } }),
      { params: Promise.resolve({ id: matchId }) },
    );
    expect(staleRes.status).toBe(409);
    const stale = await staleRes.json();
    expect(stale.error).toBe("version_conflict");
    expect(stale.version).toBe(legal.version);
    assertNoSecrets(stale.view);
  });
});

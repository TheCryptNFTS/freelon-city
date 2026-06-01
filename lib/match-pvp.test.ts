/**
 * PvP authority + matchmaking + redaction tests.
 *   - action route rejects action.player !== seat (403 seat_mismatch)
 *   - action route rejects acting out of turn (403 not_your_turn)
 *   - action route rejects a wallet with no seat (403 not_seated)
 *   - queue pairs two DISTINCT wallets into one match with opposite seats
 *   - redacted view leaks no seed / deck / opponent hand, and joinCode is
 *     gated to a seated player
 */

import { describe, it, expect } from "vitest";
import { POST as createMatch } from "@/app/api/match/create/route";
import { POST as joinMatch } from "@/app/api/match/[id]/join/route";
import { POST as matchAction } from "@/app/api/match/[id]/action/route";
import { POST as queue } from "@/app/api/match/queue/route";
import { mintSession } from "@/lib/game-session";
import { redactStateFor } from "@/lib/redact-state";
import { getMatch } from "@/lib/match-store";

const A = "0xaaaa000000000000000000000000000000000001";
const B = "0xbbbb000000000000000000000000000000000002";
const C = "0xcccc000000000000000000000000000000000003";

async function tok(addr: string) {
  return (await mintSession(addr)).token;
}
function hdr(token: string) {
  return { "content-type": "application/json", "x-real-ip": "127.0.0.1", authorization: `Bearer ${token}` };
}

async function createWithJoin() {
  const tA = await tok(A);
  const tB = await tok(B);
  const cRes = await createMatch(
    new Request("http://localhost/api/match/create", { method: "POST", headers: hdr(tA) }),
  );
  const created = await cRes.json();
  const id = created.matchId as string;
  await joinMatch(
    new Request(`http://localhost/api/match/${id}/join`, {
      method: "POST",
      headers: hdr(tB),
      body: JSON.stringify({ joinCode: created.view.joinCode }),
    }),
    { params: Promise.resolve({ id }) },
  );
  return { id, tA, tB, joinCode: created.view.joinCode as string };
}

describe("action authority enforcement", () => {
  it("rejects when action.player !== caller's seat (403 seat_mismatch)", async () => {
    const { id, tA } = await createWithJoin();
    // A is seated P1 but claims to be P2 in the action body.
    const res = await matchAction(
      new Request(`http://localhost/api/match/${id}/action`, {
        method: "POST",
        headers: hdr(tA),
        body: JSON.stringify({ version: 1, action: { type: "END_TURN", player: "P2" } }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("seat_mismatch");
  });

  it("rejects acting out of turn (403 not_your_turn)", async () => {
    const { id, tB } = await createWithJoin();
    // It's P1's turn at start; P2 (B) submits its own seat's action -> not your turn.
    const res = await matchAction(
      new Request(`http://localhost/api/match/${id}/action`, {
        method: "POST",
        headers: hdr(tB),
        body: JSON.stringify({ version: 1, action: { type: "END_TURN", player: "P2" } }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_your_turn");
  });

  it("rejects a wallet that holds no seat (403 not_seated)", async () => {
    const { id } = await createWithJoin();
    const tC = await tok(C);
    const res = await matchAction(
      new Request(`http://localhost/api/match/${id}/action`, {
        method: "POST",
        headers: hdr(tC),
        body: JSON.stringify({ version: 1, action: { type: "END_TURN", player: "P1" } }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("not_seated");
  });

  it("rejects an unauthenticated action (401)", async () => {
    const { id } = await createWithJoin();
    const res = await matchAction(
      new Request(`http://localhost/api/match/${id}/action`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
        body: JSON.stringify({ version: 1, action: { type: "END_TURN", player: "P1" } }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(res.status).toBe(401);
  });
});

describe("matchmaking queue", () => {
  it("pairs two distinct wallets into one match with opposite seats", async () => {
    const tA = await tok(A);
    const tB = await tok(B);

    const r1 = await queue(
      new Request("http://localhost/api/match/queue", { method: "POST", headers: hdr(tA) }),
    );
    const j1 = await r1.json();
    expect(r1.status).toBe(200);
    expect(j1.status).toBe("waiting");

    const r2 = await queue(
      new Request("http://localhost/api/match/queue", { method: "POST", headers: hdr(tB) }),
    );
    const j2 = await r2.json();
    expect(r2.status).toBe(200);
    expect(j2.status).toBe("matched");
    expect(j2.mySeat).toBe("P2"); // caller is P2; waiter is P1
    expect(typeof j2.matchId).toBe("string");

    // Confirm the stored seats are opposite + distinct.
    const rec = await getMatch(j2.matchId);
    expect(rec).not.toBeNull();
    expect(rec!.players.P1).toBe(A.toLowerCase());
    expect(rec!.players.P2).toBe(B.toLowerCase());
  });
});

describe("redactStateFor — no leak + joinCode gating", () => {
  it("hides seed/deck/opponent-hand and gates joinCode", async () => {
    const { id } = await createWithJoin();
    const rec = await getMatch(id);
    expect(rec).not.toBeNull();

    // Seated view (joinCode passed because caller is seated).
    const seated = redactStateFor("P1", rec!.state, { matchId: id, joinCode: rec!.joinCode });
    const seatedJson = JSON.stringify(seated);
    expect(seatedJson).not.toContain('"seed"');
    expect(seatedJson).not.toContain("rngCursor");
    expect(seatedJson).not.toContain("idCounter");
    expect(seatedJson).not.toContain('"deck":');
    expect((seated as any).opponent.hand).toBeUndefined();
    expect(typeof (seated as any).opponent.handCount).toBe("number");
    expect(typeof (seated as any).opponent.deckCount).toBe("number");
    expect(Array.isArray((seated as any).self.hand)).toBe(true);
    expect(seated.mySeat).toBe("P1");
    expect(seated.joinCode).toBe(rec!.joinCode);

    // Non-seated view (no joinCode meta passed) -> joinCode absent.
    const blind = redactStateFor("P2", rec!.state, { matchId: id });
    expect(blind.joinCode).toBeUndefined();
  });
});

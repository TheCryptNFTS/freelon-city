/**
 * Arcade score route auth tests.
 *
 * Closes the wallet-impersonation hole: the POST used to trust `body.wallet`
 * with zero signature, letting anyone stamp a top score under any wallet.
 * Now a wallet-attributed score REQUIRES a valid SIWE bearer and the stored
 * wallet is forced to the SESSION address; anonymous handle-only play stays open.
 */

import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/arcade/score/route";
import { mintSession } from "@/lib/game-session";

const VICTIM = "0x1111111111111111111111111111111111111111";
const ATTACKER = "0x2222222222222222222222222222222222222222";

function postReq(body: unknown, token?: string): Request {
  return new Request("http://localhost/api/arcade/score", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/arcade/score wallet attribution auth", () => {
  it("anonymous handle-only score is accepted (no auth)", async () => {
    const res = await POST(postReq({ game: "hex-match", score: 100, handle: "anon_player" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.handle).toBe("anon_player");
  });

  it("wallet attribution WITHOUT a bearer is rejected (was the exploit)", async () => {
    const res = await POST(postReq({ game: "hex-match", score: 999, wallet: VICTIM }));
    expect(res.status).toBe(401);
  });

  it("wallet attribution whose address != session address is rejected", async () => {
    const { token } = await mintSession(ATTACKER);
    // Attacker holds their own valid bearer but tries to stamp the victim's wallet.
    const res = await POST(postReq({ game: "hex-match", score: 999, wallet: VICTIM }, token));
    expect(res.status).toBe(403);
  });

  it("wallet attribution matching the session address is accepted and stored as session addr", async () => {
    const { token } = await mintSession(VICTIM);
    const res = await POST(postReq({ game: "hex-match", score: 250, wallet: VICTIM }, token));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.best).toBeGreaterThanOrEqual(250);
  });
});

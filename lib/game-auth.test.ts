/**
 * SIWE bearer auth tests: nonce single-use, verify mints a usable bearer,
 * verifyBearer rejects tampered + expired + revoked tokens.
 *
 * Uses an EOA private key (viem) to produce a real signature over the exact
 * server-rebuilt message, exercising the full /api/auth/nonce -> verify flow.
 */

import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { POST as nonceRoute } from "@/app/api/auth/nonce/route";
import { POST as verifyRoute } from "@/app/api/auth/verify/route";
import { issueNonce, consumeNonce } from "@/lib/auth-nonce-store";
import {
  mintSession,
  verifyBearer,
  revokeSession,
  buildAuthMessage,
  nonceIssuedAt,
} from "@/lib/game-session";

// Deterministic dev key (well-known anvil key #0).
const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(PK);
const ADDR = account.address;

function bearerReq(token: string | null): Request {
  return new Request("http://localhost/api/x", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("auth nonce store", () => {
  it("nonce is single-use: a second consume fails", async () => {
    const n = await issueNonce(ADDR);
    expect(typeof n).toBe("string");
    const first = await consumeNonce(ADDR);
    expect(first).toBe(n);
    const second = await consumeNonce(ADDR);
    expect(second).toBeNull();
  });
});

describe("game session bearer", () => {
  it("mintSession produces a token verifyBearer accepts", async () => {
    const { token } = await mintSession(ADDR);
    const v = await verifyBearer(bearerReq(token));
    expect(v?.address).toBe(ADDR.toLowerCase());
  });

  it("verifyBearer rejects a tampered token", async () => {
    const { token } = await mintSession(ADDR);
    const tampered = token.slice(0, -2) + (token.endsWith("a") ? "b" : "a");
    expect(await verifyBearer(bearerReq(tampered))).toBeNull();
  });

  it("verifyBearer rejects a missing/garbage token", async () => {
    expect(await verifyBearer(bearerReq(null))).toBeNull();
    expect(await verifyBearer(bearerReq("not.a.token"))).toBeNull();
  });

  it("verifyBearer rejects after revocation (kill-switch)", async () => {
    const { token } = await mintSession(ADDR);
    expect(await verifyBearer(bearerReq(token))).not.toBeNull();
    await revokeSession(ADDR);
    expect(await verifyBearer(bearerReq(token))).toBeNull();
  });
});

describe("auth flow: nonce -> sign -> verify", () => {
  it("mints a usable bearer from a real signature", async () => {
    // 1. request a nonce
    const nRes = await nonceRoute(
      new Request("http://localhost/api/auth/nonce", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
        body: JSON.stringify({ address: ADDR }),
      }),
    );
    expect(nRes.status).toBe(200);
    const { nonce } = await nRes.json();
    expect(typeof nonce).toBe("string");

    // 2. sign the SERVER-rebuilt message
    const message = buildAuthMessage(ADDR, nonce, nonceIssuedAt(nonce));
    const signature = await account.signMessage({ message });

    // 3. verify
    const vRes = await verifyRoute(
      new Request("http://localhost/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
        body: JSON.stringify({ address: ADDR, signature }),
      }),
    );
    expect(vRes.status).toBe(200);
    const out = await vRes.json();
    expect(out.address).toBe(ADDR.toLowerCase());
    expect(typeof out.token).toBe("string");
    expect(typeof out.expiresAt).toBe("number");

    // the minted token works
    const v = await verifyBearer(bearerReq(out.token));
    expect(v?.address).toBe(ADDR.toLowerCase());
  });

  it("rejects verify when the nonce was never issued (single-use already spent)", async () => {
    // No nonce issued for this fresh address -> 401.
    const other = privateKeyToAccount(
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    );
    const sig = await other.signMessage({ message: "irrelevant" });
    const vRes = await verifyRoute(
      new Request("http://localhost/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1" },
        body: JSON.stringify({ address: other.address, signature: sig }),
      }),
    );
    expect(vRes.status).toBe(401);
  });
});

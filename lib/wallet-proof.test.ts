/**
 * Wallet-proof replay protection (E1): the /api/x/prove challenge must embed a
 * server-issued single-use nonce so a captured signature can't re-prove the
 * wallet on an attacker's session. Exercises the real nonce -> sign -> verify
 * flow with an EOA key, plus the two replay paths and nonce-scope isolation.
 */

import { describe, it, expect } from "vitest";
import { privateKeyToAccount } from "viem/accounts";

// signSession (cookie minting) reads this at call time; supply a dummy so the
// success path can complete in the test env.
process.env.X_OAUTH_CLIENT_SECRET ||= "test-secret-wallet-proof";

import { POST as proveNonceRoute } from "@/app/api/x/prove/nonce/route";
import { POST as proveRoute } from "@/app/api/x/prove/route";
import { walletProofMessage } from "@/lib/wallet-proof";
import { issueNonce, consumeNonce } from "@/lib/auth-nonce-store";

// Deterministic dev key (well-known anvil key #0).
const PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const account = privateKeyToAccount(PK);
const ADDR = account.address;

function jsonReq(url: string, body: unknown): Request {
  // `host` is needed for isSameOrigin (a synthetic Request doesn't derive it
  // from the URL); no Origin/Referer => the non-browser path is accepted.
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "127.0.0.1", host: "localhost" },
    body: JSON.stringify(body),
  });
}

async function getNonce(addr: string): Promise<string> {
  const res = await proveNonceRoute(jsonReq("http://localhost/api/x/prove/nonce", { address: addr }));
  expect(res.status).toBe(200);
  const { nonce } = await res.json();
  return nonce as string;
}

describe("wallet-proof message", () => {
  it("embeds the address and nonce, and differs per nonce", () => {
    const m1 = walletProofMessage(ADDR, "aaa");
    const m2 = walletProofMessage(ADDR, "bbb");
    expect(m1).toContain(ADDR.toLowerCase());
    expect(m1).toContain("Nonce: aaa");
    expect(m1).not.toBe(m2);
  });
});

describe("wallet-proof flow: nonce -> sign -> verify", () => {
  it("proves the wallet from a real signature over the issued nonce", async () => {
    const nonce = await getNonce(ADDR);
    const signature = await account.signMessage({ message: walletProofMessage(ADDR, nonce) });
    const res = await proveRoute(jsonReq("http://localhost/api/x/prove", { address: ADDR, signature }));
    expect(res.status).toBe(200);
    const out = await res.json();
    expect(out.ok).toBe(true);
    expect(out.wallet).toBe(ADDR.toLowerCase());
  });

  it("rejects a replayed signature once the nonce is consumed", async () => {
    const nonce = await getNonce(ADDR);
    const signature = await account.signMessage({ message: walletProofMessage(ADDR, nonce) });
    // First redemption succeeds and consumes the nonce.
    expect((await proveRoute(jsonReq("http://localhost/api/x/prove", { address: ADDR, signature }))).status).toBe(200);
    // Replaying the same signature now has no live nonce -> 401.
    const replay = await proveRoute(jsonReq("http://localhost/api/x/prove", { address: ADDR, signature }));
    expect(replay.status).toBe(401);
  });

  it("rejects an old signature even against a freshly issued nonce", async () => {
    const oldNonce = await getNonce(ADDR);
    const oldSig = await account.signMessage({ message: walletProofMessage(ADDR, oldNonce) });
    await consumeNonce(ADDR, "xprove"); // discard the old nonce
    await getNonce(ADDR); // attacker gets a fresh, different nonce
    // The captured signature was over the OLD nonce; server rebuilds with the
    // new one, so verification fails.
    const res = await proveRoute(jsonReq("http://localhost/api/x/prove", { address: ADDR, signature: oldSig }));
    expect(res.status).toBe(401);
  });

  it("rejects when no nonce was ever issued", async () => {
    const other = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    const sig = await other.signMessage({ message: walletProofMessage(other.address, "ghost") });
    const res = await proveRoute(jsonReq("http://localhost/api/x/prove", { address: other.address, signature: sig }));
    expect(res.status).toBe(401);
  });
});

describe("nonce scope isolation", () => {
  it("an xprove nonce does not clobber the v1 (game-login) nonce", async () => {
    const v1 = await issueNonce(ADDR, "v1");
    await issueNonce(ADDR, "xprove");
    // Consuming v1 still returns the original v1 nonce — scopes are independent.
    expect(await consumeNonce(ADDR, "v1")).toBe(v1);
  });
});

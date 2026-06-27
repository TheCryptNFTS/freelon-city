/**
 * Shared wallet-proof primitives — NO node-only deps, so this module is safe to
 * import from both server routes and client components.
 *
 * `walletProofMessage` is the canonical text a wallet signs to prove control of
 * its session. It must be byte-identical where it's signed (client) and where
 * it's verified (server, /api/x/prove). The lowercased address is embedded so a
 * signature can't be replayed to prove a DIFFERENT wallet, and a server-issued
 * single-use `nonce` is embedded so a captured signature can't be replayed to
 * re-prove the SAME wallet on an attacker's session (the static message had no
 * nonce — one leaked signature bound the wallet forever).
 */
export function walletProofMessage(address: string, nonce: string): string {
  return [
    "FREELON CITY — prove wallet control",
    `Wallet: ${address.toLowerCase()}`,
    "This links your wallet to your session so you can deploy agents and spend ⬡ without re-signing. It is NOT a transaction and costs nothing.",
    `Nonce: ${nonce}`,
  ].join("\n");
}

type ProveResult = { ok: boolean; reason?: "no_wallet" | "rejected" | "failed" };

/**
 * Client-only: ask the connected wallet to sign the canonical proof message,
 * then POST it to /api/x/prove so the session gains `walletProof`. After this
 * succeeds once, every ⬡-spend rail works for the 7-day session with no further
 * popups. Returns {ok:false, reason:"no_wallet"} when there's no injected wallet
 * (the caller should then route the holder to a signer-capable context).
 */
export async function proveWallet(address: string): Promise<ProveResult> {
  const eth = (globalThis as { ethereum?: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum
    ?? (typeof window !== "undefined" ? (window as unknown as { ethereum?: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum : undefined);
  if (!eth) return { ok: false, reason: "no_wallet" };

  // 1. Fetch a fresh single-use challenge nonce for this address. Without it the
  //    server has nothing to bind the signature to, so a leaked signature could
  //    be replayed forever.
  let nonce: string;
  try {
    const nr = await fetch("/api/x/prove/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!nr.ok) return { ok: false, reason: "failed" };
    nonce = ((await nr.json()) as { nonce?: string }).nonce || "";
    if (!nonce) return { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }

  // 2. Sign the canonical message carrying that nonce.
  let signature: string;
  try {
    signature = (await eth.request({ method: "personal_sign", params: [walletProofMessage(address, nonce), address] })) as string;
  } catch {
    return { ok: false, reason: "rejected" };
  }

  // 3. Redeem: the server consumes (single-use) the nonce, rebuilds the same
  //    message, and verifies the signature before granting wallet authority.
  try {
    const r = await fetch("/api/x/prove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, signature }),
    });
    return r.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

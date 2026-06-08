/**
 * Shared wallet-proof primitives — NO node-only deps, so this module is safe to
 * import from both server routes and client components.
 *
 * `walletProofMessage` is the canonical text a wallet signs to prove control of
 * its session. It must be byte-identical where it's signed (client) and where
 * it's verified (server, /api/x/prove). The lowercased address is embedded so a
 * signature can't be replayed to prove a different wallet.
 */
export function walletProofMessage(address: string): string {
  return [
    "FREELON CITY — prove wallet control",
    `Wallet: ${address.toLowerCase()}`,
    "This links your wallet to your session so you can deploy agents and spend ⬡ without re-signing. It is NOT a transaction and costs nothing.",
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
  let signature: string;
  try {
    signature = (await eth.request({ method: "personal_sign", params: [walletProofMessage(address), address] })) as string;
  } catch {
    return { ok: false, reason: "rejected" };
  }
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

"use client";

// Read a connected wallet address robustly. Tries selectedAddress first
// (instant, no permission prompt), falls back to eth_accounts (returns array
// of already-approved addresses without prompting the user). Returns null if
// no wallet is connected.
export async function getWalletAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const eth = (window as unknown as { ethereum?: { selectedAddress?: string; request?: (args: { method: string }) => Promise<unknown> } }).ethereum;
  if (!eth) return null;

  const fromSelected = eth.selectedAddress;
  if (fromSelected && /^0x[a-fA-F0-9]{40}$/.test(fromSelected)) {
    return fromSelected.toLowerCase();
  }

  try {
    if (typeof eth.request !== "function") return null;
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    if (Array.isArray(accounts) && accounts[0] && /^0x[a-fA-F0-9]{40}$/.test(accounts[0])) {
      return accounts[0].toLowerCase();
    }
  } catch {
    /* swallow */
  }
  return null;
}

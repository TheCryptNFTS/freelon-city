/**
 * ANCHOR FREELON HISTORIES ON-CHAIN — founder-run, wallet-signed.
 *
 * This sends ONE real transaction to the FreelonHistoryRegistry contract,
 * committing a Merkle root of all citizen histories. It is NOT run by the app —
 * you run it deliberately when you want to anchor (e.g. weekly, or before a big
 * sale window).
 *
 * SAFETY:
 *  - Dry run by default: prints the root + cost estimate and STOPS. Pass --send
 *    to actually broadcast.
 *  - Requires ANCHOR_PRIVATE_KEY (the registry owner wallet) + REGISTRY_ADDRESS
 *    + ETH_RPC_URL in env. Without --send, no key is needed.
 *  - The app computes the root read-only; this script is the only thing that
 *    writes to chain, and only with --send.
 *
 * Usage:
 *   node scripts/anchor-history.mjs                 # dry run: show the root
 *   node scripts/anchor-history.mjs --send          # broadcast the anchor tx
 *
 * NOTE: deploying the registry contract the first time is a separate step — see
 * contracts/FreelonHistoryRegistry.sol and scripts/README-onchain.md.
 */
import { readFileSync } from "node:fs";

// --- load env from .env.local (key + rpc + registry address) ---
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch { /* env may be provided by the shell */ }
const RPC = process.env.ETH_RPC_URL || env.ETH_RPC_URL;
const REGISTRY = process.env.REGISTRY_ADDRESS || env.REGISTRY_ADDRESS;
const PK = process.env.ANCHOR_PRIVATE_KEY || env.ANCHOR_PRIVATE_KEY;
const SEND = process.argv.includes("--send");

async function main() {
  // Compute the root via the same logic the app uses. We import the built libs
  // through a tiny inline tree to avoid a Next runtime; instead we hit the local
  // app's read-only anchor endpoint if running, else instruct the user.
  const base = process.env.ANCHOR_APP_URL || env.ANCHOR_APP_URL || "http://localhost:3000";
  let root, count;
  try {
    const r = await fetch(`${base}/api/admin/anchor/compute?key=${env.ADMIN_SEED_KEY || ""}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || "compute failed");
    root = j.root; count = j.count;
  } catch (e) {
    console.error(`Could not compute root via ${base} — is the app running + ADMIN_SEED_KEY set?`);
    console.error(String(e));
    process.exit(1);
  }

  console.log(`\n⬡ FREELON history anchor`);
  console.log(`  citizens with history : ${count}`);
  console.log(`  merkle root           : ${root}`);

  if (!SEND) {
    console.log(`\nDRY RUN — nothing sent. Re-run with --send to broadcast the anchor tx.`);
    console.log(`Requires REGISTRY_ADDRESS, ANCHOR_PRIVATE_KEY, ETH_RPC_URL in env.\n`);
    return;
  }

  if (!RPC || !REGISTRY || !PK) {
    console.error("Missing env for --send: need ETH_RPC_URL, REGISTRY_ADDRESS, ANCHOR_PRIVATE_KEY.");
    process.exit(1);
  }

  // Lazy-load viem only when actually sending.
  const { createWalletClient, http, encodeFunctionData } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { mainnet } = await import("viem/chains");

  const account = privateKeyToAccount(PK.startsWith("0x") ? PK : `0x${PK}`);
  const wallet = createWalletClient({ account, chain: mainnet, transport: http(RPC) });

  const data = encodeFunctionData({
    abi: [{ name: "anchor", type: "function", stateMutability: "nonpayable",
      inputs: [{ name: "root", type: "bytes32" }, { name: "count", type: "uint256" }],
      outputs: [{ name: "epoch", type: "uint256" }] }],
    functionName: "anchor",
    args: [root, BigInt(count)],
  });

  console.log(`\nBroadcasting anchor() from ${account.address} → ${REGISTRY} …`);
  const hash = await wallet.sendTransaction({ to: REGISTRY, data });
  console.log(`✓ sent: ${hash}`);
  console.log(`After it confirms, POST the snapshot to /api/admin/anchor/save so proofs resolve.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });

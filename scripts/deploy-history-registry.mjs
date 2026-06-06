/**
 * DEPLOY FreelonHistoryRegistry ON-CHAIN — founder-run, wallet-signed, ONE-TIME.
 *
 * Deploys contracts/FreelonHistoryRegistry.sol (the append-only Merkle-root log
 * that anchors off-chain agent histories). The constructor takes NO args — the
 * deploying wallet becomes `owner` (the only address that can anchor), so deploy
 * from the SAME wallet you'll use for scripts/anchor-history.mjs (ANCHOR_PRIVATE_KEY).
 *
 * Mirrors scripts/deploy-agent-registry.mjs:
 *  - DRY RUN by default: prints bytecode size + gas estimate, then STOPS. Pass
 *    --send to actually broadcast the deploy tx.
 *  - Defaults to Sepolia (free testnet); pass --mainnet (or DEPLOY_NETWORK=mainnet)
 *    for the real deploy.
 *  - viem is lazy-loaded; without --send no key is needed.
 *  - Reads the precompiled artifact (scripts/artifacts/FreelonHistoryRegistry.json,
 *    solc 0.8.28 optimized) so there is no compile step at deploy time.
 *
 * Env for --send (from .env.local or the shell):
 *   ETH_RPC_URL          mainnet (or Sepolia) RPC
 *   ANCHOR_PRIVATE_KEY   private key of the wallet that will OWN the registry
 *                        (the only address that can anchor() later)
 *
 * Usage:
 *   node scripts/deploy-history-registry.mjs            # dry run (Sepolia)
 *   node scripts/deploy-history-registry.mjs --send     # broadcast on Sepolia
 *   node scripts/deploy-history-registry.mjs --send --mainnet   # real deploy
 *
 * After it confirms, set these env vars (Vercel + .env.local) to the deployed
 * address, then redeploy the app:
 *   REGISTRY_ADDRESS=0x...             (server + anchor script read)
 *   NEXT_PUBLIC_REGISTRY_ADDRESS=0x... (UI verify badge link, optional)
 */
import { readFileSync } from "node:fs";

// --- load env from .env.local (key + rpc) ---
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch { /* env may be provided by the shell */ }
const RPC = process.env.ETH_RPC_URL || env.ETH_RPC_URL;
const PK = process.env.ANCHOR_PRIVATE_KEY || env.ANCHOR_PRIVATE_KEY;
const SEND = process.argv.includes("--send");
// Default to Sepolia (free testnet) so a first deploy costs nothing real.
// Set DEPLOY_NETWORK=mainnet (or pass --mainnet) for the real deploy.
const NETWORK = process.argv.includes("--mainnet")
  ? "mainnet"
  : (process.env.DEPLOY_NETWORK || env.DEPLOY_NETWORK || "sepolia").toLowerCase();

const artifact = JSON.parse(
  readFileSync(new URL("./artifacts/FreelonHistoryRegistry.json", import.meta.url), "utf8"),
);

async function main() {
  console.log(`\n⬡ FREELON History Registry — deploy`);
  console.log(`  contract        : ${artifact.contract} (${artifact.compiler})`);
  console.log(`  bytecode size   : ${(artifact.bytecode.length - 2) / 2} bytes`);
  console.log(`  constructor     : (none — deployer becomes owner)`);
  console.log(`  network         : ${NETWORK}`);

  if (!SEND) {
    console.log(`\nDRY RUN — nothing sent. Re-run with --send to broadcast the deploy.`);
    console.log(`Requires ETH_RPC_URL + ANCHOR_PRIVATE_KEY in env.\n`);
    return;
  }

  if (!RPC || !PK) {
    console.error("Missing env for --send: need ETH_RPC_URL, ANCHOR_PRIVATE_KEY.");
    process.exit(1);
  }

  // Lazy-load viem only when actually sending.
  const { createWalletClient, createPublicClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { mainnet, sepolia } = await import("viem/chains");
  const chain = NETWORK === "mainnet" ? mainnet : sepolia;

  const account = privateKeyToAccount(PK.startsWith("0x") ? PK : `0x${PK}`);
  const wallet = createWalletClient({ account, chain, transport: http(RPC) });
  const pub = createPublicClient({ chain, transport: http(RPC) });

  // Gas estimate for the deploy (no constructor args).
  try {
    const gas = await pub.estimateGas({ account: account.address, data: artifact.bytecode });
    const price = await pub.getGasPrice();
    console.log(`  est. gas        : ${gas} @ ${price} wei  (~${formatEthCost(gas, price)} ETH)`);
  } catch (e) {
    console.warn(`  (gas estimate failed: ${String(e).slice(0, 120)})`);
  }

  console.log(`\nDeploying from ${account.address} …`);
  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode });
  console.log(`✓ deploy tx sent: ${hash}`);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`✓ confirmed. contractAddress: ${receipt.contractAddress}`);

  // Auto-save the deployed address into .env.local (append only when absent).
  try {
    const envUrl = new URL("../.env.local", import.meta.url);
    let body = "";
    try { body = readFileSync(envUrl, "utf8"); } catch { /* file may not exist */ }
    const { writeFileSync } = await import("node:fs");
    const addr = receipt.contractAddress;
    const lines = [];
    if (!/^REGISTRY_ADDRESS=/m.test(body)) lines.push(`REGISTRY_ADDRESS=${addr}`);
    if (!/^NEXT_PUBLIC_REGISTRY_ADDRESS=/m.test(body)) lines.push(`NEXT_PUBLIC_REGISTRY_ADDRESS=${addr}`);
    if (lines.length) {
      writeFileSync(envUrl, `${body}${body.endsWith("\n") || body === "" ? "" : "\n"}${lines.join("\n")}\n`);
      console.log(`✓ saved ${lines.length} var(s) to .env.local`);
    } else {
      console.log(`(.env.local already has the address vars — left as-is. Deployed: ${addr})`);
    }
  } catch (e) {
    console.warn(`(could not auto-write .env.local: ${String(e).slice(0, 100)})`);
    console.log(`  Set manually: REGISTRY_ADDRESS=${receipt.contractAddress}`);
  }
  console.log(`\nNext: add REGISTRY_ADDRESS in Vercel, redeploy the app, then run scripts/anchor-history.mjs --send.\n`);
}

function formatEthCost(gas, price) {
  const wei = gas * price;
  return (Number(wei) / 1e18).toFixed(5);
}

main().catch((e) => { console.error(e); process.exit(1); });

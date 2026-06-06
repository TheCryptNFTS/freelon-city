/**
 * DEPLOY FreelonAgentRegistry ON-CHAIN — founder-run, wallet-signed, ONE-TIME.
 *
 * Deploys contracts/FreelonAgentRegistry.sol (the on-chain agent-identity +
 * training-tier registry) to Ethereum mainnet. The constructor is given the
 * SEALED FREELON NFT address so awaken() can verify ownership via ownerOf().
 *
 * Mirrors scripts/anchor-history.mjs:
 *  - DRY RUN by default: prints the constructor arg, bytecode size, and a gas
 *    estimate, then STOPS. Pass --send to actually broadcast the deploy tx.
 *  - viem is lazy-loaded; without --send no key is needed.
 *  - Reads the precompiled artifact (scripts/artifacts/FreelonAgentRegistry.json,
 *    solc 0.8.28 optimized) so there is no compile step at deploy time.
 *
 * Env for --send (from .env.local or the shell):
 *   ETH_RPC_URL              mainnet RPC
 *   AGENT_REGISTRY_OWNER_KEY private key of the wallet that will OWN the registry
 *                            (the only address that can recordEvolution later)
 *
 * Usage:
 *   node scripts/deploy-agent-registry.mjs            # dry run
 *   node scripts/deploy-agent-registry.mjs --send     # broadcast the deploy
 *
 * After it confirms, set these env vars (Vercel + .env.local) to the deployed
 * address, then redeploy the app:
 *   AGENT_REGISTRY_ADDRESS=0x...            (server reads)
 *   NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x.. (client Awaken button)
 */
import { readFileSync } from "node:fs";

// --- the sealed FREELON NFT (constructor arg) ---
const FREELON_NFT = "0xa79e73c9828db3fcd7c77be7d9f356fb684b5504";

// --- load env from .env.local (key + rpc) ---
const env = {};
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch { /* env may be provided by the shell */ }
const RPC = process.env.ETH_RPC_URL || env.ETH_RPC_URL;
const PK = process.env.AGENT_REGISTRY_OWNER_KEY || env.AGENT_REGISTRY_OWNER_KEY;
const SEND = process.argv.includes("--send");
// Default to Sepolia (free test net) so a first deploy costs nothing real.
// Set DEPLOY_NETWORK=mainnet (or pass --mainnet) for the real deploy.
const NETWORK = process.argv.includes("--mainnet")
  ? "mainnet"
  : (process.env.DEPLOY_NETWORK || env.DEPLOY_NETWORK || "sepolia").toLowerCase();

const artifact = JSON.parse(
  readFileSync(new URL("./artifacts/FreelonAgentRegistry.json", import.meta.url), "utf8"),
);

async function main() {
  console.log(`\n⬡ FREELON Agent Registry — deploy`);
  console.log(`  contract        : ${artifact.contract} (${artifact.compiler})`);
  console.log(`  bytecode size   : ${(artifact.bytecode.length - 2) / 2} bytes`);
  console.log(`  constructor arg : freelonNft = ${FREELON_NFT}`);
  console.log(`  network         : ${NETWORK}`);

  if (!SEND) {
    console.log(`\nDRY RUN — nothing sent. Re-run with --send to broadcast the deploy.`);
    console.log(`Requires ETH_RPC_URL + AGENT_REGISTRY_OWNER_KEY in env.\n`);
    return;
  }

  if (!RPC || !PK) {
    console.error("Missing env for --send: need ETH_RPC_URL, AGENT_REGISTRY_OWNER_KEY.");
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

  // Gas estimate for the deploy (constructor included).
  try {
    const gas = await pub.estimateGas({
      account: account.address,
      data: encodeDeploy(artifact.bytecode, FREELON_NFT),
    });
    const price = await pub.getGasPrice();
    console.log(`  est. gas        : ${gas} @ ${price} wei  (~${formatEthCost(gas, price)} ETH)`);
  } catch (e) {
    console.warn(`  (gas estimate failed: ${String(e).slice(0, 120)})`);
  }

  console.log(`\nDeploying from ${account.address} …`);
  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    args: [FREELON_NFT],
  });
  console.log(`✓ deploy tx sent: ${hash}`);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`✓ confirmed. contractAddress: ${receipt.contractAddress}`);

  // Auto-save the deployed address into .env.local so there's no manual copy.
  // Appends only when the var isn't already present (re-run safe). The owner key
  // and RPC are left untouched.
  try {
    const envUrl = new URL("../.env.local", import.meta.url);
    let body = "";
    try { body = readFileSync(envUrl, "utf8"); } catch { /* file may not exist */ }
    const { writeFileSync } = await import("node:fs");
    const addr = receipt.contractAddress;
    const lines = [];
    if (!/^AGENT_REGISTRY_ADDRESS=/m.test(body)) lines.push(`AGENT_REGISTRY_ADDRESS=${addr}`);
    if (!/^NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=/m.test(body)) lines.push(`NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${addr}`);
    if (lines.length) {
      writeFileSync(envUrl, `${body}${body.endsWith("\n") || body === "" ? "" : "\n"}${lines.join("\n")}\n`);
      console.log(`✓ saved ${lines.length} var(s) to .env.local`);
    } else {
      console.log(`(.env.local already has the address vars — left as-is. Deployed: ${addr})`);
    }
  } catch (e) {
    console.warn(`(could not auto-write .env.local: ${String(e).slice(0, 100)})`);
    console.log(`  Set manually: AGENT_REGISTRY_ADDRESS=${receipt.contractAddress}`);
    console.log(`               NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=${receipt.contractAddress}`);
  }
  console.log(`\nLast step: add the same two vars in Vercel, then redeploy the app.\n`);
}

// Minimal constructor-encoded deploy data for the gas estimate (address arg,
// left-padded to 32 bytes). viem's deployContract does this itself for the send.
function encodeDeploy(bytecode, addr) {
  const arg = addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return `${bytecode}${arg}`;
}

function formatEthCost(gas, price) {
  const wei = gas * price;
  return (Number(wei) / 1e18).toFixed(5);
}

main().catch((e) => { console.error(e); process.exit(1); });

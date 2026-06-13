# On-chain history anchoring — runbook

Anchors a Merkle root of all FREELON agent histories to Ethereum mainnet, so any
holder/buyer can verify their citizen's history is included and untampered.

**What it proves:** a root anchored at block N means "these exact histories
existed at N." A saved Merkle proof lets anyone detect later tampering. It is
tamper-EVIDENT, not tamper-proof — word public copy as "anchored / verifiable",
never "immutable" or "stored on-chain" (only the *root* is on-chain, not the
full history).

## One-time: deploy the registry
The FREELON NFT (`0xa79e73…b5504`) is sealed, so history lives in a SEPARATE
contract: `contracts/FreelonHistoryRegistry.sol` (minimal, append-only roots).

1. Deploy it to **a testnet first** (Sepolia) via Remix or Foundry. Verify the
   `anchor()` / `latest()` / `verify()` calls behave.
2. Deploy to mainnet from the wallet you want as `owner` (the only address that
   can anchor). ~one-time deploy cost.
3. Put the deployed address in env as `REGISTRY_ADDRESS` (+ `NEXT_PUBLIC_REGISTRY_ADDRESS`
   if the UI badge links to it).

## Each anchor (repeatable, ~1 cheap tx)
Requires the app running with `ADMIN_SEED_KEY` set, plus `ETH_RPC_URL`,
`REGISTRY_ADDRESS`, `ANCHOR_PRIVATE_KEY` (the owner wallet) for the send.

```bash
# 1. Dry run — compute + print the root, send nothing:
node scripts/anchor-history.mjs

# 2. Broadcast the anchor tx (one mainnet tx):
node scripts/anchor-history.mjs --send

# 3. After it confirms, persist the snapshot so proofs resolve (epoch = the
#    anchor index the contract returned, starts at 0):
curl -X POST "https://www.freeloncity.com/api/admin/anchor/save" -H "x-admin-key: $ADMIN_SEED_KEY" \
  -H 'content-type: application/json' -d '{"epoch":0}'
```

## Notes
- Between anchors, new work is NOT yet anchored. The verify badge shows
  "verified as of <anchor date>"; a citizen that did work since reads as
  "newer work pending next anchor" (the `current:false` flag) — honest by design.
- Re-anchor on whatever cadence makes sense (weekly, or before a sale push).
- All compute is read-only; the ONLY chain write is `anchor-history.mjs --send`.

---

# Agent registry — awaken + training-tier (runbook)

A SECOND side-contract, `contracts/FreelonAgentRegistry.sol`, gives each citizen
an on-chain agent identity. Two writes:
- `awaken(tokenId, agentURI)` — HOLDER-signed, gated by `ownerOf` on the sealed
  NFT. Binds the token to its agent profile URI. This is the "connect" primitive
  other apps resolve.
- `recordEvolution(tokenId, tier, historyRoot)` — PROJECT-signed (onlyOwner).
  Anchors a citizen's paid training tier (the ⬡ Ascension sink) on-chain.

## One-time: deploy the registry
Precompiled artifact is committed at `scripts/artifacts/FreelonAgentRegistry.json`
(solc 0.8.28, optimized). The constructor takes the sealed FREELON address.

```bash
# 1. Dry run — prints constructor arg + bytecode size, sends nothing:
npm run deploy:agent-registry

# 2. Broadcast the deploy (one mainnet tx). Needs ETH_RPC_URL +
#    AGENT_REGISTRY_OWNER_KEY (the wallet that will OWN the registry):
node scripts/deploy-agent-registry.mjs --send
```

Deploy to **Sepolia first** to sanity-check `awaken` / `recordEvolution` /
`getAgent` if you want (point ETH_RPC_URL at a testnet, change the chain in the
script). Then mainnet.

## After deploy: set env, then redeploy the app
```
AGENT_REGISTRY_ADDRESS=0x...             # server reads (getAgent, recordEvolution)
NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS=0x... # client Awaken button
AGENT_REGISTRY_OWNER_KEY=0x...           # owner key for recordEvolution batch
```
Until these are set everything degrades gracefully: the Awaken button reads
"coming soon", the public `/api/v1/citizens/:id/agent` reports `registryLive:false`,
and holders can still BURN ⬡ to ascend (queued as pending).

## Flush paid ascensions on-chain (repeatable)
Holders burn ⬡ via `/api/agent/ascend` → recorded as a PENDING tier. To anchor
the pending tiers on-chain (project-signed batch):
```bash
curl -X POST https://www.freeloncity.com/api/admin/evolve \
  -H "X-Admin-Token: $ADMIN_PREFLIGHT_TOKEN"
```
Dry-run `{wrote:0, reason:"registry not live"}` until the env above is set; then
it broadcasts one `recordEvolution` per pending citizen and stamps `onChainTier`.

## Notes
- ⬡ Ascension is a HEX SINK only (deflation / floor support) — never an ETH/real-
  money charge. The on-chain write is the PROJECT recording the tier, not the
  holder paying gas.
- Wording: "awakened / anchored / verifiable", never "immutable".

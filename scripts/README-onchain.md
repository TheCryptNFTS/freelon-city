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
curl -X POST "https://www.freeloncity.com/api/admin/anchor/save?key=$ADMIN_SEED_KEY" \
  -H 'content-type: application/json' -d '{"epoch":0}'
```

## Notes
- Between anchors, new work is NOT yet anchored. The verify badge shows
  "verified as of <anchor date>"; a citizen that did work since reads as
  "newer work pending next anchor" (the `current:false` flag) — honest by design.
- Re-anchor on whatever cadence makes sense (weekly, or before a sale push).
- All compute is read-only; the ONLY chain write is `anchor-history.mjs --send`.

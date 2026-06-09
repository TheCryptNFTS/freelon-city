# HEX (⬡) Economy — Red-Team & Soundness Decision Doc

Status: 2026-06-09. Synthesis of two specialist passes (security-redteam + finance-treasury),
both grounded in `/Users/billy/freelon/phase3/freelon-city-site`. Read-only audit — no code changed.

**Headline verdict:** The economy *design* is **sound and deflationary** — ETH is the only
money-in, HEX is internal + non-cashable, sinks vastly out-mass faucets, and the decay gate
binds issuance. BUT there is one **high-severity exploit class**: a tier of real-HEX faucets
fires from an **unauthenticated public GET**, and the sweep faucet has a **double-credit race**.
Fix those before any growth push.

---

## 1. Current HEX model (verified)
- Peg: `HEX_PER_ETH = 100_000` → 1⬡ ≈ $0.035 at ETH $3.5k (`economy-constants.ts:19`).
- Store: `lib/wallet-hex-store.ts` — `creditWalletHex`/`debitWalletHex`, per-wallet, Upstash, append-only events, `withWalletLock`, daily activity/decay gate.
- Rule (holds): ETH-in / HEX-internal / **no withdrawal path** → no real-money leak. Game ledgers sink, never source. Crypt TCG rewards device-local only.
- walletProof correctly enforced on `/api/claim`, `/api/mission/claim`, `/api/city/boost` (all use `requireProvenWallet`, not bare bind).

## 2. Faucet/sink balance — DEFLATIONARY (healthy)
- Realistic active free wallet earns **~15–50⬡/day (~$0.50–$1.75)**.
- Cheapest meaningful sink = deploy-citizen **800⬡** (~16–53 days of saving). Dossier 2500⬡, ascension 2500–20000⬡, art-evolve 5000–30000⬡.
- Sinks are **2–600× daily earn.** Free-farmed HEX can never fuel sustained premium use — by design ("ETH-funded bonus is the real fuel": unlock grants runs×500⬡).
- No unbounded accumulation path found: daily claim hard-capped 10⬡, passive 0.1⬡/citizen/day + 30-day catch-up cap + decay gate (14-day cliff AND rolling 3-active-days/14 minimum).

## 3. Attack paths (ranked by severity)

**[HIGH] A. Unauthenticated faucet trigger.** `GET /api/wallet/[address]/hex` (`route.ts:26`, `:47-51`) takes ANY address, no walletProof, no session, only 30/min rate limit — and invokes `runHolderTick`, `runFloorDefenderTick`, `processSweepsForWallet`, each of which **credits real HEX**. Anyone can trigger crediting for any wallet; a bot can hammer it. Bounded per-day by caps + OpenSea-derived idempotency, so it's "farm-the-cap / griefing," not unbounded mint — *except* where the cap races (B).

**[HIGH] B. Sweep double-credit race.** `lib/sweep-inline.ts:111-128`: the `sweepsToday` cap check is read-modify-write **outside the wallet lock**. Two concurrent `GET .../hex` both read `sweepsToday=0`, both pass the cap, both credit; the unlocked `setWalletHex(after)` at `:128` clobbers concurrent holder-tick/sale writes (last-writer-wins), corrupting counts/cursors. The per-tx SET-NX stops re-crediting the same sale but NOT duplicate cap slots. **The cap is the only thing bounding the drain, and the race defeats the cap.** This is the single most dangerous faucet + the concrete drain path.

**[MED] C. OpenSea event trust.** `sweep-inline.ts:104` + `economy-extras.ts:71` filter by tokenId-in-range (1–4040) but NOT by contract address (the snipe path at `:236` already does). A same-numbered token in another collection could trigger a sweep/sale credit.

**[MED] D. Sybil / multi-wallet.** Sweep/sale/listing/snipe faucets are wallet-keyed but NOT X-gated (only fresh-blood is, `economy-extras.ts:136`). K funded wallets with real NFTs = K× daily caps, no signature.

**[MED] E. Dormant job faucet.** `JOB_SIGNAL_T1/T2/T3` + `JOB_DAILY_CAP` (`economy-constants.ts:117-130`) describe a 250⬡/day/wallet faucet that is currently NOT wired (`job/route.ts:129` passes `signalReward: 0`; `applyJob` never touches the ledger). A latent money-printer waiting on a careless future route.

**[LOW] F. Streak-bonus non-idempotent.** `claim/route.ts:107-118` — milestone bonus rides the atomic daily-claim lock (safe today) but has no idempotency key of its own; any future independent credit path would double-pay.

**No real-HEX leak from games confirmed.** The one-way bridge (games sink, never source) holds. `/api/city/boost` is refund-only after a successful debit — correct.

## 4. What can earn REAL HEX (and how it must stay gated)
Daily claim, mission, quests, reply bounty (X-verified), holder passive tick, sale/listing/snipe/sweep bounties (NFT-ownership gated), fresh-blood (X-gated), ETH-unlock bonus. **All real-HEX credits must (a) require the authenticated owner, (b) be idempotent, (c) respect a per-wallet daily ceiling.**

## 5. What may earn ONLY local/practice points
Crypt TCG match rewards (device-local ⬡ HEX, labeled "(device)"). Any client-side game outcome. **Never** credit real HEX from a client-validated result.

## 6. What can SPEND HEX
Premium agent runs (800–4000⬡), ascension (2500–20000⬡), art evolution (5000–30000⬡), tribute/realign/shop/naming/boosts, Guard-the-Pot (100% burn). All via `debitWalletHex` (fail-closed lock). Sinks are healthy.

## 7. Hard rules — NEVER break
1. All ⬡ movement (credit AND debit) requires `requireProvenWallet` — never bare `bind`.
2. Game ledgers SINK real hex, never SOURCE it. No real-HEX faucet from client-side wins.
3. Every credit path is idempotent (SET-NX / event key) AND inside the wallet lock.
4. HEX is non-cashable to ETH. No withdrawal path. ETH is the only money-in.
5. No real-HEX credit from an unauthenticated request.

## 8. Required event-log model
Append-only per-wallet event log (exists). Every credit carries: `kind`, `amount`, `ts`, and a **unique idempotency key** (`freelon:<faucet>:<addr>:<dedupe>` SET-NX) checked INSIDE `withWalletLock`. Cap counters must be read+incremented inside the same lock as the credit.

## 9. Required walletProof model
`requireProvenWallet(req, address)` (one-time signature, timestamp-bound, cached) gates every credit/debit. Bound-but-unsigned = identity hint only, cannot move HEX (already true on claim/mission/boost — extend to the GET-triggered faucets).

## 10. Hardening backlog → Claude Code tasks (ranked, safest-first)
1. **Sweep cap inside the lock** (`sweep-inline.ts:111-128`): move read→cap-check→credit→increment atomically into `withWalletLock`. Kills race (B). *Highest priority.*
2. **Gate the credit-bearing GET** (`app/api/wallet/[address]/hex/route.ts:47-51`): run holder/sweep/defender ticks ONLY for `requireProvenWallet`-authenticated owner; unauthenticated callers read balance only. Closes (A).
3. **Global per-wallet daily HEX ceiling** (e.g. 300⬡/day) in `economy-constants.ts` as a backstop above all stacked faucets.
4. **Contract-scope OpenSea filters** (`sweep-inline.ts:104`, `economy-extras.ts:71`): assert `ev.nft.contract === CONTRACT`. Closes (C).
5. **Decide dormant job config** (`economy-constants.ts:117-130`): delete it, or if jobs ever pay HEX, route through ceiling (3) + decay gate. Closes (E).
6. **Idempotency key on streak milestone** (`claim/route.ts:107-118`). Closes (F).
7. **X-verify gate on sweep/sale/listing faucets** (mirror fresh-blood) to raise sybil cost (D).

Items 1–2 are the must-fix before any traffic/growth. 3–7 are hardening.

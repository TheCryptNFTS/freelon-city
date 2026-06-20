# Brief for game / token economy pro — FREELON CITY hex

**Founder asks:** the hex economy needs balancing on how much things
cost. Should bring in game experts here.

This brief is what you'd hand a hired hand (or what to read before
hiring one) so they can quote in 30 minutes.

---

## What hex is (the easy answer)

- Off-chain points, not a token. Not transferable wallet→wallet.
  Not redeemable. Not an investment.
- Earned by **activity** (daily claim, sale of a citizen, post, snipe,
  defending bid, etc.).
- Spent by **burning** at sinks (name a citizen, realign civ, post a
  transmission, boost, tithe, shop items, watchlist hits).

Lore frame: hex is the city's gratitude. You did something, the city
paid you in hex. You want something from the city, you give it back.

## What the contract is

ERC-721 at `0xa79e73c9828db3fcd7c77be7d9f356fb684b5504`. 4040 citizens
minted, no further mint, no governance, no upgrade path. Hex is purely
an off-chain reward layer the contract has no knowledge of.

## Current earning rates

| Action | Hex |
|---|---|
| Daily claim (X-verified holders) | +10⬡ |
| 3-day streak bonus | +5⬡ |
| 7-day streak bonus | +10⬡ |
| 30-day streak bonus | +25⬡ |
| Sweep a citizen on OpenSea | +25⬡ |
| 3 sweeps in 24h streak bonus | +100⬡ |
| Verified reply to autopost (first 30 min) | +20⬡ × 2 burst |
| Transmission posted (boosts go to author as royalty) | royalty share |
| Bracket activity / civ war ranking | TBD |

> **REMOVED 2026-06-19 — DO NOT REINTRODUCE.** The entire floor-support /
> dump-deterrent machinery was ripped out: (1) the punitive dump-deterrent —
> ghosting a citizen listed ≤85% of floor (defacing the holder's art as SIGNAL
> LOST) and **burning the seller's HEX** proportional to the discount; (2) the
> "defender" bid-wall — paying HEX + a DEFENDER badge for placing above-floor
> bids (a coordinated price-support campaign); (3) the "snipe / red-signal" board
> — paying HEX to buy listings flagged below floor. All of it is market
> manipulation / price coercion against holders of a freely-tradeable asset and
> was presented as "CITY-VERIFIED" law. The code, constants, APIs, and copy are
> gone. Ordinary participation rewards (claim, sweep, streak, relay, transmission)
> stay; never tie a reward or penalty to whether someone lists/sells below a floor.

## Current sinks (spend rates)

| Sink | Cost |
|---|---|
| Name a citizen | 50⬡ |
| Realign citizen civ | 250⬡ |
| Post a transmission | 100⬡ |
| Boost a transmission | 50-500⬡ |
| Tithe (one-shot civ-aligned gift to wallet) | 100⬡ |
| Watchlist a citizen | 25⬡ |
| Shop items | 50-500⬡ |
| Patrons wall (7-day name post) | 100⬡ |
| Custom title | 250⬡ |

## Current supply / wallets

- 4040 total citizens, ~790 unique holders (most own 1)
- Active wallets tracked: ~500 (those with hex balance > 0)
- Daily claim streakers: small but growing
- Floor: ~0.003 ETH (~$7-8)

## What I (Billy) want from an econ pro

1. **Steady-state model.** If 100 holders claim daily + occasionally
   sweep, how much hex do they accumulate per month? How does that
   compare to the cost of new shop items I want to add at 1000⬡,
   5000⬡, 10000⬡?
2. **Inflation curve.** Total hex in circulation today vs total
   burned. Is the system net-inflating or net-burning? At what rate?
3. **Whale concentration.** With sweep rewards (+25 per buy) the top
   holders compound faster than singles. Is this OK (a city should
   reward its largest contributors) or does it choke out small holders?
4. **Shop pricing ladder.** If I want my 4-tier shop to feel scarce
   at the top, what should the prices be given current earn rates?
5. **New sinks to introduce.** I want sinks to mostly be cosmetic /
   identity (name your citizen, change your hood) NOT pay-to-win
   (skip cooldowns, boost your rank).
6. **Civ-war bonus economy.** The winning civ gets +10% earnings the
   following week. Is that the right multiplier? Should it stack?
7. **Defender bid wall sustainability.** Currently +500 placed +
   +2000 for a 7-day hold. With ~80 carriers needed to make a wall,
   that's potentially 80 × 2500 = 200,000⬡ paid out per cycle. Is
   this sustainable given current earn rates?

## What I do NOT want

- Hex becoming "the token" with secondary market expectations
- Pay-to-win mechanics that let whales rank past small holders
  who play consistently
- Inflation that makes everyone's current balance feel worthless
- Sinks that disadvantage small holders (e.g. "$1000 to get the
  cool variant" when most carriers earn ~10⬡/day)

## What I DO want

- A daily reason to log in
- A 30-day reason to keep holding
- A 6-month reason to compound
- The "city accepts you" tier ladder feels real — i.e. it actually
  takes 6+ months of consistent play to reach DOCTRINE / MONOLITH
  unless you're a whale who also plays consistently

## Comparable systems to look at

- Friend.tech (point system, post-game collapse — what NOT to do)
- Blur points (loyalty + activity, well-designed, predictable cliffs)
- Pudgy Pengus rewards (cosmetic-only, no financial expectation)
- Memeland Stakeland (long horizon, identity-bound)
- Sound.xyz drops (artist-side incentive, not consumer)

## Constraints

- Hobby budget — no human moderators, all programmatic
- Single founder doing dev — favour mechanics that don't require
  ongoing tuning
- Hex must remain off-chain (no token launch — securities risk)
- Holders are NFT-native crypto people who will notice if rates
  change unfairly

---

## Deliverables I'd buy

1. A spreadsheet model: current earn rates × adoption assumptions →
   monthly steady-state hex per active wallet
2. Recommended sink prices for the proposed shop expansion
3. Inflation knob recommendations: what to dial down, what to dial up
4. Two-paragraph "first 30 days vs first 6 months" experience
   narrative for a brand-new carrier — what they should be doing,
   how much hex they should have, what they should be reaching for

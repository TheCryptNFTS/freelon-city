# External cron pinger — sweep-bounty every 30 min on Vercel Hobby

## Why

Vercel Hobby plan caps cron frequency at **once per day**. The
`/api/cron/sweep-bounty` route was designed assuming a 30-min cadence:

- Sweep credits (+25 ⬡ to buyers) should land within 30 min of a sale.
- The 4-hour X autopost pulse gates on a Redis timestamp inside this
  cron — if the cron only fires once daily, the pulse fires at most
  once daily too.
- Trinity rescue detection requires the cron to see the sale event;
  daily cadence means up to a day of latency on rescue payouts.

The Discord report from @Lady Magic (2026-05-24) — "I swept and got no
credit" — was exactly this: sale at 23:50 UTC, next cron at 01:07 UTC
the following day = ~1.3h wait before any credit landed.

## Fix

Run an **external cron** that POSTs to `/api/cron/sweep-bounty` every
30 min with the `Authorization: Bearer $CRON_SECRET` header. The route
already:

- Authenticates the bearer
- Dedupes every sale via `freelon:sweep:event:<tx>:<tokenId>` (30d TTL)
- Dedupes rescues via `freelon:rescue:event:<tx>:<tokenId>` (30d TTL)
- Dedupes autopost per-event via `freelon:autopost:event:<tx>:<id>` (30d)
- Gates the 4h pulse via `freelon:autopost:last` timestamp

So calling it more often than the dedupes is safe — extra calls become
no-ops on already-seen events.

## How

Pick one (cheapest first):

### Option 1 — cron-job.org (free)

1. Sign up at https://cron-job.org
2. Create job:
   - URL: `https://www.freeloncity.com/api/cron/sweep-bounty`
   - Schedule: every 30 min
   - Headers: `Authorization: Bearer <your CRON_SECRET>`
   - Method: `GET`
   - Save

The route returns JSON with `processed`, `pulse`, `receipts`, etc.
cron-job.org will log the response so you can inspect what fired.

### Option 2 — GitHub Actions (free, lives in the repo)

Add `.github/workflows/sweep-bounty.yml`:

```yaml
name: sweep-bounty
on:
  schedule:
    - cron: "*/30 * * * *"  # every 30 min UTC
  workflow_dispatch:
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://www.freeloncity.com/api/cron/sweep-bounty | head -c 500
```

Add `CRON_SECRET` as a repo secret. GitHub Actions has a 5-min minimum
scheduled-cron granularity on the free tier (and the schedule can lag
~5-15 min under load), but it's free and lives next to the code.

### Option 3 — Upstash QStash

Has its own scheduler if you're already on Upstash. Slightly fiddlier
auth setup; only worth it if you want everything in one dashboard.

## What about the daily-signal cron?

Leave it on Vercel's daily cron — it correctly only needs to fire once
a day (it picks the new daily signal at 04:04 UTC).

## What about removing the Vercel sweep-bounty entry?

Keep it. It acts as a safety-net that fires once a day even if the
external pinger is broken. The dedupes mean it's a free no-op on
already-handled events.

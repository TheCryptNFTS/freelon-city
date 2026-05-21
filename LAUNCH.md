# FREELON CITY — Launch Checklist

The build is ready. This file is the runbook for going public. Estimated total: **2–3 hours** of non-coding work, mostly waiting on DNS.

---

## Phase 1 — Domain & mailbox (90 min, mostly waiting)

### 1.1 Register / confirm domain
- Verify ownership of `freeloncity.com`. If not owned: register at Namecheap / Cloudflare / Porkbun. ~$3/yr for `.xyz`.

### 1.2 Email mailbox
The legal docs (`/legal/terms`, `/legal/privacy`, `/legal/dmca`, `/legal/honorary-notice`) reference `contact@freeloncity.com`. Set this up via:

**Option A — Cloudflare Email Routing (free, easiest)**
1. Add `freeloncity.com` to Cloudflare DNS
2. Email → Email Routing → Get started
3. Route `contact@freeloncity.com` → your personal inbox
4. Auto-adds the required MX records

**Option B — Google Workspace ($6/user/mo)**
Real mailbox, calendar, drive. Worth it once volume picks up.

Test: send a message to `contact@freeloncity.com`, confirm it arrives.

### 1.3 X (Twitter) account
- Create or claim `@freeloncity`
- Set profile picture to `/public/social/pfp-1024.png`
- Set banner to `/public/social/banner-1500x500.jpg`
- Bio suggestion:
  ```
  ⬡ 404 — FREELON CITY
  4040 citizens of a Martian civilization built around the missing hex from X.
  The hex didn't disappear. It moved.
  ```
- Pin a tweet: "The hex didn't disappear. It moved. — freeloncity.com"

### 1.4 (Optional) X API access for Daily Signal auto-post
Apply for X Developer Portal access. Free tier is sufficient for one tweet/day.
1. developer.x.com → Sign up
2. Create an app, generate OAuth 1.0a credentials
3. You will get: `API Key`, `API Key Secret`, `Access Token`, `Access Token Secret`
4. Save these for Phase 3 below.

---

## Phase 2 — Vercel deploy (30 min)

### 2.1 Push to a repo
```bash
cd /Users/billy/freelon/phase3/freelon-city-site
git init && git add . && git commit -m "freelon city — initial"
gh repo create freelon-city --public --source=. --push
```

### 2.2 Connect Vercel
1. vercel.com → New Project → Import the GitHub repo
2. Framework preset: Next.js (auto-detected)
3. Build & output settings: default
4. Add environment variables (see 2.3)
5. Deploy

### 2.3 Environment variables

**Required for v1 launch:**
| Var | Value | Purpose |
|---|---|---|
| `OPENSEA_API_KEY` | from opensea.io/account/developer | Live floor / holders / recent sales |

**Optional but recommended (add when ready):**
| Var | Value | Purpose |
|---|---|---|
| `CRON_SECRET` | random 32-char string | Auth for Vercel cron requests |
| `X_API_KEY` | from X dev portal | Daily Signal auto-post |
| `X_API_SECRET` | from X dev portal | Daily Signal auto-post |
| `X_ACCESS_TOKEN` | from X dev portal | Daily Signal auto-post |
| `X_ACCESS_TOKEN_SECRET` | from X dev portal | Daily Signal auto-post |
| `UPSTASH_REDIS_REST_URL` | from upstash.com (free) | Persistent Carrier rank across devices |
| `UPSTASH_REDIS_REST_TOKEN` | from upstash.com | Persistent Carrier rank across devices |
| `NEXT_PUBLIC_SENTRY_DSN` | from sentry.io (free) | Client error monitoring |
| `SENTRY_DSN` | same DSN | Server error monitoring |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | `freeloncity.com` | Privacy-respecting analytics |

Without any of these, the site still works — features degrade gracefully.

### 2.4 Point the domain at Vercel
In Vercel: Project → Settings → Domains → Add `freeloncity.com` and `www.freeloncity.com`.

Vercel will tell you which DNS records to add:

**For root domain `freeloncity.com`:**
- `A` record → `76.76.21.21`

**For `www.freeloncity.com`:**
- `CNAME` → `cname.vercel-dns.com`

Add these at your registrar (or Cloudflare if using their nameservers). Propagation: 5 min – 24 hr.

### 2.5 SSL
Vercel issues a free Let's Encrypt cert automatically once DNS propagates.

---

## Phase 3 — Post-launch polish (do over week 1)

### 3.1 Test the Daily Signal cron
Once `X_*` env vars are set:
```bash
curl https://freeloncity.com/api/cron/daily-signal -H "Authorization: Bearer $CRON_SECRET"
```
Returns `mode: "dry-run"` (no creds) or `mode: "posted"` (success) or `mode: "error"` (debug).

The Vercel cron in `vercel.json` will trigger this daily at 04:04 UTC automatically.

### 3.2 Provision Upstash for Carrier rank
1. upstash.com → Create Redis database (free tier: 10k commands/day, plenty for v1)
2. Region: `us-east-1` or closest to your audience
3. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add to Vercel env, redeploy

Carrier rank now persists per-handle across devices.

### 3.3 Provision Sentry
1. sentry.io → New Project → Next.js
2. Copy the DSN
3. Add `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` (same value) to Vercel env, redeploy

### 3.4 Provision Plausible
1. plausible.io → Add site → `freeloncity.com` (or self-host: github.com/plausible/community-edition)
2. Add `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=freeloncity.com` to Vercel env, redeploy

### 3.5 Real-device QA pass
Hit these on an actual iPhone + actual Android:
- [ ] Tap hamburger nav, navigate through every page
- [ ] Citizen detail page on portrait — does the image area collapse cleanly above the bio?
- [ ] PFP studio — does upload work? Does download work?
- [ ] Carrier rank flow — input → init → relay → balance updates
- [ ] Daily Signal countdown — readable, not wrapping awkwardly
- [ ] Wallet connect — does MetaMask deeplink work? (mobile MetaMask)

### 3.6 Submit sitemap
- Google Search Console → Add property → Submit `https://freeloncity.com/sitemap.xml`
- Bing Webmaster Tools → same
- First crawl appears within 24–72 hr.

---

## Phase 4 — Voice ownership (do on your own time)

Two pieces of content I authored are placeholders for your voice:

### 4.1 Daily Signal lines
File: `lib/daily-signal.ts`
70 lines across 10 civs. Read each one. About 30% feel AI-template. Kill or rewrite those. Your voice, not mine.

### 4.2 39 deep-lore paragraphs
File: `data/deep-lore.json`
One paragraph per honorary + 1-of-1. Each is ~80–120 words. Pass once for:
- factual accuracy about the real person (does the achievement description ring true?)
- voice (does it sound like you, or like me trying to sound like you?)
- punch (the closer lines especially)

---

## Pre-flight checklist

Before you flip DNS:

- [ ] Domain registered
- [ ] `contact@freeloncity.com` mailbox exists + reachable
- [ ] `@freeloncity` X account exists
- [ ] Vercel project connected to repo
- [ ] `OPENSEA_API_KEY` in Vercel env
- [ ] One real-device smoke test
- [ ] You've personally read at least 5 random deep-lore paragraphs and approve

When all 7 are checked → flip DNS.

---

## Day 1 things to watch

| Signal | What it means |
|---|---|
| Daily Signal tweet posts at 04:04 UTC | Cron + X integration working |
| OpenSea Civ War scoreboard populates | OpenSea API key working |
| Carrier rank survives a phone refresh | Upstash working |
| No Sentry errors in first hour | Build is stable |
| Plausible shows traffic | Analytics working |

If any of these fail, the env var is missing or the credential is wrong. The fallback in code keeps the site up.

---

## What's intentionally not in v1

These are Phase 2 — do not block launch on them:

- L2 ETH unlock option (Base)
- Citizen-to-citizen messaging
- Audio identity (10 civ stingers)
- AR hex filter for Instagram
- Email newsletter
- Honoree-side notifications
- Burn-to-merge ritual

Each can be added without changing the contract or the existing pages.

# FREELON CITY — Surface-Area Reduction Audit (one job per page)

Date: 2026-06-09. NOT a polish pass — a **deletion / hide / move** pass. Pro pattern: complex
underneath, ONE obvious next step on screen (Fortnite "PLAY", ChatGPT box, OpenSea "buy"). The
site's systems are real; the UI shows too many at once. Goal: **less surface, one obvious action.**

Grounded in the live render: `/` = 4 sections, `/citizens` = **10 sections** (the worst), `/transmissions` = 5.

Default move when unsure: **remove from main view → behind "Details" / "More" / an advanced page.**
No new features/routes/effects. Don't touch HEX logic, wallet security, agent gen, Crypt TCG.

---

## / (HOMEPAGE)
**One job:** explain the product + get the user to create/see a citizen.
**Currently fights it (rendered order):** IdentityGreeting pill → YourAgentsRail → hero h1+tag →
2 CTAs → "2-minute guide" link → ActivationProof → HeroMarketStat (floor/supply) → How-It-Works
(4 steps) → **"ROLES IT CAN GROW INTO: Writer/Strategist/Sales Agent/Researcher/Designer/Red Team"**
→ CitizenShowcase (citizen strip) → TransformsWall → closing block (3 paragraphs + 2 CTAs +
community links).

| Action | Item |
|---|---|
| **REMOVE** | the **role list** ("Writer/Strategist/Sales Agent/Researcher/Designer/Red Team") — the exact generic-AI wording we flagged; it weakens the pitch. `HeroMarketStat` (floor/supply pill) — market data is not the front door. |
| **MOVE** | community links (Discord/X) → footer only. "2-minute guide" → keep as one small link, not a competing CTA. |
| **COLLAPSE** | TransformsWall + CitizenShowcase → ONE "see what citizens make" preview row (3 examples), not two separate bands. |
| **KEEP above fold** | hero line + subline + the two CTAs. IdentityGreeting/YourAgentsRail only for connected holders (already conditional). |
| **Primary CTA** | Create with a citizen (→ /demo or /citizens). |
| **Secondary CTA** | View the City Archive (→ /transmissions). |
| **Mobile first paint** | hero line + subline + primary CTA. Nothing else above the fold. |
| **5-sec test** | "AI characters you own and create with." Pass only after the role list + floor pill are gone. |

## /citizens (THE WORST — 10 sections, the "piles" page)
**One job:** choose a citizen.
**Currently fights it:** Meet-a-FREELON hero + FindCitizen + TopAgents rail + **The Four (1/1s)** +
**35 Honoraries** + **12 Legendaries** + Browse-all (CitizensBrowser) + PfpSection + a 3-button
"NEXT SIGNAL" footer (Find Your Tribe / Civilizations / The Ledger).

| Action | Item |
|---|---|
| **REMOVE** | the "NEXT SIGNAL" 3-button footer (Tribe/Civilizations/Ledger — all off-job). PfpSection (belongs on a collection/lore page, not the chooser). |
| **MOVE** | The Four / Honoraries / Legendaries showcase rails → a "Notable citizens" tab or the collections/lore page. The chooser shouldn't open with 3 curated showcase bands before the actual list. |
| **COLLAPSE** | TopAgents rail → fold into the top of the browse grid (a "Top trained" sort), not a separate hero rail. |
| **KEEP above fold** | one line ("Choose a citizen") + FindCitizen search + the **browse grid**. |
| **Primary CTA** | (per card) → open the citizen / **Create**. |
| **Secondary CTA** | filter/search (already in CitizensBrowser). |
| **Mobile first paint** | search box + the grid. Not 3 showcase rails first. |
| **Card diet** | each card shows image · name/# · collection · record count · ONE button (CREATE). Everything else → "View details." |
| **5-sec test** | "Pick a citizen." Currently fails — it reads as a lore/showcase page before a chooser. |

## /agent/[id] (AGENT WORKSPACE)
**One job:** create with this citizen.
**Currently fights it:** cockpit density (prior audit) — abilities as cards AND chips, powers, gallery,
work history, stats repeated across 3 columns, render picker buried in an "Image" tab.

| Action | Item |
|---|---|
| **KEEP/ELEVATE** | **"CREATE WITH THIS CITIZEN"** as the one obvious action (surface the render picker; it's currently a sub-tab). The new "Post to City Archive" closes the loop — good. |
| **COLLAPSE** | abilities cards+chips → one representation (prior audit, deferred). Right-rail stats → "Details." |
| **KEEP above fold** | portrait + name + CREATE + composer. |
| **Primary / Secondary CTA** | Create (render/brief) / Share or Post to Archive. |
| **Mobile first paint** | portrait + CREATE. |
| **5-sec test** | "Make something with this character." Close, once Create is the clear hero vs the cockpit. |

## /collections
**One job:** explain the world branches (the 6 collections).
**Likely fights it:** per-collection wallet inventory terminal + stats folded in.
| **KEEP** | the 6-collection explainer (FREELONS=own+train, sisters=talk-to — already fixed). |
| **MOVE** | wallet-inventory terminal → /sync or /wallet (it's holder tooling, not world explanation). |
| **CTA** | Explore FREELONS / See the City Archive. **5-sec test:** "The city has 6 kinds of citizen." |

## /transmissions (CITY ARCHIVE — 5 sections, closest to right)
**One job:** see what citizens made (+ now, publish).
| **KEEP** | the feed (Latest + civ filter) + TransmissionSubmit. |
| **COLLAPSE** | any lore/explainer band above the feed → one line. The feed IS the page. |
| **CTA** | Create yours (→ agent) / filter. **5-sec test:** "A wall of what citizens made." Likely passes; protect it. |

## /dashboard
**One job:** advanced stats ONLY. **Fix:** confirm it's not linked as a newcomer step (already pulled from nav). It's fine being dense — it's the *advanced* page. Don't surface it in the main journey.

## /earn
**One job:** the HEX economy ONLY. **Fix:** keep it off the newcomer path; it's the advanced economy page. No diet needed beyond not promoting it up-funnel.

---

## The locked rule (one job per page)
| Page | One job |
|---|---|
| Homepage | explain the product → create/see a citizen |
| /citizens | choose a citizen |
| /agent/[id] | create with this citizen |
| /transmissions | see what citizens made |
| /collections | explain the world branches |
| /dashboard | advanced stats only |
| /earn | economy only |
| /crypt-tcg | game only |

## Recommended implementation order (one page at a time, deletion not decoration)
1. **/citizens diet** — biggest "ffs"; 10→ ~3 sections (search + grid + slim card). **Start here.**
2. **Homepage diet** — cut role list + floor pill; collapse two citizen bands to one preview.
3. **/agent diet** — elevate CREATE; collapse cockpit.
4. **/transmissions** — protect; trim any explainer band.

Each page: remove/move/collapse per above, verify the 5-second test live (full + mobile), stop.
Do not redesign. Do not add. The win is **70% less on screen, one obvious action visible.**

# `_archive/` — preserved-but-unused components

Components in this directory are **not imported by any rendered code**. They were removed from the homepage spine during the 2026-05-25 compression and the 2026-05-26 dead-code audit. They are preserved here (rather than deleted) as revert switches in case the bare-bones homepage or compressed nav tests as too thin.

**`_archive/` is intentionally prefixed with an underscore** so file-tree views and `find components -name '*.tsx'` sort it to the top/bottom and make it obvious these are not active.

## What's here (15 files, ~1,720 LOC)

| File | Original home | Removed in |
|---|---|---|
| `DoThisNow.tsx` | homepage funnel widget | `71a892e` mythic compression |
| `CityTerminal.tsx` | homepage Bloomberg-style state panel | `71a892e` mythic compression |
| `HoldTheLineBanner.tsx` | homepage urgency banner | `71a892e` mythic compression |
| `GoodValueToSweep.tsx` | homepage red-signal sweep panel | `71a892e` mythic compression |
| `LiveStats.tsx` | hero stats badge | `71a892e` mythic compression |
| `HonoreeStrip.tsx` | hero celeb-pfp grid | `71a892e` mythic compression |
| `FloorPill.tsx` | hero floor + holders + sales pill | `ba6a7c3` Round 1 brutal audit |
| `RecentTransmissions.tsx` | homepage signal feed | Phase 4 compression |
| `CivWarBoard.tsx` | homepage civ-vs-civ matrix | Phase 4 compression |
| `TopPatronsStrip.tsx` | homepage patron strip | Phase 4 compression |
| `BecomeACarrier.tsx` | carrier onboarding CTA | Phase 3 dedup of /start funnel |
| `HexIndexHero.tsx` | hex price hero section | Phase 3 dedup of CityTerminal panel |
| `AlertsFeed.tsx` | live alerts marquee | Phase 3 dedup of CityFeedTicker |
| `DailySignal.tsx` | daily quote panel | Phase 3 dedup of CityTerminal panel |
| `CitizenOfDay.tsx` | featured citizen card | Phase 3 low-frequency moment |

## How to restore one

1. `git mv components/_archive/<Foo>.tsx components/<Foo>.tsx`
2. Re-add the import at the top of `app/page.tsx`
3. Uncomment the relevant `{/* <Foo /> */}` block (or write a fresh JSX line if the comment block has since been pruned)
4. Verify the component's data sources (lib/* imports) still exist — some upstream functions may have been deleted alongside their consumers

## How to permanently delete one

If after 30+ days of community feedback the compressed direction holds and you're confident a component will never come back:

```
rm components/_archive/<Foo>.tsx
```

That's it. They're tree-shaken from the bundle today; deletion is purely repo hygiene.

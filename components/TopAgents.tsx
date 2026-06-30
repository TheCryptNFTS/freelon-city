/**
 * Public showcase rail — the city's most-trained agents, rendered as mini
 * résumés. Async server component (baked into the cached /citizens HTML, visible
 * to logged-out buyers). Empty until citizens specialize → shows a claim hook.
 */
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { topTrainedAgents } from "@/lib/top-agents";
import { getCitizen, civilizationColor } from "@/lib/citizens";
import { gridImageUrl } from "@/lib/constants";

// PERF 2026-06-11 — /citizens declares revalidate=300 (ISR) but was building
// as ƒ Dynamic: the Upstash reads here (`cache: "no-store"` REST fetches)
// silently opted the whole route into per-request rendering, and Lighthouse
// measured TTFB 1,134ms (2.5× every other route). Caching the reads with
// unstable_cache (same pattern as CityWeekBand) takes the no-store fetches
// out of the render path so the route prerenders again. 300s matches the
// page's own revalidate — the rail is a showcase, not a live scoreboard.
// NOTE: unstable_cache JSON-serializes its return value, so the activated-ids
// Set crosses the cache boundary as an array and is rebuilt below.
const getTopAgentsData = unstable_cache(
  async (limit: number) => {
    const agents = await topTrainedAgents(limit).catch(() => []);
    // "Awakened" glow on activated agents — one cheap fail-quiet set fetch.
    const { listActivatedTokenIds } = await import("@/lib/missions/unlock-store");
    const activated = await listActivatedTokenIds().catch(() => new Set<number>());
    return { agents, activatedIdList: [...activated] };
  },
  ["top-agents-rail", "v1"],
  { revalidate: 300 },
);

export async function TopAgents({ limit = 8 }: { limit?: number }) {
  const { agents, activatedIdList } = await getTopAgentsData(limit);
  const activatedIds = new Set<number>(activatedIdList);

  return (
    <section className="citizens-section reveal topagents">
      <header className="sec-head">
        <span className="kicker">⬡ TOP AGENTS · MOST TRAINED</span>
        <h2>What they&apos;re <em>becoming</em></h2>
      </header>

      {agents.length === 0 ? (
        <p className="topagents-empty">
          No agent has specialized yet — train a citizen and claim the top of the wall.{" "}
          <Link href="/demo">See an agent →</Link>
        </p>
      ) : (
        <div className="topagents-grid">
          {agents.map((a) => {
            const c = getCitizen(a.tokenId);
            const color = civilizationColor(c?.civilization ?? "");
            const id4 = a.tokenId.toString().padStart(4, "0");
            const sub = a.tunedFor ? `tuned for ${a.tunedFor}` : a.trackRecord;
            const activated = activatedIds.has(a.tokenId);
            return (
              <Link
                key={a.tokenId}
                href={`/citizens/${a.tokenId}`}
                className={`topagent-card${activated ? " is-activated" : ""}`}
                style={{ ["--civ" as string]: color }}
              >
                <div className="img-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gridImageUrl(a.tokenId)} alt={c?.name ?? `#${id4}`} loading="lazy" />
                  {activated && <span className="cc-awakened" aria-label="Activated agent">⬡</span>}
                </div>
                <div className="meta">
                  <span className="id">#{id4}{a.demo && <span className="ta-demo"> · EXAMPLE</span>}</span>
                  <span className="ta-class">LV {a.level} · {a.className.toUpperCase()}</span>
                  <span className="ta-rank">{a.rankLabel.toUpperCase()}</span>
                  {sub && <span className="ta-tuned">{sub}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

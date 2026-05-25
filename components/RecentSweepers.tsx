/**
 * <RecentSweepers /> — "who just bought multiple citizens" panel on
 * /hold-the-line.
 *
 * Defender bids (existing leaderboard) and sweeps are DIFFERENT actions:
 *   - Defender: places a WETH offer ≥1.4× floor, hoping someone takes it
 *   - Sweeper:  hits the Buy button on listings at/near floor
 *
 * Both defend the floor in different ways. Holders are doing one or the
 * other, sometimes both. This panel surfaces the sweepers so they get
 * the same visible credit as defenders.
 *
 * Window: trailing 4h. Matches the sales-pulse + sweep-burst cadence so
 * what's posted to X also shows up here.
 *
 * Server component. Fetches via getTopSweepers(); no client JS needed.
 */
import Link from "next/link";
import { getTopSweepers, type SweeperRow } from "@/lib/sweeper-store";
import { imageUrl } from "@/lib/constants";

function trimEth(n: number): string {
  return parseFloat(n.toFixed(3)).toString();
}
function shortAddr(a: string): string {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}
function timeAgo(tsSec: number): string {
  const sec = Math.floor(Date.now() / 1000 - tsSec);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export async function RecentSweepers() {
  let rows: SweeperRow[] = [];
  try {
    rows = await getTopSweepers({ windowHours: 4, limit: 10 });
  } catch {
    return null;
  }
  if (rows.length === 0) {
    return (
      <section style={{ marginBottom: "var(--s-6)" }}>
        <span className="kicker">⬡ RECENT SWEEPERS · LAST 4H</span>
        <p
          style={{
            marginTop: "var(--s-2)",
            padding: "var(--s-4)",
            border: "1px dashed var(--line-2)",
            borderRadius: 12,
            fontFamily: "var(--mono2)",
            fontSize: 12,
            color: "var(--ink-dim)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          The floor is still. No sweeps in the last 4 hours.
        </p>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: "var(--s-6)" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
        <span className="kicker">⬡ RECENT SWEEPERS · LAST 4H</span>
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
          }}
        >
          BUYERS WHO CARRIED THE FLOOR
        </span>
      </header>

      <ol
        className="ui-table-stack"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {rows.map((r, i) => (
          <li
            key={r.wallet}
            className="ui-table-stack__row"
            style={{ ["--row-cols" as string]: "32px 1fr 1fr 90px 80px" }}
          >
            <span
              className="ui-table-stack__cell ui-table-stack__cell--rank"
              style={{ fontWeight: 700 }}
            >
              <span className="ui-table-stack__label">Rank</span>
              {String(i + 1).padStart(2, "0")}
            </span>
            <Link
              href={`/wallet/${r.wallet}`}
              className="ui-table-stack__cell"
              style={{ color: "var(--ink)", textDecoration: "none", fontFamily: "var(--mono2)", fontSize: 13 }}
            >
              <span className="ui-table-stack__label">Wallet</span>
              {shortAddr(r.wallet)}
            </Link>
            <span
              className="ui-table-stack__cell"
              style={{ display: "flex", gap: 4, alignItems: "center" }}
              aria-label={`Recent sweeps: ${r.tokenIds.map((t) => `#${t}`).join(", ")}`}
            >
              <span className="ui-table-stack__label">Recent</span>
              {r.tokenIds.slice(0, 5).map((tid) => (
                <Link key={tid} href={`/citizens/${tid}`} title={`Citizen #${String(tid).padStart(4, "0")}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(tid)}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    style={{ width: 32, height: 32, objectFit: "cover", border: "1px solid var(--line)", borderRadius: 4, display: "block" }}
                  />
                </Link>
              ))}
              {r.tokenIds.length > 5 && (
                <span style={{ fontFamily: "var(--mono2)", fontSize: 11, color: "var(--ink-dim)", marginLeft: 4 }}>
                  +{r.tokenIds.length - 5}
                </span>
              )}
            </span>
            <span className="ui-table-stack__cell ui-table-stack__cell--num">
              <span className="ui-table-stack__label">Swept</span>
              <strong style={{ color: "var(--gold)", fontFamily: "var(--display)", fontSize: 18 }}>{r.count}</strong>
              <span style={{ color: "var(--ink-dim)", marginLeft: 2, fontSize: 11 }}>·{trimEth(r.volEth)}Ξ</span>
            </span>
            <span className="ui-table-stack__cell ui-table-stack__cell--num">
              <span className="ui-table-stack__label">When</span>
              {timeAgo(r.lastTs)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

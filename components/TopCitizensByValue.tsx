/**
 * <TopCitizensByValue /> — dashboard panel showing the top 10 citizens
 * by computed value (sale × rarity × accumulated hex × hold time).
 *
 * Server component. Fetches floor from OpenSea once, then asks the
 * citizen-value store to compute & sort. Reads via a single Upstash
 * pipeline (one round trip for all 4040 token stats). Whole render
 * is <500ms typical.
 *
 * Caches via Next's `revalidate` at the route, not here — this is
 * called inline from the dashboard server render.
 */
import Link from "next/link";
import { imageUrl, CIVILIZATIONS } from "@/lib/constants";
import { getTopCitizensByValue } from "@/lib/citizen-value-store";

async function fetchFloor(): Promise<number> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) return 0.003;
  try {
    const r = await fetch(
      "https://api.opensea.io/api/v2/collections/freelons/stats",
      { headers: { "X-API-KEY": apiKey, accept: "application/json" }, next: { revalidate: 300 } },
    );
    if (!r.ok) return 0.003;
    const d = (await r.json()) as { total?: { floor_price?: number } };
    return Number(d?.total?.floor_price || 0.003);
  } catch {
    return 0.003;
  }
}

export async function TopCitizensByValue() {
  const floor = await fetchFloor();
  let top: Awaited<ReturnType<typeof getTopCitizensByValue>> = [];
  try {
    top = await getTopCitizensByValue(10, floor);
  } catch {
    return null; // store unreachable — render nothing rather than a broken card
  }
  if (top.length === 0) return null;

  return (
    <section
      style={{
        margin: "var(--s-5) auto",
        maxWidth: "var(--maxw)",
        padding: "var(--s-4) var(--pad)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "var(--s-3)",
        }}
      >
        <span className="kicker" style={{ color: "var(--gold)" }}>
          ⬡ TOP CITIZENS · BY COMPUTED VALUE
        </span>
        <span
          style={{
            fontFamily: "var(--mono2)",
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
          }}
        >
          SALE × RARITY × HEX × HELD
        </span>
      </header>

      <ol
        className="ui-table-stack"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {top.map((cit, i) => {
          const civ = (CIVILIZATIONS as Record<string, { name: string; color: string }>)[cit.civ];
          const color = civ?.color ?? "var(--gold)";
          const id4 = cit.id.toString().padStart(4, "0");
          return (
            <li
              key={cit.id}
              className="ui-table-stack__row"
              style={{ ["--row-cols" as string]: "44px 56px 1fr 120px 100px" }}
            >
              <span
                className="ui-table-stack__cell ui-table-stack__cell--rank"
                style={{ fontWeight: 700 }}
              >
                <span className="ui-table-stack__label">Rank</span>
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link
                href={`/citizens/${cit.id}`}
                className="ui-table-stack__cell"
                aria-label={`Citizen #${id4}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(cit.id)}
                  alt=""
                  width={48}
                  height={48}
                  loading="lazy"
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    border: `1px solid ${color}55`,
                    borderRadius: 6,
                    display: "block",
                  }}
                />
              </Link>
              <Link
                href={`/citizens/${cit.id}`}
                className="ui-table-stack__cell"
                style={{ color: "var(--ink)", textDecoration: "none", fontFamily: "var(--display)", fontSize: 16, letterSpacing: "-0.005em" }}
              >
                <span className="ui-table-stack__label">Citizen</span>
                #{id4}
                <span style={{ color, marginLeft: 10, fontFamily: "var(--mono2)", fontSize: 11, letterSpacing: "0.18em" }}>
                  {civ?.name?.toUpperCase()}
                </span>
              </Link>
              <span className="ui-table-stack__cell ui-table-stack__cell--num">
                <span className="ui-table-stack__label">Value</span>
                <strong style={{ color, fontFamily: "var(--display)", fontSize: 20 }}>
                  {cit.value}
                </strong>
                <span style={{ color: "var(--ink-dim)", marginLeft: 4 }}>/1000</span>
              </span>
              <span className="ui-table-stack__cell ui-table-stack__cell--num">
                <span className="ui-table-stack__label">Hex</span>
                {cit.hex.toLocaleString()} ⬡
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

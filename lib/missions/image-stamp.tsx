/**
 * House-look plate + provenance stamp for generated images. Kept in its own .tsx
 * so the main image-gen module stays plain .ts (importable from vitest/tests
 * without a JSX transform). Uses next/og (already a dep) to composite the render
 * full-bleed under the FREELON CITY "house look":
 *
 *   • a civ-colour SPINE BAR down the left edge (data-keyed signature),
 *   • cinematic top/bottom scrims,
 *   • a ⬡ seal + FC-ARCHIVE provenance line (top-left) tying the render to a
 *     real token (civ stamp + id + doctrine + render date),
 *   • a burned-in DOG-TAG (bottom-left): FREELON CITY · CITIZEN #N · DOCTRINE ·
 *     TIER — the copier-trap: copy the format with no token data and it reads
 *     blank, so theft = a free FREELON ad,
 *   • a gold domain pill (bottom-right) — the link-back / share mark,
 *   • a gold hairline border for apex tiers (Legendary / 1-of-1 / Honorary).
 *
 * Fail-soft: returns the original bytes if compositing throws, so a stamp hiccup
 * never costs the holder their render.
 */

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

/** Optional per-render provenance — supplied by the caller (image-gen) which has
 *  the citizen + CIVILIZATIONS data. Absent fields degrade gracefully (e.g.
 *  sister collections pass only `collectionName`). */
export type StampMeta = {
  /** Civilization display name, e.g. "Purple Oracle". */
  civName?: string;
  /** Doctrine, e.g. "Oracle" / "Void/404". */
  doctrine?: string;
  /** Tier string, e.g. "Legendary", "One of One", "Common". */
  tier?: string;
  /** Archive code, e.g. "PUR.520-2268" (civ stamp + padded id). */
  archiveCode?: string;
  /** Civ canonical colour hex for the spine bar, e.g. "#B85CFF". */
  color?: string;
  /** Collection display name for non-FREELONS sisters, e.g. "OOGIES". */
  collectionName?: string;
};

const GOLD = "#E9C984";
const SILVER = "#C9CDD6";

export async function stampSignature(
  pngBytes: Buffer,
  tokenId: number,
  meta: StampMeta = {},
): Promise<Buffer> {
  try {
    const { ImageResponse } = await import("next/og");
    const dataUri = `data:image/png;base64,${pngBytes.toString("base64")}`;

    const spine = meta.color || GOLD;
    const tierLow = (meta.tier || "").toLowerCase();
    const isApex =
      tierLow.includes("legendary") ||
      tierLow.includes("one of one") ||
      tierLow.includes("honorary");

    // Dog-tag (bottom-left): the copier-trap. CITIZEN # for FREELONS, the
    // collection name for sisters, plus doctrine + tier when known.
    const subject = meta.civName
      ? `CITIZEN #${id4(tokenId)}`
      : meta.collectionName
        ? `${meta.collectionName.toUpperCase()} #${id4(tokenId)}`
        : `#${id4(tokenId)}`;
    const dogParts = [subject];
    if (meta.doctrine) dogParts.push(meta.doctrine.toUpperCase());
    if (meta.tier) dogParts.push(meta.tier.toUpperCase());
    const dogTag = `FREELON CITY · ${dogParts.join(" · ")}`;

    // FC-ARCHIVE provenance line (top-left) — ties the render to a real token.
    const rec = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const code = meta.archiveCode || `#${id4(tokenId)}`;
    const archiveLine = `FC-ARCHIVE · ${code}${meta.doctrine ? ` · ${meta.doctrine.toUpperCase()}` : ""} · REC ${rec}`;

    const res = new ImageResponse(
      (
        <div style={{ display: "flex", width: "1024px", height: "1024px", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUri} width={1024} height={1024} alt="" style={{ width: "1024px", height: "1024px" }} />

          {/* civ-colour spine bar — the data-keyed signature down the left edge */}
          <div style={{ position: "absolute", left: 0, top: 0, width: "10px", height: "1024px", background: spine, display: "flex" }} />

          {/* cinematic scrims so the burned-in text stays legible over any art */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "1024px", height: "120px", background: "linear-gradient(180deg, rgba(8,8,10,0.82) 0%, rgba(8,8,10,0) 100%)", display: "flex" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: "1024px", height: "160px", background: "linear-gradient(0deg, rgba(8,8,10,0.92) 0%, rgba(8,8,10,0) 100%)", display: "flex" }} />

          {/* apex-tier gold hairline border */}
          {isApex && (
            <div style={{ position: "absolute", top: "8px", left: "8px", width: "1004px", height: "1004px", border: "2px solid rgba(233,201,132,0.55)", display: "flex" }} />
          )}

          {/* top-left: ⬡ seal + FC-ARCHIVE provenance line */}
          <div style={{ position: "absolute", top: "24px", left: "28px", display: "flex", alignItems: "center" }}>
            <span style={{ color: GOLD, fontSize: isApex ? "36px" : "30px", marginRight: "12px" }}>⬡</span>
            <span style={{ color: SILVER, fontSize: "18px", letterSpacing: "0.10em" }}>{archiveLine}</span>
          </div>

          {/* bottom-left: the burned-in dog-tag (copier-trap) */}
          <div style={{ position: "absolute", bottom: "30px", left: "30px", display: "flex" }}>
            <span style={{ color: SILVER, fontSize: "22px", letterSpacing: "0.12em", fontWeight: 600 }}>{dogTag}</span>
          </div>

          {/* bottom-right: gold domain pill — the link-back / share mark */}
          <div
            style={{
              position: "absolute", bottom: "26px", right: "28px", display: "flex",
              alignItems: "center", padding: "8px 16px", borderRadius: "999px",
              background: "rgba(8,8,10,0.62)", border: "1px solid rgba(200,170,100,0.5)",
              color: GOLD, fontSize: "20px", letterSpacing: "0.06em", fontWeight: 600,
            }}
          >
            ⬡ FREELONCITY.COM
          </div>
        </div>
      ),
      { width: 1024, height: 1024 },
    );
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return pngBytes; // unstamped beats failed
  }
}

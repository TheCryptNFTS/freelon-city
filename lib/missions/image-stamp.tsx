/**
 * Brand-signature stamp for generated images. Kept in its own .tsx so the main
 * image-gen module stays plain .ts (importable from vitest/tests without a JSX
 * transform). Uses next/og (already a dep) to composite the image full-bleed + a
 * corner mark. Fail-soft: returns the original bytes if compositing throws, so a
 * stamp hiccup never costs the holder their render.
 */

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function stampSignature(pngBytes: Buffer, tokenId: number): Promise<Buffer> {
  try {
    const { ImageResponse } = await import("next/og");
    const dataUri = `data:image/png;base64,${pngBytes.toString("base64")}`;
    const res = new ImageResponse(
      (
        <div style={{ display: "flex", width: "1024px", height: "1024px", position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUri} width={1024} height={1024} alt="" style={{ width: "1024px", height: "1024px" }} />
          <div
            style={{
              position: "absolute", bottom: "22px", right: "26px", display: "flex",
              alignItems: "center", padding: "8px 16px", borderRadius: "999px",
              background: "rgba(8,8,10,0.62)", border: "1px solid rgba(200,170,100,0.5)",
              color: "#E9C984", fontSize: "22px", letterSpacing: "0.06em", fontWeight: 600,
            }}
          >
            {`⬡ MADE BY FREELON #${id4(tokenId)} · FREELONCITY.COM`}
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

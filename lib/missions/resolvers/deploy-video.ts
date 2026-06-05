/**
 * "Deploy Video" resolver — a HEX-priced premium that animates the citizen into a
 * short branded clip. Input is a server-allowlisted motion-style KEY (no free
 * prompt). Output is an mp4 on Vercel Blob; meta.kind:"video" so the endpoint logs
 * it as a video and the UI renders a <video>. Ships keyless-safe: with no provider
 * configured the holder sees a clean "coming soon", and (importantly) the mission
 * route refunds the HEX because the resolver returns ok:false.
 */

import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { generateCitizenVideo, isValidVideoStyle, VIDEO_STYLES } from "@/lib/missions/video-gen";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function deployVideoResolver(ctx: MissionContext): Promise<MissionOutput> {
  const styleKey = ctx.input.trim();
  if (!styleKey || !isValidVideoStyle(styleKey)) {
    return {
      ok: false,
      title: "Pick a motion",
      body: "",
      error: `Choose a motion: ${Object.keys(VIDEO_STYLES).join(", ")}.`,
    };
  }

  const result = await generateCitizenVideo({ citizen: ctx.citizen, styleKey });

  if (!result.ok) {
    if (result.error !== "no_video_provider") {
      import("@/lib/missions/ops-log")
        .then((m) => m.recordError(`deploy-video:${styleKey}`, new Error(result.error), { tokenId: ctx.citizen.id }))
        .catch(() => {});
    }
    return {
      ok: false,
      title: "Video unavailable",
      body: "",
      error:
        result.error === "no_video_provider"
          ? "Video is coming soon — not switched on yet. Nothing was charged."
          : result.error === "timeout"
          ? "The render timed out — nothing was charged. Try again."
          : "The clip could not be created right now — try again shortly.",
    };
  }

  const style = VIDEO_STYLES[styleKey];
  const name = ctx.citizen.transmission_name || ctx.citizen.honoree || `Citizen #${id4(ctx.citizen.id)}`;
  return {
    ok: true,
    title: `${name} · ${style.label}`,
    body: result.url, // mp4 URL — UI renders <video src=…>
    meta: {
      kind: "video",
      videoUrl: result.url,
      style: styleKey,
      styleLabel: style.label,
      focus: styleKey,
      level: ctx.progress.level,
    },
  };
}

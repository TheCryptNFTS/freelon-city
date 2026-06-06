/**
 * "Group Transform" resolver — render TWO citizens YOU OWN together in one branded
 * style image. The visual "hold more than one" product. Owned-only (verifies you
 * hold the partner), premium-priced + unlock-gated like deploy-citizen. A failed
 * ownership/render returns ok:false → the mission route refunds the ⬡.
 *
 * Input format: "<partnerTokenId> <styleKey>"  e.g. "404 transformers-robot"
 */

import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { generateCrewTransform, isValidStyle, STYLES } from "@/lib/missions/image-gen";
import { getCitizen } from "@/lib/citizens";
import { verifyOwnership } from "@/lib/owner-of";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

export async function deployCrewResolver(ctx: MissionContext): Promise<MissionOutput> {
  const raw = ctx.input.trim();
  const m = raw.match(/^#?(\d{1,4})\b\s*([\s\S]*)$/);
  if (!m) {
    return { ok: false, title: "Name your crew partner", body: "", error: "Start with the partner FREELON's token number, then the style — e.g. \"404 transformers-robot\"." };
  }
  const otherId = parseInt(m[1], 10);
  const styleKey = m[2].trim();
  if (otherId < 1 || otherId > 4040) {
    return { ok: false, title: "Invalid citizen", body: "", error: "That token number isn't 1–4040." };
  }
  if (otherId === ctx.citizen.id) {
    return { ok: false, title: "Need a different citizen", body: "", error: "A group transform needs two — name another FREELON you own." };
  }
  if (!styleKey || !isValidStyle(styleKey)) {
    return { ok: false, title: "Pick a style", body: "", error: `Choose a style: ${Object.keys(STYLES).join(", ")}.` };
  }
  const other = getCitizen(otherId);
  if (!other) {
    return { ok: false, title: "Citizen not found", body: "", error: "Couldn't find that citizen." };
  }

  // OWNED-ONLY: the partner must be a FREELON you hold (the route already verified
  // the primary). A failed/unknown check returns ok:false → the route refunds the
  // ⬡, so a blocked transform costs nothing. Admin/test runs (no real wallet) skip.
  if (/^0x[a-f0-9]{40}$/.test((ctx.walletAddress || "").toLowerCase())) {
    const v = await verifyOwnership(otherId, ctx.walletAddress);
    if (v.status === "not-owner") {
      return { ok: false, title: "Crew must be yours", body: "", error: `A group transform is FREELONs you own — you don't hold #${id4(otherId)}.` };
    }
    if (v.status !== "owner") {
      return { ok: false, title: "Couldn't verify your crew", body: "", error: `Couldn't confirm you own #${id4(otherId)} right now — your ⬡ was not charged. Try again.` };
    }
  }

  const result = await generateCrewTransform({ citizenA: ctx.citizen, citizenB: other, styleKey });
  if (!result.ok) {
    import("@/lib/missions/ops-log")
      .then((mod) => mod.recordError(`deploy-crew:${styleKey}`, new Error(result.error || "unknown"), { tokenId: ctx.citizen.id }))
      .catch(() => {});
    return {
      ok: false,
      title: "Group transform failed",
      body: "",
      error:
        result.error === "timeout"
          ? "The render timed out — your ⬡ was not charged. Try again."
          : `The render didn't complete (${result.error || "unknown"}) — your ⬡ was not charged. Try again shortly.`,
    };
  }

  const label = STYLES[styleKey].label;
  const name = ctx.citizen.transmission_name || ctx.citizen.honoree || `Citizen #${id4(ctx.citizen.id)}`;
  const otherName = other.transmission_name || other.honoree || `Citizen #${id4(other.id)}`;
  return {
    ok: true,
    title: `${name} × ${otherName} · ${label}`,
    body: result.url,
    meta: {
      kind: "image",
      imageUrl: result.url,
      scene: styleKey,
      sceneLabel: label,
      focus: `crew:${styleKey}`,
      withCitizen: otherId,
      level: ctx.progress.level,
    },
  };
}

/**
 * REAL consult resolver — the citizen reasons as itself.
 *
 * This is what turns a stat sheet into an agent: it builds the citizen's persona
 * from its real identity + civ + class + level + memory (persona.ts), sends the
 * holder's question to the model in the isolated user role (llm.ts), and returns
 * the citizen's in-character answer. Generic over any citizen → every one of the
 * 4040 becomes a real agent by construction.
 *
 * Failure (no key, timeout, empty, API error) → ok:false → endpoint refunds.
 */

import type { MissionContext, MissionOutput } from "@/lib/missions/types";
import { buildPersona } from "@/lib/missions/persona";
import { citizenReason } from "@/lib/missions/llm";

function id4(n: number): string {
  return n.toString().padStart(4, "0");
}

const FOCUS_STOP = new Set([
  "what", "should", "would", "could", "about", "there", "their", "where", "which",
  "this", "that", "with", "from", "have", "does", "your", "into", "when", "they",
  "tell", "give", "explain", "think", "going", "doing", "want", "need", "civilization",
  "signal", "citizen", "freelon", "city",
]);

/** Pull a salient subject token from the question to seed the citizen's focus
 *  (the longest non-stopword word). Coarse but real — repeated subjects accrue
 *  into "tuned for X". */
function extractFocus(q: string): string | undefined {
  const words = q.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];
  const candidates = words.filter((w) => !FOCUS_STOP.has(w)).sort((a, b) => b.length - a.length);
  return candidates[0];
}

export async function consultResolver(ctx: MissionContext): Promise<MissionOutput> {
  const question = ctx.input.trim();
  if (!question) {
    return { ok: false, title: "No question", body: "", error: "Ask the citizen something." };
  }

  const { system, maxTokens, classLabel } = buildPersona(ctx.citizen, ctx.progress);

  const result = await citizenReason({ system, user: question, maxTokens });
  if (!result.ok) {
    // Surface a clean, in-world failure; endpoint refunds the burn.
    return {
      ok: false,
      title: "Signal lost",
      body: "",
      error:
        result.error === "timeout"
          ? "The citizen's transmission timed out — your ⬡ was refunded. Try again."
          : "The citizen could not be reached — your ⬡ was refunded.",
    };
  }

  const name = ctx.citizen.transmission_name || ctx.citizen.honoree || `Citizen #${id4(ctx.citizen.id)}`;
  return {
    ok: true,
    title: `${name} · ${classLabel} · Lvl ${ctx.progress.level}`,
    body: result.text,
    meta: {
      question,
      focus: extractFocus(question),
      level: ctx.progress.level,
      promptTokens: result.usage?.prompt,
      completionTokens: result.usage?.completion,
    },
  };
}

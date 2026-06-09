/**
 * Thin LLM client for citizen "agent" missions. No SDK — a single fetch to the
 * OpenAI chat API, with the guardrails the security review demanded:
 *   - persona/system prompt is SERVER-controlled; user input goes ONLY in the
 *     user role (never interpolated into the system prompt) — prompt-injection
 *     defense.
 *   - hard output cap (max_tokens) so a crafted input can't run up cost.
 *   - bounded timeout + clean error → caller returns ok:false → endpoint refunds.
 *
 * This is what makes a citizen a real agent rather than a template: the model
 * reasons FROM the citizen's own persistent identity + memory, so two citizens
 * (or the same citizen at different levels) genuinely produce different output.
 */

// OpenRouter ONLY. All chat (and all images, see image-gen.ts) route through
// OpenRouter — one OpenAI-compatible API that exposes many models by name. We
// do NOT fall back to direct OpenAI: that account is billing-capped, so a
// fallback only produces billing_hard_limit_reached errors. Model NAMES come
// from lib/missions/models.ts. Returns no key → caller returns no_api_key.
function provider(): { url: string; key: string | undefined } {
  return { url: "https://openrouter.ai/api/v1/chat/completions", key: process.env.OPENROUTER_API_KEY };
}
const DEFAULT_MODEL = "openai/gpt-4o-mini";

export type LlmResult =
  | { ok: true; text: string; usage?: { prompt: number; completion: number } }
  | { ok: false; error: string };

// Hard ceiling on agent output length. Clamps every run (paid or free) so no
// response can balloon into a wall of text — keeps outputs tight and bounds
// generation latency + token cost. Adjust to taste.
const OUTPUT_TOKEN_CEILING = 900;

export async function citizenReason(args: {
  system: string;
  user: string;
  maxTokens: number;
  /** Model id (from lib/missions/models.ts modelFor()). Defaults to cheap. */
  model?: string;
  timeoutMs?: number;
}): Promise<LlmResult> {
  const { url, key } = provider();
  if (!key) return { ok: false, error: "no_api_key" };

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), args.timeoutMs ?? 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://www.freeloncity.com",
        "X-Title": "FREELON CITY",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: args.model || DEFAULT_MODEL,
        // System = server-authored persona. User = the holder's prompt, isolated.
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        max_tokens: Math.min(args.maxTokens, OUTPUT_TOKEN_CEILING),
        temperature: 0.8,
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `openrouter_${res.status}:${(await res.text().catch(() => "")).slice(0, 100)}` };
    }
    const j = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = j.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, error: "empty_completion" };
    return {
      ok: true,
      text,
      usage: { prompt: j.usage?.prompt_tokens ?? 0, completion: j.usage?.completion_tokens ?? 0 },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).name === "AbortError" ? "timeout" : "fetch_failed" };
  } finally {
    clearTimeout(t);
  }
}

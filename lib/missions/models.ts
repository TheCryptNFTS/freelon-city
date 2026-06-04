/**
 * Central agent-model config. ONE place that decides which LLM each kind of
 * agent task uses, so we never hardcode a model name across the codebase.
 *
 * Tiers:
 *   - PREMIUM: the good, expensive model — used ONLY for work people pay for
 *     (deep consults, strategy missions, the flagship "Fix My Launch"). Set
 *     AGENT_MODEL_PREMIUM in env to your account's best model (e.g. "gpt-5.5"
 *     when/if available). Defaults to a known-good model so nothing 404s if it
 *     isn't set.
 *   - CHEAP: the fast/cheap model — daily check-ins, focus extraction, short
 *     flavour text. Never burn the premium model on background tasks.
 *
 * Both names come from env so you can swap models WITHOUT a code change.
 */

// Known-good defaults (these exist today). Override via env to upgrade.
const PREMIUM = process.env.AGENT_MODEL_PREMIUM || "gpt-4o";
const CHEAP = process.env.AGENT_MODEL_CHEAP || "gpt-4o-mini";

/** Logical task kinds → which tier they run on. */
export type AgentTask =
  | "dailyCheckIn"
  | "focusExtraction"
  | "basicConsult"
  | "deepConsult"
  | "strategyMission";

const TASK_TIER: Record<AgentTask, "premium" | "cheap"> = {
  dailyCheckIn: "cheap",
  focusExtraction: "cheap",
  basicConsult: "cheap", // start cheap; bump to premium if quality demands
  deepConsult: "premium",
  strategyMission: "premium",
};

/** The model string for a given task. */
export function modelFor(task: AgentTask): string {
  return TASK_TIER[task] === "premium" ? PREMIUM : CHEAP;
}

/** Exposed for diagnostics / an admin view. */
export const MODELS = { premium: PREMIUM, cheap: CHEAP } as const;

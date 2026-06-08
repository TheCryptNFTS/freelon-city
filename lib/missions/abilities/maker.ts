/**
 * CONTENT AGENT — writes for the holder in the citizen's own voice: X posts,
 * copy, threads, captions, content plans. The everyday money-work agent.
 * Cheap model tier (high volume, light reasoning).
 */
import { type Ability, GUARDRAILS } from "@/lib/missions/abilities/ability";

export const CONTENT: Ability = {
  id: "content",
  label: "Broadcast",
  blurb: "Writes X posts, captions, copy, threads & content plans in your voice.",
  instruction:
    "You are the holder's content writer. Produce finished, ready-to-paste content — punchy, " +
    "specific, hook-first. Match length to the task. Higher-level agents write with more craft, " +
    "range, and structure.",
  guardrail: GUARDRAILS.CREATE,
  modelTask: "basicConsult",
  tasks: [
    { key: "post", label: "Write an X post", instruction: "Write a short, engaging X post. Strong hook first, no filler, ready to paste." },
    { key: "thread", label: "Write a thread", instruction: "Write a short X thread (4-7 posts) on the holder's topic — hook, value, payoff." },
    { key: "caption", label: "Write a caption", instruction: "Write a tight 1-2 line caption for an image or drop. Make it land." },
    { key: "copy", label: "Write copy", instruction: "Write short marketing/announcement copy for what the holder describes. Clear and persuasive." },
    { key: "plan", label: "Content plan", instruction: "Give a short, concrete content plan: angles, hooks, and a posting cadence for the holder's goal." },
  ],
};

// Back-compat export name used by the registry (kept stable).
export const MAKER = CONTENT;

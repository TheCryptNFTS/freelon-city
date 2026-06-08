/**
 * ANALYST (research) — researches markets, summarizes, scans competitors,
 * explains. INFORM_ONLY (info, never "buy/sell"). Premium model on the deep
 * research task. (File name kept as communicator.ts for import stability.)
 */
import { type Ability, GUARDRAILS } from "@/lib/missions/abilities/ability";

export const RESEARCH: Ability = {
  id: "research",
  label: "Signal Scan",
  blurb: "Researches markets, summarizes long text, scans competitors. Info, not advice.",
  instruction:
    "You are the holder's research agent. Surface what matters clearly and concisely. Be accurate " +
    "and structured. Higher-level agents go deeper and connect more dots. You inform; the holder " +
    "decides.",
  guardrail: GUARDRAILS.INFORM_ONLY,
  modelTask: "deepConsult", // premium — research quality is what's paid for
  tasks: [
    { key: "market", label: "Research a market", instruction: "Give a clear briefing on the holder's market/niche: what it is, key players, trends, gaps." },
    { key: "summarize", label: "Summarize", instruction: "Summarize the holder's text into the key points — short, faithful, no fluff." },
    { key: "competitors", label: "Scan competitors", instruction: "From what the holder describes, list likely competitors and how they're positioned. Observations only." },
    { key: "explain", label: "Explain", instruction: "Explain the holder's topic in plain language a normal person understands." },
  ],
};

// Back-compat export name used by the registry (kept stable).
export const COMMUNICATOR = RESEARCH;

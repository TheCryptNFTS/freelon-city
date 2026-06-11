/**
 * Battle digest — the thread that ties the Crypt TCG into the civilization.
 *
 * The game's telemetry (app/api/play-event) keeps per-UTC-day DISTINCT-WALLET
 * sets per event. This reads the last 7 days of two of them and condenses the
 * holder's arena activity into ONE honest line the agent persona can carry —
 * so a citizen whose owner has been dueling KNOWS it ("my holder fought in the
 * arena three days this week"), and one whose owner hasn't stays silent.
 *
 * READ-ONLY. Fail-quiet ("" on any miss) — never blocks or degrades a chat.
 * No PII: the wallet is the holder's own, read back to their own agent.
 */
import { upstash, hasUpstash } from "@/lib/upstash-client";

const DAY_MS = 86_400_000;

function dayKey(offset: number): string {
  return new Date(Date.now() - offset * DAY_MS).toISOString().slice(0, 10);
}

export async function getBattleDigest(walletAddress: string | null | undefined): Promise<string> {
  if (!hasUpstash || !walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return "";
  const wallet = walletAddress.toLowerCase();
  try {
    let fought = 0;
    let firstWins = 0;
    for (let i = 0; i < 7; i++) {
      const d = dayKey(i);
      const [m, w] = await Promise.all([
        upstash(["SISMEMBER", `play:w:${d}:match_completed`, wallet]).catch(() => 0),
        upstash(["SISMEMBER", `play:w:${d}:first_win_of_day`, wallet]).catch(() => 0),
      ]);
      if (Number(m) === 1) fought++;
      if (Number(w) === 1) firstWins++;
    }
    if (fought === 0) return "";
    const days = fought === 1 ? "once" : `on ${fought} of the last 7 days`;
    const wins = firstWins > 0 ? ` They took the arena's first-win honors ${firstWins === 1 ? "once" : `${firstWins} times`}.` : "";
    return `Your holder has fought in the city's card arena ${days} this week.${wins}`;
  } catch {
    return "";
  }
}

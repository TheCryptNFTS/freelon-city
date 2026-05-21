import citizensData from "@/data/citizens.json";

export type CitizenOfDay = {
  id: number;
  name: string;
  civilization: string;
  tier: string;
  honoree?: string;
  transmission_name?: string;
};

// Pick deterministically by UTC day. Always picks a real procedural citizen
// (not a 1-of-1 or honorary) so the spotlight rotates through randoms.
export function getCitizenOfDay(d?: Date): CitizenOfDay {
  const day = Math.floor((d?.getTime() ?? Date.now()) / 86400000);
  const procs = (citizensData as CitizenOfDay[]).filter(
    (c) => c.tier !== "One of One" && c.tier !== "Honorary"
  );
  const idx = day % procs.length;
  return procs[idx];
}

import citizensData from "@/data/citizens.json";
import identitiesData from "@/data/identities.json";
import { CIVILIZATIONS, CivilizationSlug } from "./constants";

export type Identity = {
  id: number;
  headline: string;
  bio: string;
  tier_layer: "A" | "B" | "C";
  name?: string;
  honoree?: string;
  handle?: string;
  tier?: string;
};

const identities = identitiesData as Record<string, Identity>;

export function getIdentity(id: number): Identity | null {
  return identities[String(id)] ?? null;
}

export type Citizen = {
  id: number;
  name: string;
  civilization: string;
  doctrine: string;
  caste: string;
  shape: string;
  tier: string;
  hex_state: string;
  signal_type: string;
  face_status: string;
  glow_level: string;
  honoree: string;
  honoree_handle: string;
  transmission_name: string;
  sub_archetype: string;
  aura: string;
};

const all = citizensData as Citizen[];

export function getCitizen(id: number): Citizen | null {
  if (id < 1 || id > 4040) return null;
  return all[id - 1] ?? null;
}

export function getAllCitizens(): Citizen[] {
  return all;
}

export function getByCivilization(slug: CivilizationSlug): Citizen[] {
  return all.filter((c) => c.civilization === slug);
}

export function getByShape(shape: string): Citizen[] {
  return all.filter((c) => c.shape === shape);
}

export function getByCaste(caste: string): Citizen[] {
  return all.filter((c) => c.caste === caste);
}

export function getOneOfOnes(): Citizen[] {
  return all.filter((c) => c.tier === "One of One");
}

export function getHonoraries(): Citizen[] {
  return all.filter((c) => c.tier === "Honorary");
}

export function civilizationColor(slug: string): string {
  return (CIVILIZATIONS as Record<string, { color: string }>)[slug]?.color ?? "#c8aa64";
}

export function countSimilar(citizen: Citizen): { sameCiv: number; sameShape: number; sameCombo: number } {
  const sameCiv = all.filter((c) => c.civilization === citizen.civilization).length;
  const sameShape = all.filter((c) => c.shape === citizen.shape).length;
  const sameCombo = all.filter(
    (c) =>
      c.civilization === citizen.civilization &&
      c.shape === citizen.shape &&
      c.tier === citizen.tier
  ).length;
  return { sameCiv, sameShape, sameCombo };
}

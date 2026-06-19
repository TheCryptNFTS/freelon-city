import deepLore from "@/data/deep-lore.json";
import { Citizen, countSimilar } from "@/lib/citizens";
import { CIVILIZATIONS } from "@/lib/constants";
import { CIVILIZATION_LORE } from "@/lib/worldbuilding";
import { LORE_COSTS } from "@/lib/economy-constants";

const HAND_WRITTEN = deepLore as Record<string, { title: string; body: string }>;

export type DeepLore =
  | { kind: "prose"; title: string; body: string }
  | { kind: "panel"; title: string; sections: PanelSection[] };

export type PanelSection = {
  label: string;
  value: string;
  detail?: string;
};

export function isHandWritten(citizenId: number): boolean {
  return HAND_WRITTEN[String(citizenId)] !== undefined;
}

/** Returns the deep lore for a citizen. Hand-written for honoraries/1-1s, procedural panel otherwise. */
export function getDeepLore(citizen: Citizen): DeepLore {
  const hw = HAND_WRITTEN[String(citizen.id)];
  if (hw) return { kind: "prose", title: hw.title, body: hw.body };

  // Procedural panel — derived from the citizen's actual traits + civ relationships.
  const counts = countSimilar(citizen);
  const civObj = (CIVILIZATIONS as Record<string, { name: string; population: number; chant: string }>)[citizen.civilization];
  const lore = (CIVILIZATION_LORE as unknown as Record<string, { allies: readonly string[]; rivals: readonly string[]; rivalLine: string; ritual: string; motto: string }>)[citizen.civilization];

  const allyNames = (lore?.allies ?? []).map((s: string) => (CIVILIZATIONS as Record<string, { name: string }>)[s]?.name).filter(Boolean).join(" · ");
  const rivalNames = (lore?.rivals ?? []).map((s: string) => (CIVILIZATIONS as Record<string, { name: string }>)[s]?.name).filter(Boolean).join(" · ");

  // Hex state interpretation
  const hexReadings: Record<string, string> = {
    "Active":     "transmitting on the open frequency",
    "Dormant":    "in storage mode — listening, not broadcasting",
    "Echo Hex":   "carrying a transmission that has already been received elsewhere",
    "Sealed":     "permanently inactive — the hex is recorded but cannot be re-activated",
    "Overloaded": "carrying more signal than the casing was designed for",
    "Half-Closed":"between states — neither fully receiving nor fully transmitting",
    "Open":       "broadcasting without filter",
    "Dimmed":     "operating below nominal output by choice",
  };
  const hexInterp = hexReadings[citizen.hex_state] ?? "operating in a state the city has not yet classified";

  // Rarity reading
  const rarityNote =
    counts.sameCombo === 1
      ? "This combination is unique. No other citizen carries the same civ × shape × tier."
      : counts.sameCombo < 10
      ? `Only ${counts.sameCombo} citizens share this exact civ × shape × tier combination.`
      : `${counts.sameCombo} citizens share this exact combination — common within their tier.`;

  // Position note
  const civSize = civObj?.population ?? 0;
  const positionNote = `One of ${civSize} citizens in ${civObj?.name}. ${civSize <= 200 ? "A rare civilization." : civSize <= 500 ? "A mid-sized civilization." : "A populous civilization."}`;

  return {
    kind: "panel",
    title: "CITIZEN READING",
    sections: [
      {
        label: "Civic position",
        value: `${civObj?.name ?? citizen.civilization} · ${citizen.caste}`,
        detail: positionNote,
      },
      {
        label: "Civilization motto",
        value: lore?.motto ?? "—",
      },
      {
        label: "Hex state",
        value: citizen.hex_state,
        detail: `Currently ${hexInterp}.`,
      },
      {
        label: "Sub-archetype",
        value: citizen.sub_archetype || "—",
      },
      {
        label: "Allied civilizations",
        value: allyNames || "—",
        detail: allyNames ? `This citizen has natural collaborators in ${allyNames}.` : undefined,
      },
      {
        label: "Rival civilizations",
        value: rivalNames || "—",
        detail: lore?.rivalLine ? `"${lore.rivalLine}"` : undefined,
      },
      {
        label: "Civilization ritual",
        value: lore?.ritual ?? "—",
      },
      {
        label: "Scarcity",
        value: rarityNote,
      },
      {
        label: "Civ chant",
        value: civObj?.chant ?? "—",
      },
    ],
  };
}

export function unlockCost(citizenId: number): number {
  // Hand-written (honorary / 1-of-1) lore costs more than the procedural panel.
  // Values UNCHANGED — moved into LORE_COSTS so carrier.ts can't drift from here.
  return isHandWritten(citizenId) ? LORE_COSTS.UNLOCK_HONORARY : LORE_COSTS.UNLOCK_PROCEDURAL;
}

import items from "@/data/shop-items.json";

export type ShopItem = {
  id: string;
  category: string;
  name: string;
  description: string;
  cost: number;
  civ?: string;
  supply: number | null;
  tier: string;
};

export const ITEMS = items as ShopItem[];

export function getItem(id: string): ShopItem | null {
  return ITEMS.find((i) => i.id === id) ?? null;
}

export function itemsByCategory(category: string): ShopItem[] {
  return ITEMS.filter((i) => i.category === category);
}

export const CATEGORIES = ["PROPERTY", "LAND", "WEAPONS", "CLOTHES", "ARTIFACTS", "ASCENSION"];

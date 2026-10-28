import type { AssetId } from "@/scene/assets/registry";
import type { SlotId } from "@/scene/slots";

/**
 * The décor item registry. Every customization item comes from here. Prices are in focus minutes
 * (the Phase 3 currency); Phase 1 equips the free starter items by default.
 */
export type ItemCategory = "wall" | "string" | "desk" | "lighting" | "ceiling";

export type Item = {
  id: string;
  name: string;
  category: ItemCategory;
  /** Cost in focus minutes. 0 = starter item. */
  price: number;
  /** Themes this item is designed for; "any" fits everything. */
  themeTags: string[];
  model: AssetId;
  slots: SlotId[];
};

export const ITEMS = [
  { id: "poster-moon", name: "Moon over the hills", category: "wall", price: 0, themeTags: ["any"], model: "decor.poster", slots: ["wall-above-desk", "wall-bed"] },
  { id: "fairy-lights", name: "Fairy lights", category: "string", price: 0, themeTags: ["any"], model: "decor.fairy-lights", slots: ["wall-string"] },
] as const satisfies readonly Item[];

export type ItemId = (typeof ITEMS)[number]["id"];

export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** What each slot holds for a new user. */
export const DEFAULT_LOADOUT: Partial<Record<SlotId, ItemId>> = {
  "wall-above-desk": "poster-moon",
  "wall-string": "fairy-lights",
};

import type { Theme } from "../schema";
import { frutigerAero } from "./aero";
import { cottagecore } from "./cottage";
import { gothicGlass } from "./gothic";
import { minimalCalm } from "./minimal";

export const PRESETS = [gothicGlass, frutigerAero, cottagecore, minimalCalm] as const satisfies readonly Theme[];
export type PresetId = (typeof PRESETS)[number]["id"];
export const DEFAULT_PRESET: Theme = gothicGlass;

export function getPreset(id: string): Theme | undefined {
  return PRESETS.find((p) => p.id === id);
}

export function isPresetId(id: string): id is PresetId {
  return PRESETS.some((p) => p.id === id);
}

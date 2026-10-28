import { ROOM, type Vec3 } from "./layout";

/**
 * Predefined placement slots for décor (no free placement in the MVP). Items declare which slots
 * they fit; Phase 3's shop lets users choose an item per slot.
 */
export const SLOTS = {
  "wall-above-desk": { label: "Wall above the desk", position: [-0.15, 1.74, ROOM.backZ + 0.012] as Vec3 },
  "wall-string": { label: "Along the top of the wall", position: [0, 0, 0] as Vec3 },
  "wall-bed": { label: "Wall above the bed", position: [2.2, 1.95, ROOM.backZ + 0.012] as Vec3 },
  ceiling: { label: "Ceiling", position: [0.2, ROOM.height, -1.2] as Vec3 },
  "desk-corner": { label: "Desk corner", position: [-0.65, 0.75, -1.55] as Vec3 },
} as const;

export type SlotId = keyof typeof SLOTS;

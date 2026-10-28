import type { ComponentType } from "react";
import { FairyLights } from "../decor/FairyLights";
import { Poster } from "../decor/Poster";
import * as P from "./placeholders";

/**
 * Asset registry: every model in the room is resolved here.
 *
 * To swap a placeholder for a real model, drop the file in /public/models and change its entry:
 *   lamp: { kind: "gltf", url: "/models/lamp.glb", scale: 1, rotation: [0, Math.PI, 0] },
 * Models should use meters, y-up, with the origin where the placeholder's origin is
 * (documented on each placeholder), so the scene code does not change.
 */
export type AssetEntry =
  | { kind: "placeholder"; component: ComponentType<P.PlaceholderProps> }
  | { kind: "gltf"; url: string; scale?: number; position?: [number, number, number]; rotation?: [number, number, number] };

export const ASSETS = {
  "room.shell": { kind: "placeholder", component: P.RoomShell },
  desk: { kind: "placeholder", component: P.Desk },
  "drawer.body": { kind: "placeholder", component: P.DrawerBody },
  "drawer.box": { kind: "placeholder", component: P.DrawerBox },
  "drawer.notebook": { kind: "placeholder", component: P.SmallNotebook },
  flashcards: { kind: "placeholder", component: P.Flashcards },
  bed: { kind: "placeholder", component: P.Bed },
  shelf: { kind: "placeholder", component: P.Shelf },
  plant: { kind: "placeholder", component: P.Plant },
  rug: { kind: "placeholder", component: P.Rug },
  "curtain.rod": { kind: "placeholder", component: P.CurtainRod },
  "curtain.panel": { kind: "placeholder", component: P.CurtainPanel },
  chair: { kind: "placeholder", component: P.Chair },
  nightstand: { kind: "placeholder", component: P.Nightstand },
  "phone.body": { kind: "placeholder", component: P.PhoneBody },
  "lamp.body": { kind: "placeholder", component: P.LampBody },
  "laptop.base": { kind: "placeholder", component: P.LaptopBase },
  "laptop.lid": { kind: "placeholder", component: P.LaptopLid },
  "notebook.base": { kind: "placeholder", component: P.NotebookBase },
  "notebook.cover": { kind: "placeholder", component: P.NotebookCover },
  mug: { kind: "placeholder", component: P.MugModel },
  glass: { kind: "placeholder", component: P.GlassModel },
  coaster: { kind: "placeholder", component: P.Coaster },
  fidget: { kind: "placeholder", component: P.FidgetModel },
  "window.frame": { kind: "placeholder", component: P.WindowFrame },
  "window.pane": { kind: "placeholder", component: P.WindowPane },
  "decor.poster": { kind: "placeholder", component: Poster },
  "decor.fairy-lights": { kind: "placeholder", component: FairyLights },
} satisfies Record<string, AssetEntry>;

export type AssetId = keyof typeof ASSETS;

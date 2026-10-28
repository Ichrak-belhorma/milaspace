"use client";

import { DEFAULT_LOADOUT, getItem } from "@/items/registry";
import { Asset } from "./assets/Asset";
import { POSITIONS } from "./layout";
import { DeskLamp } from "./objects/DeskLamp";
import { Drawer } from "./objects/Drawer";
import { Fidget } from "./objects/Fidget";
import { Laptop } from "./objects/Laptop";
import { Mug } from "./objects/Mug";
import { Notebook } from "./objects/Notebook";
import { Window } from "./objects/Window";
import { SLOTS, type SlotId } from "./slots";

/** Décor placed in its slots. Phase 3 replaces DEFAULT_LOADOUT with the user's chosen items. */
function DecorSlots() {
  return (
    <>
      {(Object.entries(DEFAULT_LOADOUT) as [SlotId, string][]).map(([slot, itemId]) => {
        const item = getItem(itemId);
        if (!item) return null;
        return (
          <group key={slot} position={SLOTS[slot].position}>
            <Asset id={item.model} />
          </group>
        );
      })}
    </>
  );
}

export function Room() {
  return (
    <>
      <Asset id="room.shell" />
      <group position={POSITIONS.rug}>
        <Asset id="rug" />
      </group>
      <Asset id="desk" />
      <group position={POSITIONS.bed}>
        <Asset id="bed" />
      </group>
      <group position={[POSITIONS.shelf[0], POSITIONS.shelf[1], POSITIONS.shelf[2]]}>
        <Asset id="shelf" />
      </group>
      <group position={POSITIONS.plant}>
        <Asset id="plant" />
      </group>
      <DecorSlots />

      <Window />
      <DeskLamp />
      <Laptop />
      <Notebook />
      <Mug />
      <Fidget />
      <Drawer />
    </>
  );
}

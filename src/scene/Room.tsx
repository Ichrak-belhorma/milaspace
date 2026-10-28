"use client";

import { DEFAULT_LOADOUT, getItem } from "@/items/registry";
import { Asset } from "./assets/Asset";
import type { AssetId } from "./assets/registry";
import { POSITIONS } from "./layout";
import { Bed } from "./objects/Bed";
import { DeskLamp } from "./objects/DeskLamp";
import { DeskSeat } from "./objects/DeskSeat";
import { Drawer } from "./objects/Drawer";
import { Fidget } from "./objects/Fidget";
import { Laptop } from "./objects/Laptop";
import { Mug } from "./objects/Mug";
import { Notebook } from "./objects/Notebook";
import { NightstandWithPhone } from "./objects/Phone";
import { ArchiveBoxes, CountdownNote, GrowingPlant } from "./objects/Progress";
import { StudyBuddy } from "./objects/StudyBuddy";
import { WallCalendar } from "./objects/WallCalendar";
import { Window } from "./objects/Window";
import { SLOTS, type SlotId } from "./slots";
import { useInteractable } from "./useInteractable";

/** The wall art slot is the clickable "painting": click it to hang your own picture. */
function PaintingSlot({ model }: { model: AssetId }) {
  const { active, bind } = useInteractable("painting");
  return (
    <group position={SLOTS["wall-above-desk"].position} {...bind}>
      <Asset id={model} highlight={active} />
    </group>
  );
}

/** Décor placed in its slots. Phase 3 replaces DEFAULT_LOADOUT with the user's chosen items. */
function DecorSlots() {
  return (
    <>
      {(Object.entries(DEFAULT_LOADOUT) as [SlotId, string][]).map(([slot, itemId]) => {
        const item = getItem(itemId);
        if (!item) return null;
        if (slot === "wall-above-desk") return <PaintingSlot key={slot} model={item.model} />;
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
      <DeskSeat />
      <Bed />
      <NightstandWithPhone />
      <WallCalendar />
      <StudyBuddy />
      <group position={[POSITIONS.shelf[0], POSITIONS.shelf[1], POSITIONS.shelf[2]]}>
        <Asset id="shelf" />
      </group>
      <GrowingPlant />
      <ArchiveBoxes />
      <CountdownNote />
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

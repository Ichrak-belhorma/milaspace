"use client";

import type { ComponentType } from "react";
import {
  BedIcon,
  ChairIcon,
  CoffeeIcon,
  CurtainsIcon,
  DrawerIcon,
  FrameIcon,
  LampIcon,
  LaptopIcon,
  NotebookIcon,
  PhoneIcon,
  SpinnerIcon,
  WindowIcon,
} from "@/components/icons";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { activateObject, OBJECT_LABELS, objectActionLabel } from "@/stores/actions";
import { ROOM_OBJECTS, useRoomStore, type RoomObjectId } from "@/stores/room";
import { useUiStore } from "@/stores/ui";

const ICONS: Record<RoomObjectId, ComponentType<{ size?: number }>> = {
  window: WindowIcon,
  curtains: CurtainsIcon,
  painting: FrameIcon,
  lamp: LampIcon,
  laptop: LaptopIcon,
  notebook: NotebookIcon,
  mug: CoffeeIcon,
  fidget: SpinnerIcon,
  drawer: DrawerIcon,
  desk: ChairIcon,
  phone: PhoneIcon,
  bed: BedIcon,
};

/**
 * Keyboard (and touch) access to every clickable object in the 3D room. Focusing or hovering a
 * button highlights the matching object in the scene.
 */
export function ObjectBar() {
  // Subscribe so labels and pressed states update with the room.
  const room = useRoomStore();
  const ui = useUiStore();
  const setHighlight = ui.setHighlight;
  const pressed: Partial<Record<RoomObjectId, boolean>> = {
    lamp: room.lamp.on,
    window: room.window.open,
    curtains: room.curtainsClosed,
    drawer: room.drawerOpen,
    mug: room.drink.kind !== null,
    desk: ui.pose === "seated",
    bed: ui.pose === "lying",
  };

  return (
    <GlassSurface as="nav" id="object-bar" aria-label="Room objects" edges={[]} className="pointer-events-auto max-w-full" contentClassName="flex gap-0.5 overflow-x-auto p-1.5 sm:gap-1">
      {ROOM_OBJECTS.map((id) => {
        const Icon = ICONS[id];
        const action = objectActionLabel(id);
        return (
          <button
            key={id}
            type="button"
            className="btn btn-icon shrink-0"
            aria-label={action}
            aria-pressed={pressed[id]}
            title={`${OBJECT_LABELS[id]}: ${action}`}
            onClick={() => activateObject(id)}
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && setHighlight(id)}
            onBlur={() => setHighlight(null)}
            onPointerEnter={() => setHighlight(id)}
            onPointerLeave={() => setHighlight(null)}
          >
            <Icon size={20} />
          </button>
        );
      })}
    </GlassSurface>
  );
}

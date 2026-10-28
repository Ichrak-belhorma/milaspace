"use client";

import type { ComponentType } from "react";
import { CoffeeIcon, DrawerIcon, LampIcon, LaptopIcon, NotebookIcon, SpinnerIcon, WindowIcon } from "@/components/icons";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { activateObject, OBJECT_LABELS, objectActionLabel } from "@/stores/actions";
import { ROOM_OBJECTS, useRoomStore, type RoomObjectId } from "@/stores/room";
import { useUiStore } from "@/stores/ui";

const ICONS: Record<RoomObjectId, ComponentType<{ size?: number }>> = {
  lamp: LampIcon,
  window: WindowIcon,
  mug: CoffeeIcon,
  drawer: DrawerIcon,
  laptop: LaptopIcon,
  notebook: NotebookIcon,
  fidget: SpinnerIcon,
};

/**
 * Keyboard (and touch) access to every clickable object in the 3D room. Focusing or hovering a
 * button highlights the matching object in the scene.
 */
export function ObjectBar() {
  // Subscribe so labels and pressed states update with the room.
  const room = useRoomStore();
  const setHighlight = useUiStore((s) => s.setHighlight);
  const pressed: Partial<Record<RoomObjectId, boolean>> = {
    lamp: room.lamp.on,
    window: room.window.open,
    drawer: room.drawerOpen,
    mug: room.coffee.present,
  };

  return (
    <GlassSurface as="nav" id="object-bar" aria-label="Room objects" edges={[]} className="pointer-events-auto" contentClassName="flex gap-0.5 p-1.5 sm:gap-1">
      {ROOM_OBJECTS.map((id) => {
        const Icon = ICONS[id];
        const action = objectActionLabel(id);
        return (
          <button
            key={id}
            type="button"
            className="btn btn-icon"
            aria-label={action}
            aria-pressed={pressed[id]}
            title={`${OBJECT_LABELS[id]}: ${action}`}
            onClick={() => activateObject(id)}
            onFocus={() => setHighlight(id)}
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

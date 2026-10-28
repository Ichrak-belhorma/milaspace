"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";
import { activateObject } from "@/stores/actions";
import type { RoomObjectId } from "@/stores/room";
import { useUiStore } from "@/stores/ui";

function setCursor(e: ThreeEvent<PointerEvent>, cursor: string) {
  const el = e.nativeEvent.target;
  // Clearing the inline cursor falls back to the theme's cursor on <body>.
  if (el instanceof HTMLElement) el.style.cursor = cursor;
}

/**
 * Pointer handling for a clickable room object. `active` is true while hovered or while the
 * matching object-bar button is focused, so keyboard users see the same highlight.
 */
export function useInteractable(id: RoomObjectId, onActivate: () => void = () => activateObject(id)) {
  const [hovered, setHovered] = useState(false);
  const highlighted = useUiStore((s) => s.highlight === id);

  const bind = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHovered(true);
      setCursor(e, "pointer");
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      setHovered(false);
      setCursor(e, "");
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onActivate();
    },
  };
  return { active: hovered || highlighted, bind };
}

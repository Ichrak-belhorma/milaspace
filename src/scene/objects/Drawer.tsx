"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useRoomStore } from "@/stores/room";
import { useUiStore } from "@/stores/ui";
import { Asset } from "../assets/Asset";
import { DRAWER_UNIT } from "../assets/placeholders";
import { damp } from "../damp";
import { POSITIONS } from "../layout";
import { useInteractable } from "../useInteractable";

const OPEN_DISTANCE = 0.4;

/** The desk drawer slides open to reveal a notebook and flashcards you can pick up. */
export function Drawer() {
  const open = useRoomStore((s) => s.drawerOpen);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("drawer");
  const flashcards = useInteractable("drawer", () => useUiStore.getState().openLaptop("flashcards"));
  const notes = useInteractable("drawer", () => useUiStore.getState().openPanel("notebook"));
  const box = useRef<Group>(null);

  useFrame((_, dt) => {
    if (!box.current) return;
    const target = open ? OPEN_DISTANCE : 0;
    box.current.position.z = reduced ? target : damp(box.current.position.z, target, 7, dt);
  });

  const trayY = DRAWER_UNIT.y0 + DRAWER_UNIT.height - 0.1 - 0.054;
  return (
    <group position={POSITIONS.drawerUnit}>
      <group {...bind}>
        <Asset id="drawer.body" />
      </group>
      <group ref={box}>
        <group {...bind}>
          <Asset id="drawer.box" highlight={active} />
        </group>
        {/* Items sit in the part of the tray that clears the desk top when open. */}
        <group position={[-0.08, trayY, 0.15]} rotation-y={0.2} {...flashcards.bind}>
          <Asset id="flashcards" highlight={flashcards.active && open} />
        </group>
        <group position={[0.11, trayY, 0.13]} rotation-y={-0.15} {...notes.bind}>
          <Asset id="drawer.notebook" highlight={notes.active && open} />
        </group>
      </group>
    </group>
  );
}

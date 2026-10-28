"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUiStore } from "@/stores/ui";
import { Asset } from "../assets/Asset";
import { damp } from "../damp";
import { CHAIR } from "../layout";
import { useInteractable } from "../useInteractable";

/**
 * The desk and its chair. Clicking either sits you down; the chair slides from pulled-out to
 * tucked under you. Objects on the desk have their own handlers and stop the click first.
 */
export function DeskSeat() {
  const pose = useUiStore((s) => s.pose);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("desk");
  const chair = useRef<Group>(null);

  useFrame((_, dt) => {
    const c = chair.current;
    if (!c) return;
    const goal = pose === "seated" ? CHAIR.seated : CHAIR.standing;
    const k = reduced ? 1 : undefined;
    c.position.x = k ? goal.position[0] : damp(c.position.x, goal.position[0], 5, dt);
    c.position.z = k ? goal.position[2] : damp(c.position.z, goal.position[2], 5, dt);
    c.rotation.y = k ? goal.rotationY : damp(c.rotation.y, goal.rotationY, 5, dt);
    // You're sitting on it: hide it once it's tucked in so it doesn't fill the seated view.
    const tucked = Math.hypot(c.position.x - CHAIR.seated.position[0], c.position.z - CHAIR.seated.position[2]) < 0.03;
    c.visible = !(pose === "seated" && tucked);
  });

  return (
    <group {...bind}>
      <Asset id="desk" />
      <group ref={chair} position={CHAIR.standing.position} rotation-y={CHAIR.standing.rotationY}>
        <Asset id="chair" highlight={active} />
      </group>
    </group>
  );
}

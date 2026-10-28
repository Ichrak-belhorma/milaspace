"use client";

import { Asset } from "../assets/Asset";
import { POSITIONS } from "../layout";
import { useInteractable } from "../useInteractable";

/** The desk notebook opens today's to-do list. */
export function Notebook() {
  const { active, bind } = useInteractable("notebook");
  return (
    <group position={POSITIONS.notebook} rotation-y={0.18} {...bind}>
      <Asset id="notebook" highlight={active} />
    </group>
  );
}

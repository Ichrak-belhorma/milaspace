"use client";

import { Asset } from "../assets/Asset";
import { POSITIONS } from "../layout";
import { useInteractable } from "../useInteractable";

/** Click to get under the covers (then look around with the mouse, or sleep). */
export function Bed() {
  const { active, bind } = useInteractable("bed");
  return (
    <group position={POSITIONS.bed} {...bind}>
      <Asset id="bed" highlight={active} />
    </group>
  );
}

"use client";

import { RoundedBox } from "@react-three/drei";
import { useUiStore } from "@/stores/ui";
import { Asset } from "../assets/Asset";
import { POSITIONS } from "../layout";
import { useRoomColors } from "../materials";
import { useInteractable } from "../useInteractable";

/** Covers pulled up over you while you lie in bed: a body-shaped mound with a folded sheet at the chin. */
function Covers() {
  const c = useRoomColors();
  return (
    <group>
      <RoundedBox args={[1.0, 0.22, 1.3]} radius={0.1} smoothness={4} position={[0, 0.56, 0.27]} castShadow receiveShadow>
        <meshStandardMaterial color={c.fabric} roughness={1} />
      </RoundedBox>
      <RoundedBox args={[1.06, 0.07, 0.2]} radius={0.03} position={[0, 0.66, -0.32]} rotation-x={-0.25} receiveShadow>
        <meshStandardMaterial color={c.paper} roughness={1} />
      </RoundedBox>
    </group>
  );
}

/** Click to get under the covers (then look around with the mouse, or sleep). */
export function Bed() {
  const { active, bind } = useInteractable("bed");
  const lying = useUiStore((s) => s.pose === "lying");
  return (
    <group position={POSITIONS.bed} {...bind}>
      <Asset id="bed" highlight={active} />
      {lying && <Covers />}
    </group>
  );
}

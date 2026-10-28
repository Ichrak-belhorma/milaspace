"use client";

import { useMemo } from "react";
import { SphereGeometry } from "three";
import { useUiStore } from "@/stores/ui";
import { Asset } from "../assets/Asset";
import { POSITIONS } from "../layout";
import { useRoomColors } from "../materials";
import { fabricTexture } from "../textures";
import { useInteractable } from "../useInteractable";

/** A soft, wrinkled duvet mound: a squashed sphere with gentle folds. */
function duvetGeometry() {
  const g = new SphereGeometry(1, 64, 40);
  const pos = g.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const fold = 1 + 0.035 * Math.sin(x * 9 + z * 4) + 0.025 * Math.sin(z * 13 - x * 3) + 0.02 * Math.sin((x + z) * 21);
    pos.setXYZ(i, x * fold, y * (y > 0 ? fold : 1), z * fold);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The covers pulled over you while you lie in bed. The camera sits just above the duvet, so it fills
 * the lower part of the view wherever you look, like being tucked in.
 */
function Covers() {
  const c = useRoomColors();
  const geometry = useMemo(() => duvetGeometry(), []);
  const fabric = useMemo(() => {
    const t = fabricTexture().clone();
    t.repeat.set(6, 6);
    t.needsUpdate = true;
    return t;
  }, []);
  return (
    <group>
      {/* Bed-local space: you lie along +z with your head at about (0, 0.84, -0.45). */}
      <mesh geometry={geometry} position={[-0.05, 0.48, -0.08]} scale={[0.72, 0.34, 0.95]} castShadow receiveShadow>
        <meshStandardMaterial color={c.fabric} map={fabric} roughness={1} />
      </mesh>
      {/* Knees and feet make a second, lower hill. */}
      <mesh geometry={geometry} position={[0.05, 0.45, 0.55]} scale={[0.55, 0.2, 0.45]} castShadow receiveShadow>
        <meshStandardMaterial color={c.fabric} map={fabric} roughness={1} />
      </mesh>
      {/* The folded-over sheet edge under your chin. */}
      <mesh geometry={geometry} position={[0, 0.73, -0.4]} scale={[0.62, 0.06, 0.12]} receiveShadow>
        <meshStandardMaterial color={c.paper} roughness={1} />
      </mesh>
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

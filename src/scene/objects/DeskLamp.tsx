"use client";

import { useMemo } from "react";
import { Object3D } from "three";
import { mix } from "@/theme/color";
import { useQualityStore } from "@/stores/quality";
import { useRoomStore } from "@/stores/room";
import { Asset } from "../assets/Asset";
import { LAMP_BULB } from "../assets/placeholders";
import { POSITIONS } from "../layout";
import { FIXED } from "../palette";
import { useInteractable } from "../useInteractable";

/** Click to toggle; warmth and brightness live in the lamp's quick controls. */
export function DeskLamp() {
  const lamp = useRoomStore((s) => s.lamp);
  const shadows = useQualityStore((s) => s.shadows);
  const { active, bind } = useInteractable("lamp");
  const color = mix(FIXED.lampCool, FIXED.lampWarm, lamp.warmth);
  const level = lamp.on ? lamp.brightness : 0;
  const target = useMemo(() => {
    const o = new Object3D();
    o.position.set(0.42, 0, 0.3);
    return o;
  }, []);

  return (
    <group position={POSITIONS.lamp} {...bind}>
      <Asset id="lamp.body" highlight={active} />
      <mesh position={LAMP_BULB}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={lamp.on ? 1.5 + 4 * lamp.brightness : 0} toneMapped={false} />
      </mesh>
      <primitive object={target} />
      {/* Lights stay mounted (intensity 0 when off) so toggling never recompiles shaders. */}
      <spotLight
        position={LAMP_BULB}
        target={target}
        color={color}
        intensity={level * 9}
        angle={0.85}
        penumbra={0.85}
        distance={1.35}
        decay={2}
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[LAMP_BULB[0], LAMP_BULB[1] + 0.06, LAMP_BULB[2]]} color={color} intensity={level * 1.6} distance={3.5} decay={2} />
    </group>
  );
}

"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Mesh, MeshBasicMaterial } from "three";
import { useNow } from "@/hooks/useNow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { COFFEE_COOL_MS, MUG_SIPS, useRoomStore } from "@/stores/room";
import { Asset } from "../assets/Asset";
import { damp } from "../damp";
import { POSITIONS } from "../layout";
import { FIXED } from "../palette";
import { puffTexture } from "../textures";
import { useInteractable } from "../useInteractable";

const PUFFS = 4;

/** Rising, fading wisps. `strength` fades as the coffee cools. */
function Steam({ strength }: { strength: number }) {
  const reduced = useReducedMotion();
  const puffs = useRef<(Mesh | null)[]>([]);
  const map = puffTexture();

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    puffs.current.forEach((p, i) => {
      if (!p) return;
      const phase = reduced ? 0.35 + i * 0.12 : (t * 0.35 + i / PUFFS) % 1;
      p.position.set(Math.sin(t * 1.4 + i) * 0.012 * phase, 0.11 + phase * 0.16, 0);
      p.scale.setScalar(0.035 + phase * 0.06);
      (p.material as MeshBasicMaterial).opacity = strength * 0.4 * Math.sin(phase * Math.PI);
    });
  });

  return (
    <Billboard>
      {Array.from({ length: PUFFS }, (_, i) => (
        <mesh key={i} ref={(m) => void (puffs.current[i] = m)}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={map} color={FIXED.steam} transparent depthWrite={false} opacity={0} />
        </mesh>
      ))}
    </Billboard>
  );
}

/** Click the coaster for a coffee, click the mug to sip, and click the empty mug to clear it. */
export function Mug() {
  const coffee = useRoomStore((s) => s.coffee);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("mug");
  const mug = useRef<Group>(null);
  const now = useNow(30_000);

  useFrame((_, dt) => {
    if (!mug.current) return;
    const target = coffee.present ? 1 : 0.001;
    const s = reduced ? target : damp(mug.current.scale.x, target, 9, dt);
    mug.current.scale.setScalar(s);
    mug.current.visible = s > 0.01;
  });

  const fill = coffee.sipsLeft / MUG_SIPS;
  const warmth = coffee.brewedAt ? Math.max(0, 1 - (now - coffee.brewedAt) / COFFEE_COOL_MS) : 0;

  return (
    <group position={POSITIONS.mug} {...bind}>
      <Asset id="coaster" highlight={active && !coffee.present} />
      <group ref={mug} scale={0.001}>
        <Asset id="mug" highlight={active} />
        {fill > 0 && (
          <mesh position={[0, 0.02 + fill * 0.065, 0]} rotation-x={-Math.PI / 2}>
            <circleGeometry args={[0.038, 24]} />
            <meshStandardMaterial color={FIXED.coffee} roughness={0.2} />
          </mesh>
        )}
        {fill > 0 && warmth > 0.02 && <Steam strength={warmth} />}
      </group>
    </group>
  );
}

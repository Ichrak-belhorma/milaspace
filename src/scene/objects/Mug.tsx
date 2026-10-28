"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Group, Mesh, MeshBasicMaterial } from "three";
import { useNow } from "@/hooks/useNow";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DRINKS, DRINK_COOL_MS, DRINK_SIPS, useRoomStore } from "@/stores/room";
import { Asset } from "../assets/Asset";
import { damp } from "../damp";
import { POSITIONS } from "../layout";
import { FIXED } from "../palette";
import { puffTexture } from "../textures";
import { useInteractable } from "../useInteractable";

const PUFFS = 4;

/** Rising, fading wisps. `strength` fades as the drink cools. */
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

/** Click the coaster to choose a drink, the cup to sip, and the empty cup to clear it. */
export function Mug() {
  const drink = useRoomStore((s) => s.drink);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("mug");
  const cup = useRef<Group>(null);
  const now = useNow(30_000);

  useFrame((_, dt) => {
    if (!cup.current) return;
    const target = drink.kind ? 1 : 0.001;
    const s = reduced ? target : damp(cup.current.scale.x, target, 9, dt);
    cup.current.scale.setScalar(s);
    cup.current.visible = s > 0.01;
  });

  const spec = drink.kind ? DRINKS[drink.kind] : null;
  const fill = drink.sipsLeft / DRINK_SIPS;
  const warmth = spec?.hot && drink.madeAt ? Math.max(0, 1 - (now - drink.madeAt) / DRINK_COOL_MS) : 0;
  const glass = spec?.vessel === "glass";

  return (
    <group position={POSITIONS.mug} {...bind}>
      <Asset id="coaster" highlight={active && !drink.kind} />
      <group ref={cup} scale={0.001}>
        <Asset id={glass ? "glass" : "mug"} highlight={active} />
        {spec && fill > 0 && (
          <mesh position={[0, 0.01 + fill * (glass ? 0.09 : 0.075) / 2, 0]}>
            <cylinderGeometry args={[glass ? 0.032 : 0.037, glass ? 0.03 : 0.036, fill * (glass ? 0.09 : 0.075), 24]} />
            <meshStandardMaterial color={spec.liquid} roughness={0.15} transparent={glass} opacity={glass ? 0.55 : 1} />
          </mesh>
        )}
        {spec && fill > 0 && warmth > 0.02 && <Steam strength={warmth} />}
      </group>
    </group>
  );
}

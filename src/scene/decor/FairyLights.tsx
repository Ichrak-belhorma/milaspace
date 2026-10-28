"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { CatmullRomCurve3, Color, InstancedMesh, Object3D, Vector3 } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useThemeStore } from "@/stores/theme";
import { ROOM } from "../layout";
import { FIXED } from "../palette";

const BULBS = 34;

/** A swagged string of lights along the top of the back wall. Twinkles unless motion is reduced. */
export function FairyLights() {
  const room = useThemeStore((s) => s.active.room);
  const glow = useThemeStore((s) => s.active.tokens.glowColor);
  const reduced = useReducedMotion();
  const mesh = useRef<InstancedMesh>(null);

  const curve = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = -ROOM.halfWidth + 0.15 + t * (ROOM.halfWidth * 2 - 0.3);
      pts.push(new Vector3(x, 2.66 - 0.16 * Math.abs(Math.sin(t * Math.PI * 3)), ROOM.backZ + 0.04));
    }
    return new CatmullRomCurve3(pts);
  }, []);

  const palette = useMemo(() => [new Color(room.accentLight), new Color(glow), new Color(room.paper)], [room.accentLight, room.paper, glow]);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const dummy = new Object3D();
    for (let i = 0; i < BULBS; i++) {
      dummy.position.copy(curve.getPointAt((i + 0.5) / BULBS));
      dummy.position.y -= 0.018;
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, palette[i % palette.length]!);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [curve, palette]);

  const tmp = useMemo(() => new Color(), []);
  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m || reduced) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < BULBS; i++) {
      const k = 0.75 + 0.25 * Math.sin(t * 1.3 + i * 2.1);
      m.setColorAt(i, tmp.copy(palette[i % palette.length]!).multiplyScalar(k * 1.6));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 120, 0.0035, 5, false]} />
        <meshStandardMaterial color={FIXED.wire} roughness={0.8} />
      </mesh>
      <instancedMesh ref={mesh} args={[undefined, undefined, BULBS]}>
        <sphereGeometry args={[0.016, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <pointLight position={[0, 2.4, ROOM.backZ + 0.5]} color={room.accentLight} intensity={0.9} distance={4.5} decay={2} />
    </group>
  );
}

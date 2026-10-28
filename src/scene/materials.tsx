"use client";

import type { ReactNode } from "react";
import { Quaternion, Vector3 } from "three";
import { useThemeStore } from "@/stores/theme";
import type { Vec3 } from "./layout";

export function useRoomColors() {
  return useThemeStore((s) => s.active.room);
}

export function useHighlightColor() {
  return useThemeStore((s) => s.active.tokens.glowColor);
}

/** Emissive props for a hover/focus highlight. */
export function highlight(active: boolean | undefined, color: string) {
  return { emissive: active ? color : "#000000", emissiveIntensity: active ? 0.35 : 0 };
}

const UP = new Vector3(0, 1, 0);

/** A cylinder spanning two points (lamp arms, brackets, rods). */
export function Rod({ from, to, radius = 0.01, children }: { from: Vec3; to: Vec3; radius?: number; children: ReactNode }) {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const dir = b.clone().sub(a);
  const length = dir.length();
  const quaternion = new Quaternion().setFromUnitVectors(UP, dir.normalize());
  const mid = a.add(b).multiplyScalar(0.5);
  return (
    <mesh position={mid} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 10]} />
      {children}
    </mesh>
  );
}

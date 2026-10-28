"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUiStore } from "@/stores/ui";
import { CAMERA } from "./layout";

/**
 * Fixed-camera diorama with gentle parallax. The pointer is tracked on window (not the canvas)
 * so parallax keeps working over the glass UI without letting UI clicks reach the 3D scene.
 */
export function CameraRig() {
  const view = useUiStore((s) => s.view);
  const reduced = useReducedMotion();
  const pointer = useRef({ x: 0, y: 0 });
  const look = useRef(new Vector3(...CAMERA.room.target));
  const goal = useRef({ position: new Vector3(), target: new Vector3() });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, size }, dt) => {
    const g = goal.current;
    const framing = CAMERA[view];
    g.position.set(...framing.position);
    g.target.set(...framing.target);
    if (view === "room") {
      // Narrow (portrait) screens: step back so the desk still fits.
      const aspect = size.width / size.height;
      if (aspect < 1.4) {
        const back = (1.4 - aspect) * 2.6;
        g.position.z += back;
        g.position.y += back * 0.12;
      }
    }
    if (!reduced) {
      const amp = view === "room" ? 1 : 0.15;
      g.position.x += pointer.current.x * 0.2 * amp;
      g.position.y += pointer.current.y * 0.09 * amp;
    }
    const k = reduced ? 1 : 1 - Math.exp(-3 * Math.min(dt, 0.1));
    camera.position.lerp(g.position, k);
    look.current.lerp(g.target, k);
    camera.lookAt(look.current);
  });

  return null;
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Spherical, Vector3 } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUiStore } from "@/stores/ui";
import { FRAMINGS, type Framing } from "./layout";

/** Map a pointer coordinate in [-1, 1] onto an asymmetric [min, max] range (0 stays 0). */
function range(p: number, [min, max]: [number, number]): number {
  return p >= 0 ? p * max : -p * min;
}

/**
 * Camera for the diorama. Standing: gentle parallax. Seated, in bed and in close-ups: the pointer
 * turns your head. The pointer is tracked on window (not the canvas) so it keeps working over the
 * glass UI without letting UI clicks reach the 3D scene.
 */
export function CameraRig() {
  const pose = useUiStore((s) => s.pose);
  const focus = useUiStore((s) => s.focus);
  const reduced = useReducedMotion();
  const pointer = useRef({ x: 0, y: 0 });
  const look = useRef(new Vector3(...FRAMINGS.standing.target));
  const tmp = useRef({ position: new Vector3(), target: new Vector3(), dir: new Vector3(), sph: new Spherical(), last: new Vector3() });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      // While a panel, quick controls or the study view is open, the view holds still.
      const ui = useUiStore.getState();
      if (ui.panel || ui.inspect || ui.focus === "laptop") return;
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera, size, events }, dt) => {
    const t = tmp.current;
    const framing: Framing = FRAMINGS[focus ?? pose];
    t.position.set(...framing.position);
    t.target.set(...framing.target);

    if (!focus && pose === "standing") {
      // Narrow (portrait) screens: step back so the desk still fits.
      const aspect = size.width / size.height;
      if (aspect < 1.4) {
        const back = (1.4 - aspect) * 2.6;
        t.position.z += back;
        t.position.y += back * 0.12;
      }
    }

    const px = reduced ? 0 : pointer.current.x;
    const py = reduced ? 0 : pointer.current.y;
    if (framing.look.kind === "parallax") {
      t.position.x += px * 0.2 * framing.look.amp;
      t.position.y += py * 0.09 * framing.look.amp;
    } else {
      // Positive yaw turns left; moving the pointer right turns right.
      t.dir.subVectors(t.target, t.position);
      t.sph.setFromVector3(t.dir);
      t.sph.theta += range(-px, framing.look.yaw);
      t.sph.phi = Math.min(Math.PI - 0.15, Math.max(0.15, t.sph.phi - range(py, framing.look.pitch)));
      t.dir.setFromSpherical(t.sph);
      t.target.copy(t.position).add(t.dir);
    }

    const k = reduced ? 1 : 1 - Math.exp(-3 * Math.min(dt, 0.1));
    camera.position.lerp(t.position, k);
    look.current.lerp(t.target, k);
    camera.lookAt(look.current);

    // Objects slide under a still pointer while the camera moves: re-check hover so highlights don't stick.
    if (t.last.distanceToSquared(look.current) > 1e-6) events.update?.();
    t.last.copy(look.current);
  });

  return null;
}

"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DirectionalLight, Group, Object3D, PointLight } from "three";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useRoomStore } from "@/stores/room";
import { Asset } from "../assets/Asset";
import { damp } from "../damp";
import { DESK, ROOM, WINDOW } from "../layout";
import { WEATHER_LOOK } from "../palette";
import { useInteractable } from "../useInteractable";
import { Outside } from "../weather/Outside";

const OPEN_ANGLE = 1.15;

/** Click to open or close. Weather (from the quick controls) changes the view, light and sound. */
export function Window() {
  const { open, weather } = useRoomStore((s) => s.window);
  const reduced = useReducedMotion();
  const { active, bind } = useInteractable("window");
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const sun = useRef<DirectionalLight>(null);
  const spill = useRef<PointLight>(null);
  const lightColor = useMemo(() => new Color(WEATHER_LOOK[weather].light), [weather]);
  const sunTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(DESK.x, DESK.topY, DESK.z);
    return o;
  }, []);
  const half = WINDOW.width / 2;
  const z = ROOM.backZ - ROOM.wallThickness / 2;

  useFrame((_, dt) => {
    const angle = open ? OPEN_ANGLE : 0;
    const k = reduced ? 1 : undefined;
    if (left.current) left.current.rotation.y = k ? -angle : damp(left.current.rotation.y, -angle, 4, dt);
    if (right.current) right.current.rotation.y = k ? Math.PI + angle : damp(right.current.rotation.y, Math.PI + angle, 4, dt);

    // Ease light color and strength between weathers.
    const look = WEATHER_LOOK[weather];
    for (const l of [sun.current, spill.current]) {
      if (!l) continue;
      l.color.lerp(lightColor, reduced ? 1 : 1 - Math.exp(-2.5 * Math.min(dt, 0.1)));
    }
    const boost = open ? 1.15 : 1;
    if (sun.current) sun.current.intensity = reduced ? look.lightIntensity * boost : damp(sun.current.intensity, look.lightIntensity * boost, 2.5, dt);
    if (spill.current) spill.current.intensity = reduced ? look.lightIntensity * 0.5 : damp(spill.current.intensity, look.lightIntensity * 0.5, 2.5, dt);
  });

  return (
    <group>
      <Outside weather={weather} />
      <group position={[WINDOW.x, WINDOW.y, z]} {...bind}>
        <Asset id="window.frame" highlight={active} />
        <group ref={left} position={[-half, 0, 0.05]}>
          <Asset id="window.pane" highlight={active} />
        </group>
        {/* Right pane: hinge on the right edge, turned to extend leftward; opens inward at π + angle. */}
        <group ref={right} position={[half, 0, 0.05]} rotation-y={Math.PI}>
          <Asset id="window.pane" highlight={active} />
        </group>
        <Asset id="curtains" />
      </group>
      <primitive object={sunTarget} />
      <directionalLight ref={sun} position={[WINDOW.x - 0.4, 3.4, -5]} target={sunTarget} intensity={WEATHER_LOOK[weather].lightIntensity} />
      <pointLight ref={spill} position={[WINDOW.x, WINDOW.y, ROOM.backZ + 0.45]} distance={4.5} decay={2} />
    </group>
  );
}

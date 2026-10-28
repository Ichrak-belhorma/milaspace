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
/** Behind drawn curtains the window can only be left ajar. */
const AJAR_ANGLE = 0.2;
const CURTAIN_WIDTH = 0.32;
const CURTAIN_Z = 0.16;
/** Curtain panels hang from the rod, 0.16m above the window top. */
const CURTAIN_Y = WINDOW.height / 2 + 0.16 - 0.825;

/**
 * Click to open or close. Weather (from the quick controls) changes the view, light and sound.
 * The curtains are their own clickable object; drawn, they dim the daylight and muffle the outside.
 */
export function Window() {
  const { open, weather } = useRoomStore((s) => s.window);
  const curtainsClosed = useRoomStore((s) => s.curtainsClosed);
  const curtains = useInteractable("curtains");
  const leftCurtain = useRef<Group>(null);
  const rightCurtain = useRef<Group>(null);
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
    const angle = open ? (curtainsClosed ? AJAR_ANGLE : OPEN_ANGLE) : 0;
    const k = reduced ? 1 : undefined;
    if (left.current) left.current.rotation.y = k ? -angle : damp(left.current.rotation.y, -angle, 4, dt);
    if (right.current) right.current.rotation.y = k ? Math.PI + angle : damp(right.current.rotation.y, Math.PI + angle, 4, dt);

    // Curtains: gathered at the sides when open, stretched across the window when drawn.
    const spreadX = curtainsClosed ? half / 2 + 0.03 : half + 0.17;
    const scaleX = curtainsClosed ? (half + 0.1) / CURTAIN_WIDTH : 1;
    for (const [g, side] of [[leftCurtain.current, -1], [rightCurtain.current, 1]] as const) {
      if (!g) continue;
      g.position.x = k ? side * spreadX : damp(g.position.x, side * spreadX, 3.5, dt);
      g.scale.x = k ? scaleX : damp(g.scale.x, scaleX, 3.5, dt);
    }

    // Ease light color and strength between weathers.
    const look = WEATHER_LOOK[weather];
    for (const l of [sun.current, spill.current]) {
      if (!l) continue;
      l.color.lerp(lightColor, reduced ? 1 : 1 - Math.exp(-2.5 * Math.min(dt, 0.1)));
    }
    const boost = (open ? 1.15 : 1) * (curtainsClosed ? 0.22 : 1);
    if (sun.current) sun.current.intensity = reduced ? look.lightIntensity * boost : damp(sun.current.intensity, look.lightIntensity * boost, 2.5, dt);
    const spillLevel = look.lightIntensity * 0.5 * (curtainsClosed ? 0.25 : 1);
    if (spill.current) spill.current.intensity = reduced ? spillLevel : damp(spill.current.intensity, spillLevel, 2.5, dt);
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
        <group position={[0, 0, CURTAIN_Z]} {...curtains.bind}>
          <Asset id="curtain.rod" />
          <group ref={leftCurtain} position={[-(half + 0.17), CURTAIN_Y, 0]}>
            <Asset id="curtain.panel" highlight={curtains.active} />
          </group>
          <group ref={rightCurtain} position={[half + 0.17, CURTAIN_Y, 0]}>
            <Asset id="curtain.panel" highlight={curtains.active} />
          </group>
        </group>
      </group>
      <primitive object={sunTarget} />
      <directionalLight ref={sun} position={[WINDOW.x - 0.4, 3.4, -5]} target={sunTarget} intensity={WEATHER_LOOK[weather].lightIntensity} />
      <pointLight ref={spill} position={[WINDOW.x, WINDOW.y, ROOM.backZ + 0.45]} distance={4.5} decay={2} />
    </group>
  );
}

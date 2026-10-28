"use client";

import { useRoomStore } from "@/stores/room";
import { useThemeStore } from "@/stores/theme";
import { BurningCandle } from "./objects/Progress";
import { POSITIONS } from "./layout";
import { WEATHER_LOOK } from "./palette";

/** Base lighting: theme ambient (scaled by the weather) plus the theme's accent light (a candle). */
export function Lighting() {
  const room = useThemeStore((s) => s.active.room);
  const weather = useRoomStore((s) => s.window.weather);
  const ambient = room.ambientIntensity * WEATHER_LOOK[weather].ambient;
  const [sx, sy, sz] = POSITIONS.shelf;
  const candle: [number, number, number] = [sx + 0.3, sy + 0.015, sz + 0.11];

  return (
    <>
      <ambientLight color={room.ambientColor} intensity={ambient * 1.1} />
      <hemisphereLight color={room.ambientColor} groundColor={room.floor} intensity={ambient * 0.7} />
      <group position={candle}>
        <BurningCandle lit={Math.min(1, room.accentLightIntensity)} />
        <pointLight position={[0, 0.16, 0.05]} color={room.accentLight} intensity={room.accentLightIntensity * 0.35} distance={2.5} decay={2} />
      </group>
    </>
  );
}

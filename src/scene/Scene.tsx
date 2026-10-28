"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { closeDrawer } from "@/stores/actions";
import { useQualityStore } from "@/stores/quality";
import { useThemeStore } from "@/stores/theme";
import { useUiStore } from "@/stores/ui";
import { CameraRig } from "./CameraRig";
import { CAMERA } from "./layout";
import { Lighting } from "./Lighting";
import { Room } from "./Room";

/**
 * The 3D study room. Lowers resolution and turns off the lamp's shadow when the frame rate falls,
 * so it stays smooth on mid-range laptops. (Only one light casts shadows; toggling it is cheap.)
 */
export default function Scene() {
  const dpr = useQualityStore((s) => s.dpr);
  const { decline, incline } = useQualityStore.getState();
  const background = useThemeStore((s) => s.active.tokens.background);

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, dpr]}
      camera={{ position: CAMERA.room.position, fov: CAMERA.room.fov, near: 0.05, far: 60 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => {
        if (useUiStore.getState().view === "drawer") closeDrawer();
        else useUiStore.getState().setInspect(null);
      }}
    >
      <PerformanceMonitor onDecline={decline} onIncline={incline} />
      <color attach="background" args={[background]} />
      <CameraRig />
      <Lighting />
      <Room />
    </Canvas>
  );
}

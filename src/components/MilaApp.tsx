"use client";

import dynamic from "next/dynamic";
import { AudioBridge, KeyboardShortcuts, MotionApplier, ThemeApplier } from "./bridges";
import { Hud } from "./chrome/Hud";
import { TimerController } from "./chrome/TimerController";

// three.js is large: the room streams in after the UI is interactive.
const Scene = dynamic(() => import("@/scene/Scene"), { ssr: false });

export default function MilaApp() {
  return (
    <>
      <ThemeApplier />
      <MotionApplier />
      <KeyboardShortcuts />
      <AudioBridge />
      <TimerController />
      {/* The canvas is decorative for assistive tech: every object is reachable from the object bar. */}
      <div className="fixed inset-0 z-0" aria-hidden>
        <Scene />
      </div>
      <Hud />
    </>
  );
}

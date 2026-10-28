"use client";

import { useUiStore } from "@/stores/ui";
import { AmbiencePanel } from "./AmbiencePanel";
import { Navbar } from "./Navbar";
import { NotebookPanel } from "./NotebookPanel";
import { ObjectBar } from "./ObjectBar";
import { ObjectInspector } from "./ObjectInspector";
import { StudyView } from "./StudyView";
import { ThemeEditor } from "./ThemeEditor";
import { TimerPanel } from "./TimerPanel";
import { TimerWidget } from "./TimerWidget";
import { Toast } from "./Toast";

const PANELS = {
  theme: ThemeEditor,
  ambience: AmbiencePanel,
  notebook: NotebookPanel,
  timer: TimerPanel,
} as const;

/**
 * Glass UI over the room. The layer ignores pointer events so the room stays clickable;
 * each surface opts back in. The timer is always on screen, whatever else is open.
 */
export function Hud() {
  const panel = useUiStore((s) => s.panel);
  const view = useUiStore((s) => s.view);
  const Panel = panel ? PANELS[panel] : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      <Navbar />
      <main className="absolute inset-0">
        <h1 className="sr-only">Mila study room</h1>
        {view === "laptop" && (
          <div className="absolute inset-x-3 top-24 bottom-44 sm:bottom-28">
            <StudyView />
          </div>
        )}
        {Panel && (
          <div className="absolute top-28 right-3 bottom-44 left-3 flex justify-end sm:left-auto sm:bottom-28 xl:bottom-3">
            <Panel />
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="order-2 sm:order-1">
            <TimerWidget />
          </div>
          <div className="order-1 flex flex-col items-center gap-2 sm:order-2 sm:absolute sm:inset-x-0 sm:bottom-0 sm:mx-auto sm:w-fit">
            <ObjectInspector />
            <Toast />
            <ObjectBar />
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { CloseIcon } from "@/components/icons";
import { closeDrawer } from "@/stores/actions";
import type { RoomObjectId } from "@/stores/room";
import { useUiStore } from "@/stores/ui";
import { BedControls } from "./inspectors/BedControls";
import { DrinkPicker } from "./inspectors/DrinkPicker";
import { PaintingControls } from "./inspectors/PaintingControls";
import { PhoneScreen } from "./inspectors/PhoneScreen";
import { DrawerContents, LampControls, WindowControls } from "./inspectors/RoomControls";

const INSPECTORS: Partial<Record<RoomObjectId, { title: string; body: () => ReactNode; wide?: boolean }>> = {
  lamp: { title: "Desk lamp", body: LampControls },
  window: { title: "Window", body: WindowControls },
  drawer: { title: "Drawer", body: DrawerContents },
  mug: { title: "What are you drinking?", body: DrinkPicker, wide: true },
  painting: { title: "Painting", body: PaintingControls },
  phone: { title: "Phone", body: PhoneScreen },
  bed: { title: "In bed", body: BedControls },
};

/** Quick controls for the object you just used (lamp, window, drink, painting, phone, bed…). */
export function ObjectInspector() {
  const inspect = useUiStore((s) => s.inspect);
  const sleeping = useUiStore((s) => s.sleeping);
  const setInspect = useUiStore((s) => s.setInspect);
  const spec = inspect ? INSPECTORS[inspect] : undefined;
  if (!inspect || !spec || sleeping) return null;

  const Body = spec.body;
  const close = () => (inspect === "drawer" ? closeDrawer() : setInspect(null));
  return (
    <GlassSurface
      as="section"
      aria-label={spec.title}
      edges={["top"]}
      ornamentScale={0.7}
      className={`anim-rise pointer-events-auto w-full ${spec.wide ? "max-w-md" : "max-w-sm"}`}
      contentClassName="flex flex-col gap-3 p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base">{spec.title}</h2>
        <button type="button" className="btn btn-icon min-h-8 min-w-8 p-1" onClick={close} aria-label={inspect === "drawer" ? "Close the drawer" : `Close ${spec.title}`}>
          <CloseIcon size={16} />
        </button>
      </div>
      <Body />
    </GlassSurface>
  );
}

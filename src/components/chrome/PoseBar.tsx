"use client";

import { GlassSurface } from "@/components/glass/GlassSurface";
import { ChevronLeftIcon, MoonIcon, StandIcon } from "@/components/icons";
import { OBJECT_LABELS } from "@/stores/actions";
import { isCloseup, useUiStore } from "@/stores/ui";

/** Where you are, and the way back: close-up → desk → standing; bed → get up. */
export function PoseBar() {
  const pose = useUiStore((s) => s.pose);
  const focus = useUiStore((s) => s.focus);
  const sleeping = useUiStore((s) => s.sleeping);
  const inspect = useUiStore((s) => s.inspect);
  const { setFocus, setPose, setInspect } = useUiStore.getState();
  const closeup = focus && isCloseup(focus) ? focus : null;
  if (sleeping || pose === "standing" || focus === "laptop" || focus === "drawer") return null;

  const label = closeup ? `Looking at the ${OBJECT_LABELS[closeup].toLowerCase()}` : pose === "seated" ? "At your desk" : "In bed";
  return (
    <GlassSurface as="section" aria-label="Where you are" edges={[]} className="pointer-events-auto" contentClassName="flex items-center gap-2 py-1 pr-1 pl-3 text-sm">
      <span className="font-semibold">{label}</span>
      {closeup && (
        <button type="button" className="btn min-h-8 px-2 py-1 text-sm" onClick={() => setFocus(null)}>
          <ChevronLeftIcon size={16} /> Back
        </button>
      )}
      {pose === "lying" && inspect !== "bed" && (
        <button type="button" className="btn min-h-8 px-2 py-1 text-sm" onClick={() => setInspect("bed")}>
          <MoonIcon size={16} /> Sleep
        </button>
      )}
      <button type="button" className="btn btn-soft min-h-8 px-2 py-1 text-sm" onClick={() => setPose("standing")}>
        <StandIcon size={16} /> {pose === "lying" ? "Get up" : "Stand up"}
      </button>
    </GlassSurface>
  );
}

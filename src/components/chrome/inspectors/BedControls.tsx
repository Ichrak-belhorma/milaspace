"use client";

import { useState } from "react";
import { Segmented } from "@/components/glass/controls";
import { MoonIcon, StandIcon } from "@/components/icons";
import { useUiStore } from "@/stores/ui";

const NAPS = [
  { value: "rest", label: "Just rest", minutes: null },
  { value: "10", label: "10 min", minutes: 10 },
  { value: "20", label: "20 min", minutes: 20 },
  { value: "30", label: "30 min", minutes: 30 },
] as const;
type NapValue = (typeof NAPS)[number]["value"];

/** In bed: close your eyes (with an optional nap alarm) or get up. */
export function BedControls() {
  const [nap, setNap] = useState<NapValue>("20");
  const { sleep, setPose, announce } = useUiStore.getState();
  return (
    <>
      <p className="text-sm text-ink-muted">Move the mouse to look around. A short nap can reset a tired brain.</p>
      <Segmented<NapValue> label="Nap length" value={nap} options={NAPS.map((n) => ({ value: n.value, label: n.label }))} onChange={setNap} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-accent text-sm"
          onClick={() => {
            const minutes = NAPS.find((n) => n.value === nap)?.minutes ?? null;
            sleep(minutes);
            announce(minutes ? `Sleeping. Alarm in ${minutes} minutes.` : "Resting your eyes.");
          }}
        >
          <MoonIcon size={16} /> Close my eyes
        </button>
        <button type="button" className="btn btn-soft text-sm" onClick={() => setPose("standing")}>
          <StandIcon size={16} /> Get up
        </button>
      </div>
    </>
  );
}

"use client";

import { Switch } from "@/components/glass/controls";
import { PlayIcon } from "@/components/icons";
import { justStart } from "@/stores/focusActions";
import { useRoomStore } from "@/stores/room";
import { useTimerStore } from "@/stores/timer";

/** Body doubling: someone working quietly nearby makes it easier to start and keep going. */
export function BuddyControls() {
  const visible = useRoomStore((s) => s.buddy.visible);
  const setVisible = useRoomStore((s) => s.setBuddyVisible);
  const timer = useTimerStore((s) => s.timer);
  const working = timer.status === "running" && timer.phase === "focus";
  const onBreak = timer.status === "running" && timer.phase !== "focus";
  return (
    <>
      <p className="text-sm text-ink-muted">
        {working ? "Heads down, working alongside you." : onBreak ? "Taking a break with you. Stretch!" : "Reading quietly. They'll get to work when you do."}
      </p>
      {!working && (
        <button type="button" className="btn btn-accent text-sm" onClick={justStart}>
          <PlayIcon size={14} /> Start together (5 minutes)
        </button>
      )}
      <Switch label="Show study buddy" checked={visible} onChange={setVisible} />
    </>
  );
}

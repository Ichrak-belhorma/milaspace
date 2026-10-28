"use client";

import { GlassSurface } from "@/components/glass/GlassSurface";
import { resolveCheckIn } from "@/stores/focusActions";
import { useTimerStore } from "@/stores/timer";

/**
 * When a focus run tied to a task ends: done, more time, or stuck. After a 5-minute starter:
 * keep going or stop. No judgement either way.
 */
export function CheckInPrompt() {
  const check = useTimerStore((s) => s.checkIn);
  if (!check) return null;
  const title = check.title || "that";
  return (
    <GlassSurface as="section" aria-label="How did it go?" edges={["top"]} ornamentScale={0.7} className="anim-rise pointer-events-auto w-full max-w-md" contentClassName="flex flex-col gap-3 p-4">
      {check.starter ? (
        <>
          <h2 className="font-display text-base">Five minutes done. You started!</h2>
          <p className="text-sm text-ink-muted">That was the hard part. Keep the momentum for a full session?</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn btn-accent text-sm" onClick={() => resolveCheckIn("keep-going")} autoFocus>
              Keep going
            </button>
            <button type="button" className="btn btn-soft text-sm" onClick={() => resolveCheckIn("later")}>
              That&rsquo;s enough for now
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display text-base">How did it go?</h2>
          <p className="text-sm text-ink-muted">{title}</p>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn btn-accent text-sm" onClick={() => resolveCheckIn("done")} autoFocus>
              Done
            </button>
            <button type="button" className="btn btn-soft text-sm" onClick={() => resolveCheckIn("more")}>
              Need more time
            </button>
            <button type="button" className="btn btn-soft text-sm" onClick={() => resolveCheckIn("stuck")}>
              I&rsquo;m stuck
            </button>
          </div>
        </>
      )}
    </GlassSurface>
  );
}

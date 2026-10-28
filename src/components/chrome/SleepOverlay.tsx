"use client";

import { useEffect, useRef } from "react";
import { audioEngine } from "@/audio/engine";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { SunIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { useUiStore } from "@/stores/ui";

/** Soft sheet sounds when you look around in bed: triggered by pointer movement, throttled. */
function useBedRustle(active: boolean) {
  const last = useRef({ x: 0, y: 0, distance: 0, rustledAt: 0 });
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      const l = last.current;
      l.distance += Math.hypot(e.clientX - l.x, e.clientY - l.y);
      l.x = e.clientX;
      l.y = e.clientY;
      const now = performance.now();
      if (l.distance > 140 && now - l.rustledAt > 550) {
        audioEngine.sfx("rustle");
        l.rustledAt = now;
        l.distance = 0;
      }
    };
    // Movement settles: forget small drifts so only real turns rustle.
    const decay = setInterval(() => (last.current.distance *= 0.5), 250);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      clearInterval(decay);
      window.removeEventListener("pointermove", onMove);
    };
  }, [active]);
}

function NapAlarm({ endsAt }: { endsAt: number }) {
  const now = useNow(1000);
  const left = Math.max(0, endsAt - now);
  useEffect(() => {
    const t = setTimeout(
      () => {
        const ui = useUiStore.getState();
        if (!ui.sleeping) return;
        ui.wake();
        audioEngine.sfx("chime");
        ui.announce("Nap over. Welcome back.");
      },
      Math.max(0, endsAt - Date.now()),
    );
    return () => clearTimeout(t);
  }, [endsAt]);
  const m = Math.floor(left / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <span className="text-xs text-ink-muted tabular-nums">
      Alarm in {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

/**
 * Eyelids that close to a soft slit (the room stays faintly visible and you can still look around),
 * ZZZs drifting up from you, and the way to wake up. Always mounted so the lids can animate both ways.
 */
export function SleepOverlay() {
  const sleeping = useUiStore((s) => s.sleeping);
  const lying = useUiStore((s) => s.pose === "lying");
  const napEndsAt = useUiStore((s) => s.napEndsAt);
  const wake = useUiStore((s) => s.wake);
  useBedRustle(lying);

  return (
    <div className="sleep" data-closed={sleeping || undefined} aria-hidden={!sleeping}>
      <div className="sleep__lid sleep__lid--top" />
      <div className="sleep__lid sleep__lid--bottom" />
      {sleeping && (
        <>
          <div className="sleep__zzz" aria-hidden>
            <span>Z</span>
            <span>z</span>
            <span>Z</span>
          </div>
          <div className="pointer-events-none fixed inset-x-0 bottom-[22vh] z-40 flex justify-center px-3">
            <GlassSurface as="section" aria-label="Sleeping" edges={[]} className="pointer-events-auto" contentClassName="flex items-center gap-3 py-1.5 pr-1.5 pl-4">
              <span className="font-display text-sm">Sleeping</span>
              {napEndsAt && <NapAlarm endsAt={napEndsAt} />}
              <button type="button" className="btn btn-accent min-h-8 px-3 py-1 text-sm" onClick={wake} autoFocus>
                <SunIcon size={16} /> Wake up
              </button>
            </GlassSurface>
          </div>
        </>
      )}
    </div>
  );
}

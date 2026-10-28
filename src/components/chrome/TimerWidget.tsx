"use client";

import { GlassSurface } from "@/components/glass/GlassSurface";
import { FlameIcon, PauseIcon, PlayIcon, ResetIcon, SkipIcon, SlidersIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { dayKey } from "@/lib/day";
import { useTimerStore } from "@/stores/timer";
import { useUiStore } from "@/stores/ui";
import { durationMs, formatClock, remainingMs, type Phase } from "@/timer/machine";
import { currentStreak, minutesOn } from "@/timer/stats";

export const PHASE_LABEL: Record<Phase, string> = { focus: "Focus", shortBreak: "Short break", longBreak: "Long break" };

/** Always-visible focus timer. Lives over the room and never gets covered by customization panels. */
export function TimerWidget() {
  const timer = useTimerStore((s) => s.timer);
  const settings = useTimerStore((s) => s.settings);
  const sessions = useTimerStore((s) => s.sessions);
  const { toggle, skip, reset } = useTimerStore.getState();
  const panel = useUiStore((s) => s.panel);
  const togglePanel = useUiStore((s) => s.togglePanel);
  const now = useNow(timer.status === "running" ? 500 : 30_000);

  const left = remainingMs(timer, now);
  const total = durationMs(timer.phase, settings);
  const progress = total > 0 ? 1 - left / total : 0;
  const today = minutesOn(sessions, dayKey(now));
  const streak = currentStreak(sessions, now);
  const running = timer.status === "running";

  return (
    <GlassSurface
      as="section"
      aria-label="Focus timer"
      edges={["top"]}
      ornamentScale={0.7}
      className="pointer-events-auto w-full sm:w-72"
      contentClassName="flex flex-col gap-3 p-4"
    >
      <div className="flex items-center justify-between">
        <span className="label" aria-live="polite">
          {PHASE_LABEL[timer.phase]}
          {timer.phase === "focus" && ` · ${timer.cycleCount + 1}/${settings.longBreakEvery}`}
        </span>
        <button
          type="button"
          className="btn btn-icon min-h-8 min-w-8 p-1"
          onClick={() => togglePanel("timer")}
          aria-expanded={panel === "timer"}
          aria-label="Timer settings and history"
        >
          <SlidersIcon size={16} />
        </button>
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className="font-display text-5xl leading-none tabular-nums" role="timer" aria-label={`${formatClock(left)} remaining`}>
          {formatClock(left)}
        </span>
        <span className="flex flex-col items-end text-xs text-ink-muted">
          <span>{Math.round(today)} min today</span>
          <span className="flex items-center gap-1" title="A day counts once you focus for 10 minutes">
            <FlameIcon size={13} /> {streak > 0 ? `${streak}-day streak` : "No streak yet"}
          </span>
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-ink/15" aria-hidden>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn btn-accent flex-1" onClick={toggle}>
          {running ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          {running ? "Pause" : timer.status === "paused" ? "Resume" : "Start"}
        </button>
        <button type="button" className="btn btn-soft btn-icon" onClick={reset} aria-label="Restart this phase" title="Restart this phase">
          <ResetIcon size={18} />
        </button>
        <button type="button" className="btn btn-soft btn-icon" onClick={skip} aria-label="Skip to next phase" title="Skip to next phase">
          <SkipIcon size={18} />
        </button>
      </div>
    </GlassSurface>
  );
}

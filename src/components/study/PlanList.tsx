"use client";

import { CheckIcon, PlayIcon, SkipIcon } from "@/components/icons";
import { useStudyStore, useStudyTasksForToday } from "@/stores/study";
import { useTimerStore } from "@/stores/timer";
import { KindBadge, minutesLabel } from "./shared";

/** Today's generated study tasks across modules: check off, skip (it moves), or start focusing on one. */
export function PlanList({ compact = false }: { compact?: boolean }) {
  const tasks = useStudyTasksForToday();
  const modules = useStudyStore((s) => s.modules);
  const setTaskStatus = useStudyStore((s) => s.setTaskStatus);
  const timerStatus = useTimerStore((s) => s.timer.status);
  const timerPhase = useTimerStore((s) => s.timer.phase);
  const toggleTimer = useTimerStore((s) => s.toggle);
  const canStart = timerStatus !== "running" && timerPhase === "focus";

  return (
    <ul className="flex flex-col gap-1.5">
      {tasks.map((t) => {
        const mod = modules.find((m) => m.id === t.moduleId);
        return (
          <li key={t.id} className="well flex items-center gap-2 px-2 py-1.5">
            <input id={`st-${t.id}`} type="checkbox" className="h-4 w-4 shrink-0" checked={t.status === "done"} onChange={() => setTaskStatus(t.id, t.status === "done" ? "todo" : "done")} />
            {!compact && <KindBadge kind={t.kind} />}
            <label htmlFor={`st-${t.id}`} className={`min-w-0 flex-1 text-sm ${t.status !== "todo" ? "text-ink-muted line-through" : ""}`}>
              <span className="block truncate">{t.title}</span>
              <span className="block text-xs text-ink-muted">
                {mod?.name} · {minutesLabel(t.estMinutes)}
              </span>
            </label>
            {t.status === "todo" && (
              <>
                {canStart && !compact && (
                  <button type="button" className="btn btn-icon min-h-8 min-w-8 p-1" onClick={toggleTimer} aria-label={`Start a focus session for ${t.title}`} title="Start focusing">
                    <PlayIcon size={14} />
                  </button>
                )}
                <button type="button" className="btn btn-icon min-h-8 min-w-8 p-1" onClick={() => setTaskStatus(t.id, "skipped")} aria-label={`Skip ${t.title}`} title="Skip (it moves to another day)">
                  <SkipIcon size={14} />
                </button>
              </>
            )}
            {t.status === "done" && <CheckIcon size={16} className="shrink-0 text-accent" />}
          </li>
        );
      })}
    </ul>
  );
}

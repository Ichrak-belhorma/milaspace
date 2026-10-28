"use client";

import { TodoList } from "@/components/chrome/TodoList";
import { useStudyStore, useStudyTasksForToday } from "@/stores/study";
import { useUiStore } from "@/stores/ui";
import { PlanList } from "./PlanList";
import { EmptyState, minutesLabel } from "./shared";

/** Today's plan across modules (reviews first), plus your own to-dos. */
export function TodayTab() {
  const tasks = useStudyTasksForToday();
  const modules = useStudyStore((s) => s.modules);
  const plans = useStudyStore((s) => s.plans);
  const setStudyTab = useUiStore((s) => s.setStudyTab);

  const total = tasks.filter((t) => t.status === "todo").reduce((s, t) => s + t.estMinutes, 0);
  const done = tasks.filter((t) => t.status === "done").length;
  const warnings = modules.flatMap((m) => (plans[m.id]?.warnings ?? []).filter((w) => w.kind !== "no-units").map((w) => ({ module: m.name, ...w })));

  return (
    <div className="grid gap-5 md:grid-cols-[1fr_17rem]">
      <section aria-labelledby="plan-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 id="plan-heading" className="label">
            Your plan for today
          </h3>
          {tasks.length > 0 && (
            <span className="text-xs text-ink-muted" aria-live="polite">
              {done} done · {minutesLabel(total)} left
            </span>
          )}
        </div>
        {warnings.map((w) => (
          <p key={`${w.module}-${w.kind}`} role="note" className="well px-3 py-2 text-sm">
            <span className="font-semibold">{w.module}:</span> {w.message}
          </p>
        ))}
        {modules.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <EmptyState>Add a module (with its exam date and outline) and Mila plans each day backwards from the exam.</EmptyState>
            <button type="button" className="btn btn-accent text-sm" onClick={() => setStudyTab("modules")}>
              Add your first module
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState>Nothing planned for today. Rest is part of the plan.</EmptyState>
        ) : (
          <PlanList />
        )}
      </section>
      <section aria-labelledby="todo-heading">
        <h3 id="todo-heading" className="label mb-2">
          Your own to-dos
        </h3>
        <TodoList />
      </section>
    </div>
  );
}

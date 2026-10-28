"use client";

import { NotebookIcon } from "@/components/icons";
import { PlanList } from "@/components/study/PlanList";
import { useStudyTasksForToday } from "@/stores/study";
import { SidePanel } from "./SidePanel";
import { TodoList } from "./TodoList";

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

/** Today's page: the generated study plan first, then your own to-dos. */
export function NotebookPanel() {
  const planned = useStudyTasksForToday();
  return (
    <SidePanel title="Today" icon={<NotebookIcon size={18} />}>
      <p className="mb-3 font-display text-ink-muted">{dateFmt.format(new Date())}</p>
      {planned.length > 0 && (
        <section aria-labelledby="nb-plan" className="mb-4">
          <h3 id="nb-plan" className="label mb-2">
            Study plan
          </h3>
          <PlanList compact />
        </section>
      )}
      <section aria-labelledby="nb-todos">
        {planned.length > 0 && (
          <h3 id="nb-todos" className="label mb-2">
            Your to-dos
          </h3>
        )}
        <TodoList autoFocus />
      </section>
    </SidePanel>
  );
}

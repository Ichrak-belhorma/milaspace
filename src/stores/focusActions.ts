import { dayKey } from "@/lib/day";
import type { StudyTask } from "@/study/types";
import { useScheduleStore } from "./schedule";
import { useStudyStore } from "./study";
import { useTimerStore } from "./timer";
import { useUiStore } from "./ui";

/** Start a pomodoro tied to a planned task. */
export function focusOnTask(task: StudyTask): void {
  useTimerStore.getState().startTask({ taskId: task.id, moduleId: task.moduleId, title: task.title });
  useUiStore.getState().announce(`Focusing on ${task.title}`);
}

/** The next unfinished task today, earliest block first. */
export function nextTaskToday(): StudyTask | null {
  const { tasks, plannedFor } = useStudyStore.getState();
  const today = plannedFor ?? dayKey(Date.now());
  return tasks.filter((t) => t.date === today && t.status === "todo").sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999))[0] ?? null;
}

/**
 * "Just start": starting is the hardest part, so commit to five minutes on the next task (or on
 * anything, if nothing is planned). After five minutes Mila asks whether to keep going.
 */
export function justStart(): void {
  const task = nextTaskToday();
  useTimerStore.getState().startTask(task ? { taskId: task.id, moduleId: task.moduleId, title: task.title } : null, { starter: true });
  useUiStore.getState().announce(task ? `Just five minutes on ${task.title}. That's all.` : "Just five minutes. Pick anything small.");
}

export type CheckInOutcome = "done" | "more" | "stuck" | "keep-going" | "later";

/** Answer the end-of-session question. Finished tasks teach Mila how long things take you. */
export function resolveCheckIn(outcome: CheckInOutcome): void {
  const timer = useTimerStore.getState();
  const check = timer.checkIn;
  if (!check) return;
  const study = useStudyStore.getState();
  const task = study.tasks.find((t) => t.id === check.taskId);
  const ui = useUiStore.getState();
  timer.clearCheckIn();

  switch (outcome) {
    case "done": {
      if (task) {
        const actual = timer.sessions.filter((s) => s.taskId === task.id).reduce((m, s) => m + s.minutes, 0);
        if (task.kind === "learn" || task.kind === "practice") useScheduleStore.getState().recordPace(task.estMinutes, actual);
        study.setTaskStatus(task.id, "done");
      }
      timer.clearActiveTask();
      ui.announce("Done. Nice work.");
      break;
    }
    case "more":
    case "keep-going":
      if (task) focusOnTask(task);
      else timer.startTask(null);
      break;
    case "stuck":
      if (task) study.markStuck(task.id);
      timer.clearActiveTask();
      ui.announce("Noted. It's planned for another try tomorrow, with a different approach.");
      break;
    case "later":
      timer.clearActiveTask();
      break;
  }
}

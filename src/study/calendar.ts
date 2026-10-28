import { dayKey } from "@/lib/day";
import type { FocusSession } from "@/timer/machine";
import { minutesByDay, STREAK_MIN_MINUTES } from "@/timer/stats";
import type { Module, StudyTask } from "./types";

/** A month as weeks (Monday first); days outside the month are null. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month - 1, 1);
  const days = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => dayKey(new Date(year, month - 1, i + 1, 12).getTime()))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type CalendarMarks = {
  /** Exam days → module names. */
  exams: Map<string, string[]>;
  /** Days that count for the chain: 10+ focus minutes or a finished study task. */
  done: Set<string>;
};

export function calendarMarks(modules: Module[], tasks: StudyTask[], sessions: FocusSession[]): CalendarMarks {
  const exams = new Map<string, string[]>();
  for (const m of modules) if (m.examDate) exams.set(m.examDate, [...(exams.get(m.examDate) ?? []), m.name]);
  const done = new Set<string>();
  for (const [day, minutes] of minutesByDay(sessions)) if (minutes >= STREAK_MIN_MINUTES) done.add(day);
  for (const t of tasks) if (t.status === "done") done.add(t.completedAt ? dayKey(t.completedAt) : t.date);
  return { exams, done };
}

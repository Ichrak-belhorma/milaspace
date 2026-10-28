import { addDays, dayKey, diffDays } from "@/lib/day";
import type { ContentType, StudyTask, TaskKind } from "./types";

/**
 * Backward planner. Pure: same input, same plan (task ids are deterministic), so it can run on
 * every load and after every review without churning the user's list.
 *
 * Rules:
 * - Done/skipped tasks and manual tasks are history: always kept, never rewritten.
 * - Every unfinished auto task is re-planned from today (missed work rolls forward).
 * - Exam mode keeps a review buffer before the exam: max(2 days, 15% of the window).
 * - Each learned unit gets reviews 1, 3 and 7 days later; shaky units (low mastery) get an extra one.
 * - Buffer days interleave several units in one mixed practice session.
 * - If the material does not fit the daily budget, the plan still fits it into the window
 *   and says so (it never silently overpacks).
 */

export type Unit = { nodeId: string; title: string; contentType: ContentType; estMinutes: number; mastery: number };

export type PlanInput = {
  moduleId: string;
  moduleName: string;
  examDate: string | null;
  dailyMinutes: number;
  /** Leaf curriculum nodes in study order. */
  units: Unit[];
  today: string;
  /** Every task currently stored for this module. */
  existing: StudyTask[];
  /** Flashcards due today for this module. */
  dueCards: number;
};

export type PlanWarning = { kind: "overloaded" | "exam-passed" | "exam-today" | "no-units"; message: string };

export type PlanSummary = {
  examMode: boolean;
  windowDays: number;
  bufferDays: number;
  learnDays: number;
  unitsLeft: number;
  minutesLeft: number;
  /** Minutes of new material per day the plan schedules. */
  pace: number;
  /** Day the last new material is planned (null when nothing is left). */
  finishDate: string | null;
};

export type PlanResult = { tasks: StudyTask[]; warnings: PlanWarning[]; summary: PlanSummary };

export const LEARN_SHARE = 0.7;
export const REVIEW_OFFSETS = [1, 3, 7] as const;
export const MASTERED = 0.8;
export const WEAK = 0.4;
const REVIEW_MINUTES: Record<ContentType, number> = { memorize: 10, conceptual: 10, math: 15, coding: 15 };

export function bufferDaysFor(windowDays: number): number {
  if (windowDays >= 4) return Math.min(windowDays - 1, Math.max(2, Math.ceil(windowDays * 0.15)));
  return windowDays >= 2 ? 1 : 0;
}

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}

export function planModule(input: PlanInput): PlanResult {
  const { moduleId, today, dailyMinutes } = input;
  const warnings: PlanWarning[] = [];
  const generated: StudyTask[] = [];

  // 1. History and the user's own tasks stay as they are.
  const kept = input.existing.filter((t) => t.moduleId === moduleId && (t.source === "manual" || t.status !== "todo"));
  const keptIds = new Set(kept.map((t) => t.id));
  const doneOn = (kind: TaskKind, nodeId: string, date: string) =>
    kept.some((t) => t.kind === kind && t.nodeId === nodeId && t.date === date && t.status === "done");

  const add = (t: Omit<StudyTask, "id" | "moduleId" | "status" | "source" | "completedAt">, key: string) => {
    const id = `auto:${moduleId}:${t.kind}:${key}:${t.date}`;
    if (keptIds.has(id) || generated.some((g) => g.id === id)) return;
    generated.push({ ...t, id, moduleId, status: "todo", source: "auto", completedAt: null });
  };

  // 2. What has been learned already, and when.
  const learnedMinutes = new Map<string, number>();
  const learnedOn = new Map<string, string>();
  for (const t of kept) {
    if (t.kind !== "learn" || t.status !== "done" || !t.nodeId) continue;
    learnedMinutes.set(t.nodeId, (learnedMinutes.get(t.nodeId) ?? 0) + t.estMinutes);
    const day = t.completedAt ? dayKey(t.completedAt) : t.date;
    if (!learnedOn.has(t.nodeId) || day > learnedOn.get(t.nodeId)!) learnedOn.set(t.nodeId, day);
  }
  const remaining = input.units
    .map((u) => ({ unit: u, minutes: Math.max(0, u.estMinutes - (learnedMinutes.get(u.nodeId) ?? 0)) }))
    .filter((r) => r.unit.mastery < MASTERED && r.minutes >= Math.min(10, r.unit.estMinutes * 0.1));
  const minutesLeft = remaining.reduce((s, r) => s + r.minutes, 0);

  // 3. The window.
  const examMode = input.examDate !== null;
  const windowDays = examMode ? diffDays(today, input.examDate!) : 0;
  if (examMode && windowDays < 0) warnings.push({ kind: "exam-passed", message: "This exam date has passed. Set a new date or clear it to keep studying at your own pace." });
  if (examMode && windowDays === 0) warnings.push({ kind: "exam-today", message: "Exam today: just a light review. You've got this." });
  if (input.units.length === 0) warnings.push({ kind: "no-units", message: "Add the course outline to get a day-by-day plan." });

  const bufferDays = examMode && windowDays > 0 ? bufferDaysFor(windowDays) : 0;
  const learnDays = examMode ? Math.max(0, windowDays - bufferDays) : Infinity;
  const budget = dailyMinutes * LEARN_SHARE;
  const pace = examMode && learnDays > 0 && learnDays !== Infinity ? Math.max(budget, minutesLeft / learnDays) : budget;
  if (examMode && learnDays > 0 && minutesLeft / learnDays > dailyMinutes) {
    warnings.push({
      kind: "overloaded",
      message: `This plan needs about ${fmtMinutes(minutesLeft / learnDays)} of new material a day, more than your ${fmtMinutes(dailyMinutes)} budget. Raise the budget, trim topics, or focus on what matters most.`,
    });
  }

  // 4. Learn tasks: split big units into day-sized parts, then pack days in order.
  const lastLearnDay = new Map<string, string>();
  let finishDate: string | null = null;
  if (learnDays > 0 && minutesLeft > 0) {
    let day = 0;
    let used = 0;
    for (const { unit, minutes } of remaining) {
      const parts = Math.max(1, Math.ceil(minutes / (pace * 1.1)));
      for (let p = 1; p <= parts; p++) {
        const chunk = Math.round(minutes / parts);
        if (used > 0 && used + chunk > pace * 1.1) {
          day += 1;
          used = 0;
        }
        if (day >= learnDays) day = learnDays - 1; // overloaded: squeeze into the last learning day
        let date = addDays(today, day);
        // Never stack a second part of the same unit on a day it was already worked on.
        while (doneOn("learn", unit.nodeId, date) && (learnDays === Infinity || day < learnDays - 1)) {
          day += 1;
          used = 0;
          date = addDays(today, day);
        }
        add({ nodeId: unit.nodeId, date, kind: "learn", estMinutes: chunk, title: parts > 1 ? `Learn: ${unit.title} (part ${p}/${parts})` : `Learn: ${unit.title}` }, unit.nodeId);
        used += chunk;
        lastLearnDay.set(unit.nodeId, date);
        finishDate = date;
      }
    }
  }

  // 5. Reviews 1, 3 and 7 days after learning; missed ones collapse into one catch-up today.
  const unitById = new Map(input.units.map((u) => [u.nodeId, u]));
  const reviewable = new Map<string, { date: string; planned: boolean }>();
  for (const [id, date] of learnedOn) reviewable.set(id, { date, planned: false });
  for (const [id, date] of lastLearnDay) reviewable.set(id, { date, planned: true });
  for (const [nodeId, { date: learned, planned }] of reviewable) {
    const unit = unitById.get(nodeId);
    if (!unit) continue;
    const minutes = REVIEW_MINUTES[unit.contentType];
    let missed = false;
    for (const off of REVIEW_OFFSETS) {
      const date = addDays(learned, off);
      if (examMode && date >= input.examDate!) continue;
      const done = kept.some((t) => t.kind === "review" && t.nodeId === nodeId && t.status === "done" && t.date >= date);
      if (done) continue;
      if (date < today) missed = true;
      else add({ nodeId, date, kind: "review", estMinutes: minutes, title: `Review: ${unit.title}` }, nodeId);
    }
    if (!planned && (missed || unit.mastery < WEAK) && !(examMode && windowDays <= 0)) {
      add({ nodeId, date: today, kind: "review", estMinutes: minutes, title: `${missed ? "Catch-up" : "Extra"} review: ${unit.title}` }, nodeId);
    }
  }

  // 6. Buffer days: interleaved practice, weakest units first; the last day stays light.
  if (examMode && bufferDays > 0 && input.units.length > 0) {
    const byWeakness = [...input.units].sort((a, b) => a.mastery - b.mastery);
    for (let b = 0; b < bufferDays; b++) {
      const date = addDays(today, learnDays + b);
      const lastDay = b === bufferDays - 1;
      const pick = byWeakness.length ? Array.from({ length: Math.min(lastDay ? 5 : 3, byWeakness.length) }, (_, i) => byWeakness[(b * 3 + i) % byWeakness.length]!) : [];
      const names = pick.map((u) => u.title).join(", ");
      add(
        {
          nodeId: null,
          nodeIds: pick.map((u) => u.nodeId),
          date,
          kind: lastDay ? "review" : "practice",
          estMinutes: Math.round(dailyMinutes * (lastDay ? 0.5 : 0.7)),
          title: lastDay ? `Light final review${names ? `: ${names}` : ""}` : `Mixed practice${names ? `: ${names}` : ""}`,
        },
        lastDay ? "final" : "mix",
      );
    }
  }
  if (examMode && windowDays === 0) {
    const weakest = [...input.units].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
    add({ nodeId: null, nodeIds: weakest.map((u) => u.nodeId), date: today, kind: "review", estMinutes: 20, title: `Light review before the exam${weakest.length ? `: ${weakest.map((u) => u.title).join(", ")}` : ""}` }, "final");
  }

  // 7. Today's flashcards.
  if (input.dueCards > 0) {
    add({ nodeId: null, date: today, kind: "flashcards", estMinutes: Math.min(60, Math.max(5, Math.ceil(input.dueCards * 0.5))), title: `Review ${input.dueCards} flashcard${input.dueCards === 1 ? "" : "s"}` }, "cards");
  }

  const tasks = [...kept, ...generated].sort((a, b) => (a.date === b.date ? KIND_ORDER[a.kind] - KIND_ORDER[b.kind] : a.date < b.date ? -1 : 1));
  return {
    tasks,
    warnings,
    summary: {
      examMode,
      windowDays: Math.max(0, windowDays),
      bufferDays,
      learnDays: learnDays === Infinity ? 0 : learnDays,
      unitsLeft: remaining.length,
      minutesLeft,
      pace: Math.round(pace),
      finishDate,
    },
  };
}

/** Within a day: reviews and flashcards first (retrieval warms you up), then new material, then practice. */
const KIND_ORDER: Record<TaskKind, number> = { flashcards: 0, review: 1, learn: 2, practice: 3, buffer: 4 };

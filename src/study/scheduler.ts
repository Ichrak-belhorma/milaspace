import { addDays, dayKey, diffDays } from "@/lib/day";
import { clipIntervals, freeIntervals, totalMinutes, weekdayOf, type Availability, type Interval } from "./availability";
import type { ContentType, StudyTask, TaskKind } from "./types";

/**
 * The planner. Pure: same input, same plan (task ids are deterministic), so it can run on every
 * load and after every change without churning anyone's list.
 *
 * - One daily budget shared by every module, capped by the student's free time that weekday.
 *   Reviews, practice and flashcards count against it, not just new material.
 * - New material is allocated earliest-exam-first, so the closest deadline gets the time it needs.
 * - Done/skipped and manual tasks are history: kept, never rewritten. Unfinished generated work
 *   is re-planned from today (missed work rolls forward, guilt-free).
 * - Exam mode keeps a buffer before the exam (max(2 days, 15%)) for interleaved mixed practice.
 * - Each learned topic gets reviews 1, 3 and 7 days later; shaky topics get an extra one.
 * - With an availability grid, every block gets a start time inside free time.
 * - If it cannot fit, it still fits the work before the exam and says so.
 */

export type Unit = { nodeId: string; title: string; contentType: ContentType; estMinutes: number; mastery: number };

export type ModuleInput = {
  moduleId: string;
  moduleName: string;
  examDate: string | null;
  /** Leaf curriculum nodes in study order. */
  units: Unit[];
  /** Every stored task for this module. */
  existing: StudyTask[];
  /** Flashcards due today for this module. */
  dueCards: number;
};

export type PlanAllInput = {
  modules: ModuleInput[];
  today: string;
  /** Total study minutes per day, across all modules. */
  dailyBudget: number;
  /** Weekly free time. Without it, days are limited by the budget only and blocks get no start time. */
  availability?: Availability | null;
  /** Minutes since midnight now, so today's blocks start in the future. */
  nowMinute?: number;
  /** Learned ratio of actual to estimated time (1 = estimates are right). */
  paceFactor?: number;
};

export type PlanWarning = { kind: "overloaded" | "exam-passed" | "exam-today" | "no-units"; message: string };

export type PlanSummary = {
  examMode: boolean;
  windowDays: number;
  bufferDays: number;
  learnDays: number;
  unitsLeft: number;
  minutesLeft: number;
  /** Average minutes of new material per learning day in the plan. */
  pace: number;
  finishDate: string | null;
};

export type ModulePlan = { warnings: PlanWarning[]; summary: PlanSummary };
export type PlanAllResult = { tasks: StudyTask[]; modules: Record<string, ModulePlan>; load: Record<string, number> };

export const REVIEW_OFFSETS = [1, 3, 7] as const;
export const MASTERED = 0.8;
export const WEAK = 0.4;
/** How far ahead rolling (no exam date) modules are planned. */
export const ROLLING_HORIZON_DAYS = 60;
/** Gap left between consecutive blocks. */
export const BLOCK_GAP = 5;
/** Don't start a fresh topic in a sliver of time smaller than this. */
const MIN_CHUNK = 20;
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

/** Within a day: retrieval first (it warms you up), then new material, then practice. */
const KIND_ORDER: Record<TaskKind, number> = { flashcards: 0, review: 1, learn: 2, practice: 3, buffer: 4 };

type Prep = {
  input: ModuleInput;
  kept: StudyTask[];
  remaining: { unit: Unit; minutes: number }[];
  minutesLeft: number;
  examMode: boolean;
  windowDays: number;
  bufferDays: number;
  learnDays: number;
  /** Last day new material may be scheduled. */
  deadline: string | null;
  warnings: PlanWarning[];
  learnedOn: Map<string, string>;
};

export function planAll(input: PlanAllInput): PlanAllResult {
  const { today, dailyBudget } = input;
  const pace = Math.min(2, Math.max(0.6, input.paceFactor ?? 1));
  const generated: StudyTask[] = [];
  const keptIds = new Set<string>();
  const load: Record<string, number> = {};
  const addLoad = (date: string, m: number) => (load[date] = (load[date] ?? 0) + m);

  const add = (moduleId: string, t: Omit<StudyTask, "id" | "moduleId" | "status" | "source" | "completedAt">, key: string): StudyTask | null => {
    const id = `auto:${moduleId}:${t.kind}:${key}:${t.date}`;
    if (keptIds.has(id) || generated.some((g) => g.id === id)) return null;
    const task: StudyTask = { ...t, id, moduleId, status: "todo", source: "auto", completedAt: null };
    generated.push(task);
    addLoad(t.date, t.estMinutes);
    return task;
  };

  // ---------- 1. per-module preparation ----------
  const preps: Prep[] = input.modules.map((m) => {
    const kept = m.existing.filter((t) => t.moduleId === m.moduleId && (t.source === "manual" || t.status !== "todo"));
    kept.forEach((t) => {
      keptIds.add(t.id);
      if (t.date >= today && (t.status !== "skipped")) addLoad(t.date, t.estMinutes);
    });
    const learnedMinutes = new Map<string, number>();
    const learnedOn = new Map<string, string>();
    for (const t of kept) {
      if (t.kind !== "learn" || t.status !== "done" || !t.nodeId) continue;
      learnedMinutes.set(t.nodeId, (learnedMinutes.get(t.nodeId) ?? 0) + t.estMinutes);
      const d = t.completedAt ? dayKey(t.completedAt) : t.date;
      if (!learnedOn.has(t.nodeId) || d > learnedOn.get(t.nodeId)!) learnedOn.set(t.nodeId, d);
    }
    const remaining = m.units
      .map((u) => ({ unit: u, minutes: Math.round(Math.max(0, u.estMinutes - (learnedMinutes.get(u.nodeId) ?? 0)) * pace) }))
      .filter((r) => r.unit.mastery < MASTERED && r.minutes >= Math.min(10, r.unit.estMinutes * 0.1));
    const examMode = m.examDate !== null;
    const windowDays = examMode ? diffDays(today, m.examDate!) : 0;
    const warnings: PlanWarning[] = [];
    if (examMode && windowDays < 0) warnings.push({ kind: "exam-passed", message: "This exam date has passed. Log how it went, set a new date, or clear it to keep studying at your own pace." });
    if (examMode && windowDays === 0) warnings.push({ kind: "exam-today", message: "Exam today: just a light review. You've got this." });
    if (m.units.length === 0) warnings.push({ kind: "no-units", message: "Add the course outline to get a day-by-day plan." });
    const bufferDays = examMode && windowDays > 0 ? bufferDaysFor(windowDays) : 0;
    const learnDays = examMode ? Math.max(0, windowDays - bufferDays) : ROLLING_HORIZON_DAYS;
    return {
      input: m,
      kept,
      remaining,
      minutesLeft: remaining.reduce((s, r) => s + r.minutes, 0),
      examMode,
      windowDays,
      bufferDays,
      learnDays,
      deadline: learnDays > 0 ? addDays(today, learnDays - 1) : null,
      warnings,
      learnedOn,
    };
  });

  // ---------- 2. capacity per day ----------
  const intervalsFor = (date: string): Interval[] | null => {
    if (!input.availability) return null;
    const iv = freeIntervals(input.availability, weekdayOf(date));
    return date === today && input.nowMinute !== undefined ? clipIntervals(iv, input.nowMinute) : iv;
  };
  const capacity = (date: string) => {
    const iv = intervalsFor(date);
    return iv ? Math.min(dailyBudget, totalMinutes(iv)) : dailyBudget;
  };

  /** First day from `date` with room for `minutes` (reviews slide forward, never past the exam). */
  const nextFit = (date: string, minutes: number, before: string | null): string => {
    for (let d = date, i = 0; i < 14; i++, d = addDays(d, 1)) {
      if (before && d >= before) break;
      if (capacity(d) - (load[d] ?? 0) >= minutes) return d;
    }
    return date;
  };

  const scheduleReviews = (p: Prep, nodeId: string, learned: string, historic: boolean) => {
    const unit = p.input.units.find((u) => u.nodeId === nodeId);
    if (!unit) return;
    const minutes = REVIEW_MINUTES[unit.contentType];
    let missed = false;
    for (const off of REVIEW_OFFSETS) {
      const date = addDays(learned, off);
      if (p.examMode && date >= p.input.examDate!) continue;
      const done = p.kept.some((t) => t.kind === "review" && t.nodeId === nodeId && t.status === "done" && t.date >= date);
      if (done) continue;
      if (date < today) missed = true;
      else add(p.input.moduleId, { nodeId, date: nextFit(date, minutes, p.input.examDate), kind: "review", estMinutes: minutes, title: `Review: ${unit.title}` }, nodeId);
    }
    if (historic && (missed || unit.mastery < WEAK) && !(p.examMode && p.windowDays <= 0)) {
      add(p.input.moduleId, { nodeId, date: today, kind: "review", estMinutes: minutes, title: `${missed ? "Catch-up" : "Extra"} review: ${unit.title}` }, nodeId);
    }
  };

  // ---------- 3. fixed work: reviews of learned topics, buffers, exam day, flashcards ----------
  for (const p of preps) {
    const id = p.input.moduleId;
    for (const [nodeId, date] of p.learnedOn) scheduleReviews(p, nodeId, date, true);
    if (p.examMode && p.bufferDays > 0 && p.input.units.length > 0) {
      const byWeakness = [...p.input.units].sort((a, b) => a.mastery - b.mastery);
      for (let b = 0; b < p.bufferDays; b++) {
        const date = addDays(today, p.learnDays + b);
        const lastDay = b === p.bufferDays - 1;
        if (capacity(date) <= 0) continue;
        const pick = Array.from({ length: Math.min(lastDay ? 5 : 3, byWeakness.length) }, (_, i) => byWeakness[(b * 3 + i) % byWeakness.length]!);
        const names = pick.map((u) => u.title).join(", ");
        const minutes = Math.round(Math.min(capacity(date), dailyBudget) * (lastDay ? 0.4 : 0.5) / Math.max(1, preps.filter((q) => q.examMode).length)) || 20;
        add(
          id,
          { nodeId: null, nodeIds: pick.map((u) => u.nodeId), date, kind: lastDay ? "review" : "practice", estMinutes: Math.max(20, minutes), title: lastDay ? `Light final review: ${names}` : `Mixed practice: ${names}` },
          lastDay ? "final" : "mix",
        );
      }
    }
    if (p.examMode && p.windowDays === 0) {
      const weakest = [...p.input.units].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
      add(id, { nodeId: null, nodeIds: weakest.map((u) => u.nodeId), date: today, kind: "review", estMinutes: 20, title: `Light review before the exam${weakest.length ? `: ${weakest.map((u) => u.title).join(", ")}` : ""}` }, "final");
    }
    if (p.input.dueCards > 0) {
      const n = p.input.dueCards;
      add(id, { nodeId: null, date: today, kind: "flashcards", estMinutes: Math.min(60, Math.max(5, Math.ceil(n * 0.5))), title: `Review ${n} flashcard${n === 1 ? "" : "s"}` }, "cards");
    }
  }

  // ---------- 4. new material, earliest exam first ----------
  const queue = preps.filter((p) => p.remaining.length && p.deadline).map((p) => ({ p, units: p.remaining.map((r) => ({ ...r })), parts: new Map<string, StudyTask[]>() }));
  const lastDeadline = queue.reduce((d, q) => (q.p.deadline! > d ? q.p.deadline! : d), today);
  const horizon = diffDays(today, lastDeadline);
  for (let i = 0; i <= horizon; i++) {
    const date = addDays(today, i);
    const open = queue.filter((q) => q.units.length && date <= q.p.deadline!).sort((a, b) => (a.p.deadline! < b.p.deadline! ? -1 : a.p.deadline! > b.p.deadline! ? 1 : 0));
    let free = capacity(date) - (load[date] ?? 0);
    for (const q of open) {
      const lastChance = date === q.p.deadline;
      while (q.units.length && (free >= Math.min(MIN_CHUNK, q.units[0]!.minutes) || lastChance)) {
        const head = q.units[0]!;
        const workedToday = q.p.kept.some((t) => t.kind === "learn" && t.nodeId === head.unit.nodeId && t.date === date && t.status === "done");
        if (workedToday && !lastChance) break;
        // Keep a topic in one sitting when a whole day could hold it; only day-sized topics split.
        if (!lastChance && head.minutes > free && head.minutes <= capacity(date)) break;
        // On a module's last learning day everything left goes in (and the plan warns).
        const take = lastChance && free < head.minutes ? head.minutes : Math.min(head.minutes, free);
        const task = add(q.p.input.moduleId, { nodeId: head.unit.nodeId, date, kind: "learn", estMinutes: Math.round(take), title: `Learn: ${head.unit.title}` }, head.unit.nodeId);
        if (!task) break;
        q.parts.set(head.unit.nodeId, [...(q.parts.get(head.unit.nodeId) ?? []), task]);
        head.minutes -= take;
        free -= take;
        if (head.minutes <= 0) {
          q.units.shift();
          scheduleReviews(q.p, head.unit.nodeId, date, false);
        }
        if (lastChance && free <= 0 && !q.units.length) break;
      }
    }
  }
  // Number multi-day topics "(part i/n)".
  for (const q of queue) {
    for (const [, parts] of q.parts) if (parts.length > 1) parts.forEach((t, i) => (t.title = `${t.title} (part ${i + 1}/${parts.length})`));
  }

  // ---------- 5. warnings and summaries ----------
  const modules: Record<string, ModulePlan> = {};
  for (const p of preps) {
    const learnTasks = generated.filter((t) => t.moduleId === p.input.moduleId && t.kind === "learn");
    const learnDates = [...new Set(learnTasks.map((t) => t.date))].sort();
    const overflow = learnTasks.filter((t) => t.date === p.deadline).reduce((s, t) => s + t.estMinutes, 0);
    if (p.examMode && p.deadline && (load[p.deadline] ?? 0) > capacity(p.deadline) + 1 && overflow > 0) {
      const needed = p.minutesLeft / Math.max(1, p.learnDays);
      p.warnings.push({
        kind: "overloaded",
        message: `This doesn't fit: it needs about ${fmtMinutes(needed)} of new material a day on top of your other modules, more than your free time and ${fmtMinutes(dailyBudget)} daily budget allow. Add free time, raise the budget, or trim topics.`,
      });
    }
    modules[p.input.moduleId] = {
      warnings: p.warnings,
      summary: {
        examMode: p.examMode,
        windowDays: Math.max(0, p.windowDays),
        bufferDays: p.bufferDays,
        learnDays: p.examMode ? p.learnDays : 0,
        unitsLeft: p.remaining.length,
        minutesLeft: p.minutesLeft,
        pace: learnDates.length ? Math.round(learnTasks.reduce((s, t) => s + t.estMinutes, 0) / learnDates.length) : 0,
        finishDate: learnDates.at(-1) ?? null,
      },
    };
  }

  // ---------- 6. time blocks ----------
  const kept = preps.flatMap((p) => p.kept);
  const byDate = new Map<string, StudyTask[]>();
  for (const t of generated) byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
  for (const [date, list] of byDate) {
    list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);
    const iv = intervalsFor(date);
    if (!iv) continue;
    // Time already taken by kept tasks that have a start.
    const busy = kept.filter((t) => t.date === date && typeof t.start === "number").map((t) => ({ start: t.start!, end: t.start! + t.estMinutes + BLOCK_GAP }));
    const cursor = iv.map((x) => ({ ...x }));
    for (const t of list) {
      let placed = false;
      for (const slot of cursor) {
        let s = slot.start;
        for (const b of busy) if (s < b.end && s + t.estMinutes > b.start) s = Math.max(s, b.end);
        if (s + t.estMinutes <= slot.end) {
          t.start = s;
          slot.start = s + t.estMinutes + BLOCK_GAP;
          placed = true;
          break;
        }
      }
      if (!placed) t.start = null;
    }
  }

  const tasks = [...kept, ...generated].sort((a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.start ?? 9999) - (b.start ?? 9999) || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
  return { tasks, modules, load };
}

// ---------- single-module wrapper (kept for callers and tests) ----------

export type PlanInput = Omit<ModuleInput, never> & { today: string; dailyMinutes: number };
export type PlanResult = { tasks: StudyTask[]; warnings: PlanWarning[]; summary: PlanSummary };

export function planModule(input: PlanInput): PlanResult {
  const r = planAll({ modules: [input], today: input.today, dailyBudget: input.dailyMinutes });
  const m = r.modules[input.moduleId]!;
  return { tasks: r.tasks, warnings: m.warnings, summary: m.summary };
}

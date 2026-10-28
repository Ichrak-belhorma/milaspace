import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/day";
import { bufferDaysFor, planModule, type PlanInput, type Unit } from "./scheduler";
import type { StudyTask } from "./types";

const TODAY = "2026-06-01";
const unit = (n: number, minutes = 45, mastery = 0): Unit => ({ nodeId: `u${n}`, title: `Unit ${n}`, contentType: "conceptual", estMinutes: minutes, mastery });
const units = (n: number, minutes = 45) => Array.from({ length: n }, (_, i) => unit(i + 1, minutes));

function plan(over: Partial<PlanInput> = {}) {
  return planModule({
    moduleId: "m1",
    moduleName: "Biology",
    examDate: addDays(TODAY, 20),
    dailyMinutes: 60,
    units: units(8),
    today: TODAY,
    existing: [],
    dueCards: 0,
    ...over,
  });
}

const learn = (tasks: StudyTask[]) => tasks.filter((t) => t.kind === "learn");

describe("backward planner", () => {
  it("keeps a review buffer of max(2 days, 15%) before the exam", () => {
    expect(bufferDaysFor(20)).toBe(3);
    expect(bufferDaysFor(10)).toBe(2);
    expect(bufferDaysFor(3)).toBe(1);
    const { tasks, summary } = plan();
    expect(summary.bufferDays).toBe(3);
    const lastLearn = learn(tasks).map((t) => t.date).sort().at(-1)!;
    expect(lastLearn < addDays(TODAY, 17)).toBe(true);
    const buffer = tasks.filter((t) => t.date >= addDays(TODAY, 17));
    expect(buffer.some((t) => t.kind === "practice" && (t.nodeIds?.length ?? 0) > 1)).toBe(true);
    expect(tasks.every((t) => t.date < addDays(TODAY, 20))).toBe(true);
  });

  it("schedules every unit once, in order, starting today", () => {
    const { tasks } = plan();
    const l = learn(tasks);
    expect(l.map((t) => t.nodeId)).toEqual(["u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8"]);
    expect(l[0]!.date).toBe(TODAY);
  });

  it("adds reviews 1, 3 and 7 days after learning", () => {
    const { tasks } = plan();
    const u1 = learn(tasks).find((t) => t.nodeId === "u1")!;
    const reviews = tasks.filter((t) => t.kind === "review" && t.nodeId === "u1").map((t) => t.date);
    expect(reviews).toEqual([addDays(u1.date, 1), addDays(u1.date, 3), addDays(u1.date, 7)]);
  });

  it("is deterministic and idempotent", () => {
    const a = plan();
    const b = plan({ existing: a.tasks });
    expect(b.tasks).toEqual(a.tasks);
  });

  it("never rewrites done or manual tasks", () => {
    const first = plan();
    const done = { ...learn(first.tasks)[0]!, status: "done" as const, completedAt: new Date(2026, 5, 1, 18).getTime() };
    const manual: StudyTask = { id: "mine", moduleId: "m1", nodeId: null, date: TODAY, kind: "practice", title: "Past paper", estMinutes: 30, status: "todo", source: "manual", completedAt: null };
    const others = first.tasks.filter((t) => t.id !== done.id);
    const { tasks } = plan({ existing: [...others, done, manual] });
    expect(tasks).toContainEqual(done);
    expect(tasks).toContainEqual(manual);
    expect(learn(tasks).filter((t) => t.nodeId === "u1" && t.status === "todo")).toEqual([]);
  });

  it("rolls missed work forward from today", () => {
    const yesterday = addDays(TODAY, -1);
    const stale = planModule({ moduleId: "m1", moduleName: "B", examDate: addDays(TODAY, 20), dailyMinutes: 60, units: units(4), today: yesterday, existing: [], dueCards: 0 });
    const { tasks } = plan({ units: units(4), existing: stale.tasks });
    expect(tasks.filter((t) => t.status === "todo").every((t) => t.date >= TODAY)).toBe(true);
    expect(learn(tasks)[0]).toMatchObject({ nodeId: "u1", date: TODAY });
  });

  it("schedules a catch-up review for missed reviews of learned units", () => {
    const learned: StudyTask = { id: "l", moduleId: "m1", nodeId: "u1", date: addDays(TODAY, -5), kind: "learn", title: "Learn", estMinutes: 45, status: "done", source: "auto", completedAt: null };
    const { tasks } = plan({ units: [unit(1, 45, 0.5), unit(2)], existing: [learned] });
    expect(tasks.find((t) => t.kind === "review" && t.nodeId === "u1" && t.date === TODAY)?.title).toMatch(/^Catch-up/);
    expect(tasks.some((t) => t.kind === "review" && t.nodeId === "u1" && t.date === addDays(TODAY, 2))).toBe(true);
  });

  it("gives shaky units an extra review", () => {
    const learned: StudyTask = { id: "l", moduleId: "m1", nodeId: "u1", date: TODAY, kind: "learn", title: "Learn", estMinutes: 45, status: "done", source: "auto", completedAt: null };
    const { tasks } = plan({ units: [unit(1, 45, 0.2), unit(2)], existing: [learned] });
    expect(tasks.some((t) => t.title.startsWith("Extra review") && t.date === TODAY)).toBe(true);
  });

  it("skips mastered units", () => {
    const { tasks } = plan({ units: [unit(1, 45, 0.9), unit(2)] });
    expect(learn(tasks).map((t) => t.nodeId)).toEqual(["u2"]);
  });

  it("warns instead of silently overpacking", () => {
    const { warnings, tasks, summary } = plan({ examDate: addDays(TODAY, 5), units: units(20, 60) });
    expect(warnings.map((w) => w.kind)).toContain("overloaded");
    expect(summary.pace).toBeGreaterThan(60);
    expect(learn(tasks).every((t) => t.date < addDays(TODAY, 5))).toBe(true);
  });

  it("splits units bigger than a day into parts", () => {
    const { tasks } = plan({ units: [unit(1, 150)], examDate: addDays(TODAY, 30) });
    const parts = learn(tasks);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[0]!.title).toMatch(/part 1\//);
    expect(new Set(parts.map((t) => t.date)).size).toBe(parts.length);
  });

  it("works without an exam date (rolling mode)", () => {
    const { tasks, summary } = plan({ examDate: null });
    expect(summary.examMode).toBe(false);
    expect(summary.bufferDays).toBe(0);
    expect(learn(tasks).length).toBe(8);
    expect(learn(tasks).filter((t) => t.date === TODAY).reduce((s, t) => s + t.estMinutes, 0)).toBeLessThanOrEqual(60);
  });

  it("works with no curriculum: flashcards only", () => {
    const { tasks, warnings } = plan({ units: [], dueCards: 12 });
    expect(warnings.map((w) => w.kind)).toContain("no-units");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ kind: "flashcards", date: TODAY, title: "Review 12 flashcards" });
  });

  it("handles exam day and a past exam", () => {
    expect(plan({ examDate: TODAY }).warnings.map((w) => w.kind)).toContain("exam-today");
    const past = plan({ examDate: addDays(TODAY, -2) });
    expect(past.warnings.map((w) => w.kind)).toContain("exam-passed");
    expect(learn(past.tasks)).toEqual([]);
  });
});

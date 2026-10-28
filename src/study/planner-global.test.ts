import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/day";
import { DEFAULT_AVAILABILITY, freeIntervals, weekdayOf, type Availability } from "./availability";
import { planAll, type ModuleInput, type Unit } from "./scheduler";

const TODAY = "2026-06-01"; // a Monday
const unit = (id: string, minutes = 45): Unit => ({ nodeId: id, title: id, contentType: "conceptual", estMinutes: minutes, mastery: 0 });
const mod = (id: string, examIn: number | null, n = 6): ModuleInput => ({
  moduleId: id,
  moduleName: id,
  examDate: examIn === null ? null : addDays(TODAY, examIn),
  units: Array.from({ length: n }, (_, i) => unit(`${id}-u${i + 1}`)),
  existing: [],
  dueCards: 0,
});
const allDay: Availability = Array(7).fill("1".repeat(48));

describe("global planner", () => {
  it("never plans more than the shared daily budget, across modules", () => {
    const { tasks, load } = planAll({ modules: [mod("a", 20), mod("b", 22), mod("c", 25)], today: TODAY, dailyBudget: 90, availability: allDay });
    for (const [date, minutes] of Object.entries(load)) {
      const planned = tasks.filter((t) => t.date === date && t.status === "todo").reduce((s, t) => s + t.estMinutes, 0);
      expect(planned, date).toBeLessThanOrEqual(90);
      expect(minutes).toBe(planned);
    }
  });

  it("gives the earliest exam the time first", () => {
    const { tasks } = planAll({ modules: [mod("late", 30), mod("soon", 6, 4)], today: TODAY, dailyBudget: 60, availability: allDay });
    const first = tasks.find((t) => t.kind === "learn" && t.date === TODAY)!;
    expect(first.moduleId).toBe("soon");
  });

  it("warns when several exams in one week cannot fit", () => {
    const r = planAll({ modules: [mod("a", 4, 10), mod("b", 4, 10), mod("c", 5, 10)], today: TODAY, dailyBudget: 60, availability: allDay });
    expect(Object.values(r.modules).some((m) => m.warnings.some((w) => w.kind === "overloaded"))).toBe(true);
  });

  it("puts blocks inside free time, without overlaps, and never in the past today", () => {
    const { tasks } = planAll({ modules: [mod("a", 14), mod("b", 20)], today: TODAY, dailyBudget: 180, availability: DEFAULT_AVAILABILITY, nowMinute: 18 * 60 });
    const timed = tasks.filter((t) => typeof t.start === "number");
    expect(timed.length).toBeGreaterThan(0);
    for (const t of timed) {
      const free = freeIntervals(DEFAULT_AVAILABILITY, weekdayOf(t.date));
      expect(free.some((iv) => t.start! >= iv.start && t.start! + t.estMinutes <= iv.end), `${t.title} ${t.date}`).toBe(true);
      if (t.date === TODAY) expect(t.start!).toBeGreaterThanOrEqual(18 * 60);
    }
    const byDay = new Map<string, typeof timed>();
    timed.forEach((t) => byDay.set(t.date, [...(byDay.get(t.date) ?? []), t]));
    for (const list of byDay.values()) {
      const sorted = [...list].sort((a, b) => a.start! - b.start!);
      for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.start!).toBeGreaterThanOrEqual(sorted[i - 1]!.start! + sorted[i - 1]!.estMinutes);
    }
  });

  it("plans nothing on a day with no free time", () => {
    const busyTuesday = [...allDay];
    busyTuesday[1] = "0".repeat(48);
    const { tasks } = planAll({ modules: [mod("a", 14)], today: TODAY, dailyBudget: 60, availability: busyTuesday });
    expect(tasks.filter((t) => t.date === addDays(TODAY, 1))).toEqual([]);
  });

  it("scales estimates by the learned pace factor", () => {
    const base = planAll({ modules: [mod("a", 30, 2)], today: TODAY, dailyBudget: 120 });
    const slow = planAll({ modules: [mod("a", 30, 2)], today: TODAY, dailyBudget: 120, paceFactor: 1.4 });
    const minutes = (r: typeof base) => r.tasks.filter((t) => t.kind === "learn").reduce((s, t) => s + t.estMinutes, 0);
    expect(minutes(slow)).toBe(Math.round(45 * 1.4) * 2);
    expect(minutes(base)).toBe(90);
  });
});

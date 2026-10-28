import { describe, expect, it } from "vitest";
import { calendarMarks, monthGrid, shiftMonth } from "./calendar";
import { toIcs } from "./ics";
import type { Module, StudyTask } from "./types";

const mod: Module = { id: "m1", name: "Bio, cells", examDate: "2026-06-20", targetGrade: null, syllabusText: null, dailyMinutes: 60, createdAt: 0, updatedAt: 0 };
const task = (over: Partial<StudyTask>): StudyTask => ({ id: "auto:m1:learn:n1:2026-06-02", moduleId: "m1", nodeId: "n1", date: "2026-06-02", kind: "learn", title: "Learn: Cells", estMinutes: 45, status: "todo", source: "auto", completedAt: null, ...over });

describe("calendar", () => {
  it("lays a month out in Monday-first weeks", () => {
    const june = monthGrid(2026, 6); // 1 June 2026 is a Monday
    expect(june[0]![0]).toBe("2026-06-01");
    expect(june.flat().filter(Boolean)).toHaveLength(30);
    expect(monthGrid(2026, 2)[0]!.slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("marks exams and finished days", () => {
    const sessions = [{ id: "s", startedAt: new Date(2026, 5, 3, 10).getTime(), endedAt: 0, minutes: 25, completed: true }];
    const marks = calendarMarks([mod], [task({ status: "done", completedAt: new Date(2026, 5, 2, 18).getTime() })], sessions);
    expect(marks.exams.get("2026-06-20")).toEqual(["Bio, cells"]);
    expect([...marks.done].sort()).toEqual(["2026-06-02", "2026-06-03"]);
  });
});

describe("ics export", () => {
  it("exports timed blocks, all-day tasks and exams, escaped and folded", () => {
    const ics = toIcs([task({ start: 17 * 60 + 30 }), task({ id: "x", start: null, title: "A very long task title ".repeat(5) }), task({ id: "d", status: "done" })], [mod], new Date("2026-06-01T09:00:00Z"));
    expect(ics).toContain("DTSTART:20260602T173000\r\nDURATION:PT45M");
    expect(ics).toContain("SUMMARY:Learn: Cells (Bio\\, cells)");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260602");
    expect(ics).toContain("SUMMARY:Exam: Bio\\, cells");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
});

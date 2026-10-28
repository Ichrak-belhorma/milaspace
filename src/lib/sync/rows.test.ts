import { describe, expect, it } from "vitest";
import { newCardState } from "@/study/fsrs";
import { getPreset } from "@/theme/presets";
import { cardRows, moduleRows, nodeRows, sessionRows, taskRows, themeRows, todoRows } from "./rows";

const T = Date.parse("2026-06-01T10:00:00.000Z");
const U = "user-1";

describe("sync row mappers", () => {
  it("round-trip every synced type", () => {
    const cases: [{ toRow: (x: never, u: string) => Record<string, unknown>; fromRow: (r: unknown) => unknown }, unknown][] = [
      [moduleRows, { id: "m", name: "Bio", examDate: "2026-06-20", targetGrade: "A", syllabusText: null, dailyMinutes: 60, createdAt: T, updatedAt: T }],
      [nodeRows, { id: "n", moduleId: "m", parentId: null, kind: "chapter", title: "Cells", position: 0, contentType: "conceptual", estMinutes: 45, mastery: 0.5, updatedAt: T }],
      [taskRows, { id: "t", moduleId: "m", nodeId: "n", date: "2026-06-01", kind: "learn", title: "Learn: Cells", estMinutes: 45, status: "done", source: "auto", completedAt: T, updatedAt: T }],
      [cardRows, { id: "c", moduleId: "m", nodeId: null, front: "Q", back: "A", fsrs: newCardState(new Date(T)), createdAt: T, updatedAt: T }],
      [sessionRows, { id: "s", startedAt: T, endedAt: T + 1500_000, minutes: 25, completed: true }],
      [todoRows, { id: "d", text: "Read", done: false, day: "2026-06-01", createdAt: T, doneAt: null, updatedAt: T }],
    ];
    for (const [m, item] of cases) {
      const row = m.toRow(item as never, U);
      expect(row.user_id).toBe(U);
      expect(m.fromRow(JSON.parse(JSON.stringify(row)))).toEqual(item);
    }
  });

  it("round-trips a custom theme and rejects a tampered one", () => {
    const theme = { ...getPreset("cottagecore")!, id: "custom-1", name: "Mine", updatedAt: T };
    expect(themeRows.fromRow(themeRows.toRow(theme, U))).toMatchObject({ id: "custom-1", name: "Mine", tokens: theme.tokens });
    const bad = { ...themeRows.toRow(theme, U), tokens: { ...theme.tokens, accent: "url(javascript:x)" } };
    expect(themeRows.fromRow(bad)).toBeNull();
  });

  it("skips malformed rows", () => {
    expect(taskRows.fromRow({ id: "x", status: "maybe" })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import type { FocusSession } from "./machine";
import { currentStreak, minutesOn } from "./stats";

const day = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime();
const session = (start: number, minutes: number): FocusSession => ({
  id: String(start),
  startedAt: start,
  endedAt: start + minutes * 60_000,
  minutes,
  completed: true,
});

describe("focus stats", () => {
  it("sums minutes per local day", () => {
    const sessions = [session(day(2026, 6, 1), 25), session(day(2026, 6, 1, 15), 25), session(day(2026, 6, 2), 5)];
    expect(minutesOn(sessions, "2026-06-01")).toBe(50);
    expect(minutesOn(sessions, "2026-06-02")).toBe(5);
  });

  it("counts consecutive qualifying days", () => {
    const sessions = [session(day(2026, 6, 1), 25), session(day(2026, 6, 2), 15), session(day(2026, 6, 3), 30)];
    expect(currentStreak(sessions, day(2026, 6, 3, 20))).toBe(3);
  });

  it("keeps yesterday's streak alive until today qualifies", () => {
    const sessions = [session(day(2026, 6, 1), 25), session(day(2026, 6, 2), 25)];
    expect(currentStreak(sessions, day(2026, 6, 3, 9))).toBe(2);
  });

  it("breaks on a missed day or a too-short day", () => {
    expect(currentStreak([session(day(2026, 6, 1), 25)], day(2026, 6, 3))).toBe(0);
    expect(currentStreak([session(day(2026, 6, 3), 5)], day(2026, 6, 3))).toBe(0);
  });
});

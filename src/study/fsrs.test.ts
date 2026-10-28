import { describe, expect, it } from "vitest";
import { isDue, masteryAfterReview, newCardState, previewIntervals, review } from "./fsrs";

const NOW = new Date("2026-06-01T09:00:00Z");
const DAY = 86_400_000;

describe("FSRS integration", () => {
  it("creates new cards due now", () => {
    const card = newCardState(NOW);
    expect(card.state).toBe("new");
    expect(isDue(card, NOW)).toBe(true);
  });

  it("schedules a good answer later than a hard one, and again sooner", () => {
    const card = newCardState(NOW);
    const due = (r: "again" | "hard" | "good" | "easy") => new Date(review(card, r, NOW).state.due).getTime();
    expect(due("again")).toBeLessThanOrEqual(due("hard"));
    expect(due("hard")).toBeLessThanOrEqual(due("good"));
    expect(due("good")).toBeLessThan(due("easy"));
  });

  it("grows intervals with repeated good reviews and resets on a lapse", () => {
    let card = newCardState(NOW);
    let t = NOW.getTime();
    const intervals: number[] = [];
    for (let i = 0; i < 4; i++) {
      const next = review(card, "good", new Date(t)).state;
      intervals.push(new Date(next.due).getTime() - t);
      t = new Date(next.due).getTime();
      card = next;
    }
    expect(intervals[3]!).toBeGreaterThan(intervals[2]!);
    expect(intervals[3]!).toBeGreaterThan(DAY);
    const lapsed = review(card, "again", new Date(t));
    expect(lapsed.state.lapses).toBe(1);
    expect(new Date(lapsed.state.due).getTime() - t).toBeLessThan(DAY);
    expect(lapsed.log.rating).toBe("again");
  });

  it("round-trips through JSON", () => {
    const card = review(newCardState(NOW), "good", NOW).state;
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
  });

  it("previews intervals per rating", () => {
    const p = previewIntervals(newCardState(NOW), NOW);
    expect(Object.keys(p)).toEqual(["again", "hard", "good", "easy"]);
    expect(p.again).toMatch(/m$/);
  });

  it("nudges mastery", () => {
    expect(masteryAfterReview(0.5, "again")).toBeCloseTo(0.3);
    expect(masteryAfterReview(0.95, "easy")).toBe(1);
  });
});

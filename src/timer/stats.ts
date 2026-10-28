import { addDays, dayKey } from "@/lib/day";
import type { FocusSession } from "./machine";

/** A day counts toward the streak once this many focus minutes are logged. */
export const STREAK_MIN_MINUTES = 10;

export function minutesByDay(sessions: FocusSession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const key = dayKey(s.startedAt);
    map.set(key, (map.get(key) ?? 0) + s.minutes);
  }
  return map;
}

export function minutesOn(sessions: FocusSession[], key: string): number {
  return Math.round((minutesByDay(sessions).get(key) ?? 0) * 10) / 10;
}

/**
 * Consecutive qualifying days ending today. If today does not qualify yet, the streak
 * is still alive from yesterday (you have until midnight to keep it).
 */
export function currentStreak(sessions: FocusSession[], now: number): number {
  const byDay = minutesByDay(sessions);
  const qualifies = (k: string) => (byDay.get(k) ?? 0) >= STREAK_MIN_MINUTES;
  let key = dayKey(now);
  if (!qualifies(key)) key = addDays(key, -1);
  let streak = 0;
  while (qualifies(key)) {
    streak += 1;
    key = addDays(key, -1);
  }
  return streak;
}

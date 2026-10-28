/**
 * Weekly availability: when the student is free to study. Seven days (Monday first) of 48 half-hour
 * slots each; true = free. Stored as compact strings ("0"/"1") so it syncs as plain JSON.
 */
export const SLOTS_PER_DAY = 48;
export const SLOT_MINUTES = 30;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type Availability = string[];
export type Interval = { start: number; end: number };

function day(fromHour: number, toHour: number, ...more: [number, number][]): string {
  const ranges: [number, number][] = [[fromHour, toHour], ...more];
  return Array.from({ length: SLOTS_PER_DAY }, (_, i) => (ranges.some(([a, b]) => i >= a * 2 && i < b * 2) ? "1" : "0")).join("");
}

/** A typical student week: free evenings on weekdays (after classes), late mornings and afternoons at weekends. */
export const DEFAULT_AVAILABILITY: Availability = [
  day(17, 21),
  day(17, 21),
  day(17, 21),
  day(17, 21),
  day(16, 20),
  day(10, 12, [14, 18]),
  day(10, 12, [14, 18]),
];

export function isValidAvailability(v: unknown): v is Availability {
  return Array.isArray(v) && v.length === 7 && v.every((d) => typeof d === "string" && /^[01]{48}$/.test(d));
}

/** Monday = 0 … Sunday = 6 for a YYYY-MM-DD day key. */
export function weekdayOf(key: string): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** Free intervals (minutes from midnight) on a weekday, merged. */
export function freeIntervals(a: Availability, weekday: number): Interval[] {
  const slots = a[weekday] ?? "";
  const out: Interval[] = [];
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    if (slots[i] !== "1") continue;
    const start = i * SLOT_MINUTES;
    const last = out[out.length - 1];
    if (last && last.end === start) last.end = start + SLOT_MINUTES;
    else out.push({ start, end: start + SLOT_MINUTES });
  }
  return out;
}

/** Intervals left after `fromMinute` (for today, so nothing is planned in the past). */
export function clipIntervals(intervals: Interval[], fromMinute: number): Interval[] {
  return intervals.filter((iv) => iv.end > fromMinute).map((iv) => ({ start: Math.max(iv.start, fromMinute), end: iv.end }));
}

export function totalMinutes(intervals: Interval[]): number {
  return intervals.reduce((s, iv) => s + iv.end - iv.start, 0);
}

export function toggleSlot(a: Availability, weekday: number, slot: number, free: boolean): Availability {
  return a.map((d, i) => (i === weekday ? `${d.slice(0, slot)}${free ? "1" : "0"}${d.slice(slot + 1)}` : d));
}

export function formatMinute(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

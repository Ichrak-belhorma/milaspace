import type { Module, StudyTask } from "./types";

/**
 * iCalendar export of planned study blocks, for Google/Apple Calendar. Times are "floating"
 * (local wall-clock), which is what a study plan means wherever you are.
 */
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets, as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    if (new TextEncoder().encode(current + ch).length > (out.length ? 74 : 75)) {
      out.push(current);
      current = "";
    }
    current += ch;
  }
  out.push(current);
  return out.join("\r\n ");
}

const compact = (day: string) => day.replace(/-/g, "");
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}00`;

export function toIcs(tasks: StudyTask[], modules: Module[], stamp: Date): string {
  const name = new Map(modules.map((m) => [m.id, m.name]));
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mila Space//Mila//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Mila study plan"];
  for (const t of tasks) {
    if (t.status !== "todo") continue;
    lines.push("BEGIN:VEVENT", `UID:${t.id.replace(/[^\w.:-]/g, "-")}@mila.study`, `DTSTAMP:${dtstamp}`);
    if (typeof t.start === "number") lines.push(`DTSTART:${compact(t.date)}T${hhmm(t.start)}`, `DURATION:PT${Math.max(5, t.estMinutes)}M`);
    else lines.push(`DTSTART;VALUE=DATE:${compact(t.date)}`);
    lines.push(`SUMMARY:${esc(`${t.title}${name.get(t.moduleId) ? ` (${name.get(t.moduleId)})` : ""}`)}`, "END:VEVENT");
  }
  for (const m of modules) {
    if (!m.examDate || m.archivedAt) continue;
    lines.push("BEGIN:VEVENT", `UID:exam-${m.id.replace(/[^\w.:-]/g, "-")}@mila.study`, `DTSTAMP:${dtstamp}`, `DTSTART;VALUE=DATE:${compact(m.examDate)}`, `SUMMARY:${esc(`Exam: ${m.name}`)}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

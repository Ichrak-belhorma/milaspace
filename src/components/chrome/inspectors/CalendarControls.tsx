"use client";

import { ChevronLeftIcon, DownloadIcon } from "@/components/icons";
import { minutesLabel } from "@/components/study/shared";
import { useStudyStore } from "@/stores/study";
import { useTimerStore } from "@/stores/timer";
import { useUiStore } from "@/stores/ui";
import { formatMinute } from "@/study/availability";
import { calendarMarks, monthGrid, shiftMonth } from "@/study/calendar";
import { toIcs } from "@/study/ics";
import { dayKey } from "@/lib/day";

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });
const parse = (k: string) => new Date(`${k}T12:00`);

/** Next to the zoomed-in wall calendar: change month, see a day's blocks, export to your calendar app. */
export function CalendarControls() {
  const { month, day } = useUiStore((s) => s.calendar);
  const setCalendar = useUiStore((s) => s.setCalendar);
  const modules = useStudyStore((s) => s.modules);
  const tasks = useStudyStore((s) => s.tasks);
  const sessions = useTimerStore((s) => s.sessions);
  const marks = calendarMarks(modules, tasks, sessions);
  const [y, m] = month.split("-").map(Number) as [number, number];
  const inMonth = monthGrid(y, m).flat().filter((d): d is string => d !== null);
  const crossed = inMonth.filter((d) => marks.done.has(d)).length;
  const dayTasks = day ? tasks.filter((t) => t.date === day) : [];
  const exams = day ? (marks.exams.get(day) ?? []) : [];

  const exportIcs = () => {
    const blob = new Blob([toIcs(tasks.filter((t) => t.date >= dayKey(Date.now())), modules, new Date())], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mila-study-plan.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-icon" onClick={() => setCalendar({ month: shiftMonth(month, -1), day: null })} aria-label="Previous month">
          <ChevronLeftIcon size={16} />
        </button>
        <span className="font-display">{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(y, m - 1, 1))}</span>
        <button type="button" className="btn btn-icon" onClick={() => setCalendar({ month: shiftMonth(month, 1), day: null })} aria-label="Next month">
          <ChevronLeftIcon size={16} className="rotate-180" />
        </button>
      </div>
      <p className="text-sm text-ink-muted">
        {crossed ? `${crossed} day${crossed === 1 ? "" : "s"} crossed off this month.` : "Study 10 minutes on a day to cross it off."} Click a day on the calendar.
      </p>
      {day && (
        <section aria-label={dayFmt.format(parse(day))} className="well flex flex-col gap-1.5 px-3 py-2 text-sm">
          <h3 className="font-semibold">{dayFmt.format(parse(day))}</h3>
          {exams.map((e) => (
            <p key={e} className="font-semibold">
              Exam: {e}
            </p>
          ))}
          {dayTasks.length === 0 && !exams.length ? (
            <p className="text-ink-muted">Nothing planned.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {dayTasks.map((t) => (
                <li key={t.id} className={`flex gap-2 ${t.status !== "todo" ? "text-ink-muted line-through" : ""}`}>
                  <span className="w-11 shrink-0 tabular-nums">{t.start != null ? formatMinute(t.start) : "any"}</span>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <span className="text-ink-muted">{minutesLabel(t.estMinutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <button type="button" className="btn btn-soft text-sm" onClick={exportIcs}>
        <DownloadIcon size={16} /> Add to Google / Apple Calendar (.ics)
      </button>
    </>
  );
}

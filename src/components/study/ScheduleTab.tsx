"use client";

import { useEffect, useState } from "react";
import { Slider } from "@/components/glass/controls";
import { useScheduleStore } from "@/stores/schedule";
import { DEFAULT_AVAILABILITY, formatMinute, freeIntervals, SLOT_MINUTES, toggleSlot, totalMinutes, WEEKDAYS } from "@/study/availability";
import { minutesLabel } from "./shared";

const FIRST_SLOT = 12; // 06:00
const LAST_SLOT = 48; // midnight

/** Paint your free time: click or drag across half-hours. Mila only plans inside it. */
function AvailabilityGrid() {
  const availability = useScheduleStore((s) => s.availability);
  const setAvailability = useScheduleStore((s) => s.setAvailability);
  const [draft, setDraft] = useState(availability);
  const [painting, setPainting] = useState<boolean | null>(null);

  // Commit the painted stroke when the pointer is released anywhere.
  useEffect(() => {
    if (painting === null) return;
    const stop = () => {
      setPainting(null);
      setAvailability(draft);
    };
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, [painting, draft, setAvailability]);
  const shown = painting === null ? availability : draft;

  const paint = (day: number, slot: number, free: boolean) => setDraft((d) => toggleSlot(d, day, slot, free));

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-xs select-none" aria-label="Weekly free time">
          <thead>
            <tr>
              <th className="w-12" />
              {WEEKDAYS.map((d, i) => (
                <th key={d} scope="col" className="font-semibold text-ink-muted">
                  {d}
                  <span className="block font-normal">{minutesLabel(totalMinutes(freeIntervals(shown, i)))}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: LAST_SLOT - FIRST_SLOT }, (_, k) => FIRST_SLOT + k).map((slot) => (
              <tr key={slot}>
                <th scope="row" className="pr-1 text-right font-normal text-ink-muted tabular-nums">
                  {slot % 2 === 0 ? formatMinute(slot * SLOT_MINUTES) : ""}
                </th>
                {WEEKDAYS.map((d, day) => {
                  const free = shown[day]?.[slot] === "1";
                  const label = `${d} ${formatMinute(slot * SLOT_MINUTES)}–${formatMinute((slot + 1) * SLOT_MINUTES)}`;
                  return (
                    <td key={d} className="p-0">
                      <button
                        type="button"
                        aria-pressed={free}
                        aria-label={`${label} ${free ? "free" : "busy"}`}
                        title={label}
                        className={`block h-3.5 w-full rounded-sm ${free ? "bg-accent/70" : "bg-ink/10"} hover:outline hover:outline-1 hover:outline-accent`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setPainting(!free);
                          setDraft(toggleSlot(availability, day, slot, !free));
                        }}
                        onPointerEnter={() => painting !== null && paint(day, slot, painting)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setAvailability(toggleSlot(availability, day, slot, !free));
                          }
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-soft text-sm" onClick={() => setAvailability(DEFAULT_AVAILABILITY)}>
          Typical student week
        </button>
        <button type="button" className="btn btn-soft text-sm" onClick={() => setAvailability(availability.map(() => "0".repeat(48)))}>
          Clear
        </button>
      </div>
    </div>
  );
}

export function ScheduleTab() {
  const budget = useScheduleStore((s) => s.dailyBudget);
  const setBudget = useScheduleStore((s) => s.setBudget);
  const pace = useScheduleStore((s) => s.pace);

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="budget-heading" className="flex flex-col gap-2">
        <h3 id="budget-heading" className="label">
          Daily study budget
        </h3>
        <Slider label="Across all modules" min={15} max={360} step={15} value={budget} onChange={setBudget} format={(v) => minutesLabel(v)} />
        <p className="text-xs text-ink-muted">
          Every module shares this. When exams overlap, the nearest one gets time first, and you&rsquo;re told if it can&rsquo;t all fit.
        </p>
      </section>
      <section aria-labelledby="free-heading" className="flex flex-col gap-2">
        <h3 id="free-heading" className="label">
          When you&rsquo;re free
        </h3>
        <p className="text-xs text-ink-muted">Mark the time that isn&rsquo;t classes, work, sleep or the gym. Study blocks only go here.</p>
        <AvailabilityGrid />
      </section>
      <section aria-labelledby="pace-heading" className="flex flex-col gap-1">
        <h3 id="pace-heading" className="label">
          Your pace
        </h3>
        <p className="text-sm">
          {pace.samples < 3
            ? "Finish a few tasks with the timer and Mila will learn how long things really take you."
            : pace.factor > 1.05
              ? `Things take you about ${pace.factor}× the estimate, so plans include that extra time.`
              : pace.factor < 0.95
                ? `You're quicker than the estimates (${pace.factor}×), so plans are a little tighter.`
                : "Your estimates are spot on."}
        </p>
      </section>
    </div>
  );
}

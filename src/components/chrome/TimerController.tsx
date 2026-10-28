"use client";

import { useEffect } from "react";
import { formatClock, remainingMs } from "@/timer/machine";
import { useTimerStore } from "@/stores/timer";

const PHASE_TITLE = { focus: "Focus", shortBreak: "Break", longBreak: "Long break" } as const;

/** Drives the timer clock and mirrors the countdown in the tab title. Renders nothing. */
export function TimerController() {
  const tick = useTimerStore((s) => s.tick);
  const status = useTimerStore((s) => s.timer.status);

  useEffect(() => {
    tick(); // catch up after a reload or a sleeping tab
    if (status !== "running") return;
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [status, tick]);

  useEffect(() => {
    const base = "Mila · your study space";
    const update = () => {
      const { timer } = useTimerStore.getState();
      document.title =
        timer.status === "idle" ? base : `${formatClock(remainingMs(timer, Date.now()))} · ${PHASE_TITLE[timer.phase]} · Mila`;
    };
    update();
    const id = setInterval(update, 1000);
    return () => {
      clearInterval(id);
      document.title = base;
    };
  }, []);

  return null;
}

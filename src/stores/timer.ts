import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { localJSONStorage } from "@/lib/storage";
import * as machine from "@/timer/machine";
import type { FocusSession, Phase, TimerSettings, TimerState, Transition } from "@/timer/machine";

/** Keep the local log bounded; Phase 2 moves history to Supabase. */
const MAX_LOCAL_SESSIONS = 1000;

/** The task the current focus run is for. */
export type ActiveTask = { taskId: string; moduleId: string; title: string } | null;

/** Shown when a task's focus run ends: how did it go? */
export type CheckIn = { taskId: string; moduleId: string; title: string; starter: boolean } | null;

export const STARTER_MS = 5 * 60_000;

type TimerStore = {
  settings: TimerSettings;
  timer: TimerState;
  sessions: FocusSession[];
  /** Increments whenever a phase finishes on its own (drives the chime). */
  finishedCount: number;
  lastFinished: Phase | null;
  activeTask: ActiveTask;
  /** True while the current run is a 5-minute "just start" session. */
  starter: boolean;
  checkIn: CheckIn;
  toggle: () => void;
  /** Start a focus run for a planned task (or a 5-minute starter run). */
  startTask: (task: ActiveTask, opts?: { starter?: boolean }) => void;
  clearCheckIn: () => void;
  clearActiveTask: () => void;
  skip: () => void;
  reset: () => void;
  tick: () => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => {
      const applyTransition = (t: Transition) =>
        set((s) => {
          const task = s.activeTask;
          const session = t.session && task ? { ...t.session, taskId: task.taskId, moduleId: task.moduleId } : t.session;
          // Leaving focus, by finishing or skipping, ends the run (a reset restarts it instead).
          const focusEnded = s.timer.phase === "focus" && (t.finished === "focus" || t.state.phase !== "focus");
          return {
            // A starter run doesn't count as a pomodoro: back to an idle focus phase.
            timer: focusEnded && s.starter ? machine.idleFocus(t.state, s.settings) : t.state,
            sessions: session ? [...s.sessions, session].slice(-MAX_LOCAL_SESSIONS) : s.sessions,
            ...(t.finished ? { finishedCount: s.finishedCount + 1, lastFinished: t.finished } : {}),
            ...(focusEnded
              ? { starter: false, checkIn: task ? { ...task, starter: s.starter } : s.starter ? { taskId: "", moduleId: "", title: "", starter: true } : null }
              : {}),
          };
        });

      return {
        settings: machine.DEFAULT_SETTINGS,
        timer: machine.initialState(machine.DEFAULT_SETTINGS),
        sessions: [],
        finishedCount: 0,
        lastFinished: null,
        activeTask: null,
        starter: false,
        checkIn: null,

        startTask: (task, opts) => {
          const { timer, settings } = get();
          const now = Date.now();
          // Leave whatever was running: a partial focus block is logged; a break just ends.
          let base = timer;
          let session: FocusSession | null = null;
          if (timer.phase !== "focus") base = machine.idleFocus(timer, settings);
          else if (timer.status !== "idle") {
            const r = machine.reset(timer, settings, now, uid("fs_"));
            base = r.state;
            session = r.session && get().activeTask ? { ...r.session, taskId: get().activeTask!.taskId, moduleId: get().activeTask!.moduleId } : r.session;
          }
          set({
            sessions: session ? [...get().sessions, session].slice(-MAX_LOCAL_SESSIONS) : get().sessions,
            activeTask: task,
            checkIn: null,
            starter: Boolean(opts?.starter),
            timer: opts?.starter ? machine.startFor(base, settings, now, STARTER_MS) : machine.start(base, now),
          });
        },
        clearCheckIn: () => set({ checkIn: null }),
        clearActiveTask: () => set({ activeTask: null, starter: false }),

        toggle: () => {
          const { timer } = get();
          const now = Date.now();
          set({ timer: timer.status === "running" ? machine.pause(timer, now) : machine.start(timer, now) });
        },
        skip: () => applyTransition(machine.skip(get().timer, get().settings, Date.now(), uid("fs_"))),
        reset: () => applyTransition(machine.reset(get().timer, get().settings, Date.now(), uid("fs_"))),
        tick: () => {
          const t = machine.tick(get().timer, get().settings, Date.now(), uid("fs_"));
          if (t.state !== get().timer) applyTransition(t);
        },
        updateSettings: (patch) => {
          const prev = get().settings;
          const settings = { ...prev, ...patch };
          set({ settings, timer: machine.withSettings(get().timer, prev, settings) });
        },
      };
    },
    {
      name: "mila:timer",
      version: 1,
      storage: localJSONStorage,
      partialize: (s) => ({ settings: s.settings, timer: s.timer, sessions: s.sessions, activeTask: s.activeTask, starter: s.starter, checkIn: s.checkIn }),
    },
  ),
);

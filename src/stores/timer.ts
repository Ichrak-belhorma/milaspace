import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid } from "@/lib/id";
import { localJSONStorage } from "@/lib/storage";
import * as machine from "@/timer/machine";
import type { FocusSession, Phase, TimerSettings, TimerState, Transition } from "@/timer/machine";

/** Keep the local log bounded; Phase 2 moves history to Supabase. */
const MAX_LOCAL_SESSIONS = 1000;

type TimerStore = {
  settings: TimerSettings;
  timer: TimerState;
  sessions: FocusSession[];
  /** Increments whenever a phase finishes on its own (drives the chime). */
  finishedCount: number;
  lastFinished: Phase | null;
  toggle: () => void;
  skip: () => void;
  reset: () => void;
  tick: () => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => {
      const applyTransition = (t: Transition) =>
        set((s) => ({
          timer: t.state,
          sessions: t.session ? [...s.sessions, t.session].slice(-MAX_LOCAL_SESSIONS) : s.sessions,
          ...(t.finished ? { finishedCount: s.finishedCount + 1, lastFinished: t.finished } : {}),
        }));

      return {
        settings: machine.DEFAULT_SETTINGS,
        timer: machine.initialState(machine.DEFAULT_SETTINGS),
        sessions: [],
        finishedCount: 0,
        lastFinished: null,

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
      partialize: (s) => ({ settings: s.settings, timer: s.timer, sessions: s.sessions }),
    },
  ),
);

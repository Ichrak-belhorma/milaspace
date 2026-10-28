import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJSONStorage } from "@/lib/storage";
import { DEFAULT_AVAILABILITY, isValidAvailability, type Availability } from "@/study/availability";

type ScheduleStore = {
  /** Study minutes per day across all modules. */
  dailyBudget: number;
  /** When you're free to study, Monday first, 48 half-hour slots per day. */
  availability: Availability;
  /** Learned ratio of actual to estimated time, from finished timed tasks. */
  pace: { factor: number; samples: number };
  updatedAt: number;
  setBudget: (minutes: number) => void;
  setAvailability: (a: Availability) => void;
  /** Feed one finished task: estimated vs actual minutes. */
  recordPace: (estimated: number, actual: number) => void;
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set) => ({
      dailyBudget: 90,
      availability: DEFAULT_AVAILABILITY,
      pace: { factor: 1, samples: 0 },
      updatedAt: 0,
      setBudget: (dailyBudget) => set({ dailyBudget: Math.min(600, Math.max(15, Math.round(dailyBudget))), updatedAt: Date.now() }),
      setAvailability: (availability) => set({ availability, updatedAt: Date.now() }),
      recordPace: (estimated, actual) =>
        set((s) => {
          if (estimated < 5 || actual < 1) return s;
          // Exponential moving average of the ratio, clamped; early samples move it faster.
          const ratio = Math.min(2.5, Math.max(0.4, actual / estimated));
          const weight = Math.max(0.15, 1 / (s.pace.samples + 2));
          const factor = Math.min(2, Math.max(0.6, s.pace.factor * (1 - weight) + ratio * weight));
          return { pace: { factor: Math.round(factor * 100) / 100, samples: s.pace.samples + 1 } };
        }),
    }),
    {
      name: "mila:schedule",
      version: 1,
      storage: localJSONStorage,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ScheduleStore>;
        return {
          ...current,
          dailyBudget: typeof p.dailyBudget === "number" ? p.dailyBudget : current.dailyBudget,
          availability: isValidAvailability(p.availability) ? p.availability : current.availability,
          pace: p.pace && typeof p.pace.factor === "number" ? p.pace : current.pace,
          updatedAt: p.updatedAt ?? 0,
        };
      },
    },
  ),
);

import { create } from "zustand";

/** Render quality, lowered automatically by the scene's PerformanceMonitor on slow devices. */
type QualityStore = {
  dpr: number;
  shadows: boolean;
  decline: () => void;
  incline: () => void;
};

export const useQualityStore = create<QualityStore>()((set) => ({
  dpr: 1.5,
  shadows: true,
  decline: () => set({ dpr: 1, shadows: false }),
  incline: () => set({ dpr: 1.5 }),
}));

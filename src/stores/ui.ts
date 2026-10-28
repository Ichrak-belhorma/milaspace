import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJSONStorage } from "@/lib/storage";
import type { RoomObjectId } from "./room";

export type PanelId = "theme" | "ambience" | "notebook" | "timer";
export type StudyTab = "tasks" | "flashcards" | "practice";
export type MotionPref = "system" | "reduce" | "full";

type UiStore = {
  panel: PanelId | null;
  /** "laptop" = zoomed into the laptop with the study view open; "drawer" = peeking into the open drawer. */
  view: "room" | "laptop" | "drawer";
  studyTab: StudyTab;
  /** Object whose quick controls are showing (lamp, window). */
  inspect: RoomObjectId | null;
  /** Object highlighted from the keyboard object bar or by pointer hover. */
  highlight: RoomObjectId | null;
  motion: MotionPref;
  /** Latest short status message (shown briefly and read by screen readers). */
  announcement: { id: number; text: string } | null;
  togglePanel: (panel: PanelId) => void;
  openPanel: (panel: PanelId) => void;
  closePanel: () => void;
  openLaptop: (tab?: StudyTab) => void;
  closeLaptop: () => void;
  setView: (view: UiStore["view"]) => void;
  setStudyTab: (tab: StudyTab) => void;
  setInspect: (id: RoomObjectId | null) => void;
  setHighlight: (id: RoomObjectId | null) => void;
  setMotion: (motion: MotionPref) => void;
  announce: (text: string) => void;
  /** Esc: close the innermost thing that is open. Returns false when nothing was open. */
  dismiss: () => boolean;
};

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      panel: null,
      view: "room",
      studyTab: "tasks",
      inspect: null,
      highlight: null,
      motion: "system",
      announcement: null,

      togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
      openPanel: (panel) => set({ panel }),
      closePanel: () => set({ panel: null }),
      openLaptop: (tab) => set((s) => ({ view: "laptop", studyTab: tab ?? s.studyTab, inspect: null })),
      closeLaptop: () => set({ view: "room" }),
      setView: (view) => set({ view }),
      setStudyTab: (studyTab) => set({ studyTab }),
      setInspect: (inspect) => set({ inspect }),
      setHighlight: (highlight) => set({ highlight }),
      setMotion: (motion) => set({ motion }),
      announce: (text) => set((s) => ({ announcement: { id: (s.announcement?.id ?? 0) + 1, text } })),
      dismiss: () => {
        const s = get();
        if (s.inspect) set({ inspect: null });
        else if (s.panel) set({ panel: null });
        else if (s.view !== "room") set({ view: "room" });
        else return false;
        return true;
      },
    }),
    {
      name: "mila:ui",
      version: 1,
      storage: localJSONStorage,
      partialize: (s) => ({ motion: s.motion, studyTab: s.studyTab }),
    },
  ),
);

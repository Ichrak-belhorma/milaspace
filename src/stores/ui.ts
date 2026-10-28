import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dayKey } from "@/lib/day";
import { localJSONStorage } from "@/lib/storage";
import type { RoomObjectId } from "./room";

export type PanelId = "theme" | "ambience" | "notebook" | "timer" | "account";
export type StudyTab = "today" | "modules" | "schedule" | "flashcards" | "practice";
export type MotionPref = "system" | "reduce" | "full";

/** Where you are in the room. */
export type Pose = "standing" | "seated" | "lying";
/** Desk objects that get a close-up when you are seated. */
export const CLOSEUP_OBJECTS = ["fidget", "notebook", "mug", "lamp"] as const;
export type Closeup = (typeof CLOSEUP_OBJECTS)[number];
/** What you are looking at closely: the laptop (study view), into the drawer, or a desk object. */
export type Focus = "laptop" | "drawer" | "calendar" | Closeup;

export function isCloseup(id: string): id is Closeup {
  return (CLOSEUP_OBJECTS as readonly string[]).includes(id);
}

type UiStore = {
  panel: PanelId | null;
  pose: Pose;
  focus: Focus | null;
  /** Eyes closed in bed. */
  sleeping: boolean;
  /** Epoch ms when a nap alarm wakes you, or null to rest without an alarm. */
  napEndsAt: number | null;
  studyTab: StudyTab;
  /** Wall calendar: shown month (YYYY-MM) and selected day. */
  calendar: { month: string; day: string | null };
  setCalendar: (patch: Partial<UiStore["calendar"]>) => void;
  /** Object whose quick controls are showing. */
  inspect: RoomObjectId | null;
  /** Object highlighted from the keyboard object bar or by pointer hover. */
  highlight: RoomObjectId | null;
  motion: MotionPref;
  /** The phone alarm is ringing. */
  alarmRinging: boolean;
  setAlarmRinging: (ringing: boolean) => void;
  /** Latest short status message (shown briefly and read by screen readers). */
  announcement: { id: number; text: string } | null;
  togglePanel: (panel: PanelId) => void;
  openPanel: (panel: PanelId) => void;
  closePanel: () => void;
  /** Sit at the desk and open the study view. */
  openLaptop: (tab?: StudyTab) => void;
  /** Leave the study view; you stay seated at the desk. */
  closeLaptop: () => void;
  setPose: (pose: Pose) => void;
  setFocus: (focus: Focus | null) => void;
  sleep: (napMinutes: number | null) => void;
  wake: () => void;
  setStudyTab: (tab: StudyTab) => void;
  setInspect: (id: RoomObjectId | null) => void;
  setHighlight: (id: RoomObjectId | null) => void;
  setMotion: (motion: MotionPref) => void;
  announce: (text: string) => void;
  /**
   * Esc: undo the innermost thing. Order: wake → quick controls → panel → close-up → stand up.
   * Returns false when there was nothing to undo. (Closing the drawer lives in stores/actions.)
   */
  dismiss: () => boolean;
};

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      panel: null,
      pose: "standing",
      focus: null,
      sleeping: false,
      napEndsAt: null,
      studyTab: "today",
      calendar: { month: dayKey(Date.now()).slice(0, 7), day: null },
      setCalendar: (patch) => set((s) => ({ calendar: { ...s.calendar, ...patch } })),
      inspect: null,
      highlight: null,
      motion: "system",
      alarmRinging: false,
      setAlarmRinging: (alarmRinging) => set({ alarmRinging }),
      announcement: null,

      togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
      openPanel: (panel) => set({ panel }),
      closePanel: () => set({ panel: null }),
      openLaptop: (tab) =>
        set((s) => ({ pose: "seated", focus: "laptop", sleeping: false, napEndsAt: null, studyTab: tab ?? s.studyTab, inspect: null })),
      closeLaptop: () => set((s) => (s.focus === "laptop" ? { focus: null } : {})),
      setPose: (pose) => set({ pose, focus: null, ...(pose !== "lying" ? { sleeping: false, napEndsAt: null } : {}) }),
      setFocus: (focus) => set({ focus }),
      sleep: (napMinutes) =>
        set({ pose: "lying", focus: null, sleeping: true, napEndsAt: napMinutes ? Date.now() + napMinutes * 60_000 : null, inspect: null }),
      wake: () => set({ sleeping: false, napEndsAt: null }),
      setStudyTab: (studyTab) => set({ studyTab }),
      setInspect: (inspect) => set({ inspect }),
      setHighlight: (highlight) => set({ highlight }),
      setMotion: (motion) => set({ motion }),
      announce: (text) => set((s) => ({ announcement: { id: (s.announcement?.id ?? 0) + 1, text } })),
      dismiss: () => {
        const s = get();
        if (s.sleeping) set({ sleeping: false, napEndsAt: null });
        else if (s.inspect) set({ inspect: null });
        else if (s.panel) set({ panel: null });
        else if (s.focus) set({ focus: null });
        else if (s.pose !== "standing") set({ pose: "standing" });
        else return false;
        return true;
      },
    }),
    {
      name: "mila:ui",
      version: 2,
      storage: localJSONStorage,
      partialize: (s) => ({ motion: s.motion, studyTab: s.studyTab }),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as { motion?: MotionPref; studyTab?: string };
        return { motion: p.motion ?? "system", studyTab: "today" as StudyTab };
      },
    },
  ),
);

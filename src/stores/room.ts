import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJSONStorage } from "@/lib/storage";

export const WEATHERS = ["clear", "rain", "snow", "night", "sunset"] as const;
export type Weather = (typeof WEATHERS)[number];

export const ROOM_OBJECTS = ["lamp", "window", "mug", "drawer", "laptop", "notebook", "fidget"] as const;
export type RoomObjectId = (typeof ROOM_OBJECTS)[number];

/** A full mug lasts this many sips. Coffee cools (steam fades) over COFFEE_COOL_MS. */
export const MUG_SIPS = 5;
export const COFFEE_COOL_MS = 20 * 60_000;

type RoomStore = {
  lamp: { on: boolean; warmth: number; brightness: number };
  window: { open: boolean; weather: Weather };
  coffee: { present: boolean; sipsLeft: number; brewedAt: number | null };
  drawerOpen: boolean;
  /** Increments on every fidget click; the scene turns each increment into spin. */
  fidgetClicks: number;
  toggleLamp: () => void;
  setLamp: (patch: Partial<RoomStore["lamp"]>) => void;
  toggleWindow: () => void;
  setWeather: (weather: Weather) => void;
  /** Bring a fresh coffee, take a sip, or clear away an empty mug. */
  useMug: () => "brought" | "sipped" | "cleared";
  toggleDrawer: () => void;
  clickFidget: () => void;
};

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      lamp: { on: true, warmth: 0.75, brightness: 0.7 },
      window: { open: false, weather: "rain" },
      coffee: { present: false, sipsLeft: 0, brewedAt: null },
      drawerOpen: false,
      fidgetClicks: 0,

      toggleLamp: () => set((s) => ({ lamp: { ...s.lamp, on: !s.lamp.on } })),
      setLamp: (patch) => set((s) => ({ lamp: { ...s.lamp, ...patch } })),
      toggleWindow: () => set((s) => ({ window: { ...s.window, open: !s.window.open } })),
      setWeather: (weather) => set((s) => ({ window: { ...s.window, weather } })),
      useMug: () => {
        const { coffee } = get();
        if (!coffee.present) {
          set({ coffee: { present: true, sipsLeft: MUG_SIPS, brewedAt: Date.now() } });
          return "brought";
        }
        if (coffee.sipsLeft > 0) {
          set({ coffee: { ...coffee, sipsLeft: coffee.sipsLeft - 1 } });
          return "sipped";
        }
        set({ coffee: { present: false, sipsLeft: 0, brewedAt: null } });
        return "cleared";
      },
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      clickFidget: () => set((s) => ({ fidgetClicks: s.fidgetClicks + 1 })),
    }),
    {
      name: "mila:room",
      version: 1,
      storage: localJSONStorage,
      partialize: (s) => ({ lamp: s.lamp, window: s.window, coffee: s.coffee }),
    },
  ),
);

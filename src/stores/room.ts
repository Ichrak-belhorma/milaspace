import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJSONStorage } from "@/lib/storage";

export const WEATHERS = ["clear", "rain", "snow", "night", "sunset"] as const;
export type Weather = (typeof WEATHERS)[number];

export const ROOM_OBJECTS = [
  "window",
  "curtains",
  "painting",
  "lamp",
  "laptop",
  "notebook",
  "mug",
  "fidget",
  "drawer",
  "desk",
  "phone",
  "bed",
] as const;
export type RoomObjectId = (typeof ROOM_OBJECTS)[number];

export type DrinkId = "coffee" | "tea" | "matcha" | "chocolate" | "water";

/** Drinks you can make. Colors are physical (not themed); `hot` drinks steam until they cool. */
export const DRINKS: Record<DrinkId, { label: string; liquid: string; hot: boolean; vessel: "mug" | "glass"; ready: string }> = {
  coffee: { label: "Coffee", liquid: "#3b2416", hot: true, vessel: "mug", ready: "Fresh coffee on your desk" },
  tea: { label: "Tea", liquid: "#8a4b16", hot: true, vessel: "mug", ready: "Your tea is ready" },
  matcha: { label: "Matcha latte", liquid: "#8fae5b", hot: true, vessel: "mug", ready: "Matcha latte, whisked" },
  chocolate: { label: "Hot chocolate", liquid: "#5a3022", hot: true, vessel: "mug", ready: "Hot chocolate, extra cozy" },
  water: { label: "Water", liquid: "#cfe8f3", hot: false, vessel: "glass", ready: "A glass of water. Good call." },
};
export const DRINK_IDS = Object.keys(DRINKS) as DrinkId[];

/** A full drink lasts this many sips. Hot drinks cool (steam fades) over DRINK_COOL_MS. */
export const DRINK_SIPS = 5;
export const DRINK_COOL_MS = 20 * 60_000;

type Drink = { kind: DrinkId | null; sipsLeft: number; madeAt: number | null };

type RoomStore = {
  lamp: { on: boolean; warmth: number; brightness: number };
  window: { open: boolean; weather: Weather };
  curtainsClosed: boolean;
  drink: Drink;
  drawerOpen: boolean;
  phone: { faceDown: boolean };
  /** Bumps whenever the painting's custom image changes; the image itself lives in IndexedDB. */
  painting: { custom: boolean; version: number };
  /** Increments on every fidget click; the scene turns each increment into spin. */
  fidgetClicks: number;
  toggleLamp: () => void;
  setLamp: (patch: Partial<RoomStore["lamp"]>) => void;
  toggleWindow: () => void;
  setWeather: (weather: Weather) => void;
  toggleCurtains: () => void;
  makeDrink: (kind: DrinkId) => void;
  /** Sip the drink, or clear the empty cup away. */
  sip: () => "sipped" | "cleared" | "none";
  toggleDrawer: () => void;
  setPhoneFaceDown: (faceDown: boolean) => void;
  setPainting: (custom: boolean) => void;
  clickFidget: () => void;
};

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      lamp: { on: true, warmth: 0.75, brightness: 0.7 },
      window: { open: false, weather: "rain" },
      curtainsClosed: false,
      drink: { kind: null, sipsLeft: 0, madeAt: null },
      drawerOpen: false,
      phone: { faceDown: false },
      painting: { custom: false, version: 0 },
      fidgetClicks: 0,

      toggleLamp: () => set((s) => ({ lamp: { ...s.lamp, on: !s.lamp.on } })),
      setLamp: (patch) => set((s) => ({ lamp: { ...s.lamp, ...patch } })),
      toggleWindow: () => set((s) => ({ window: { ...s.window, open: !s.window.open } })),
      setWeather: (weather) => set((s) => ({ window: { ...s.window, weather } })),
      toggleCurtains: () => set((s) => ({ curtainsClosed: !s.curtainsClosed })),
      makeDrink: (kind) => set({ drink: { kind, sipsLeft: DRINK_SIPS, madeAt: Date.now() } }),
      sip: () => {
        const { drink } = get();
        if (!drink.kind) return "none";
        if (drink.sipsLeft > 0) {
          set({ drink: { ...drink, sipsLeft: drink.sipsLeft - 1 } });
          return "sipped";
        }
        set({ drink: { kind: null, sipsLeft: 0, madeAt: null } });
        return "cleared";
      },
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      setPhoneFaceDown: (faceDown) => set({ phone: { faceDown } }),
      setPainting: (custom) => set((s) => ({ painting: { custom, version: s.painting.version + 1 } })),
      clickFidget: () => set((s) => ({ fidgetClicks: s.fidgetClicks + 1 })),
    }),
    {
      name: "mila:room",
      version: 2,
      storage: localJSONStorage,
      partialize: (s) => ({
        lamp: s.lamp,
        window: s.window,
        curtainsClosed: s.curtainsClosed,
        drink: s.drink,
        phone: s.phone,
        painting: s.painting,
      }),
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          // v1 only had coffee.
          const c = p.coffee as { present?: boolean; sipsLeft?: number; brewedAt?: number | null } | undefined;
          p.drink = c?.present ? { kind: "coffee", sipsLeft: c.sipsLeft ?? 0, madeAt: c.brewedAt ?? null } : { kind: null, sipsLeft: 0, madeAt: null };
          delete p.coffee;
        }
        return p as Partial<RoomStore>;
      },
    },
  ),
);

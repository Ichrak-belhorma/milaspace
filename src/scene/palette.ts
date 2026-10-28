import type { Weather } from "@/stores/room";

/**
 * Fixed material colors for things that should not follow the theme (coffee, glass, screen bezel),
 * and the outdoor look for each weather. Theme-driven colors live in the theme's `room` tokens.
 */
export const FIXED = {
  coffee: "#3b2416",
  glass: "#dfeef5",
  bezel: "#15151a",
  keyboard: "#2a2a30",
  wire: "#2b2620",
  steam: "#ffffff",
  ink: "#2b2a33",
  rule: "#6f8fb0",
  phoneOff: "#0c0c10",
  examRed: "#c42b2b",
  sticky: "#f6e27a",
  skin: "#c8977a",
  hair: "#2a1d18",
  denim: "#3b4a63",
  phoneText: "#ffffff",
  phoneGlow: "#cfe0ff",
  lampCool: "#e3ecff",
  lampWarm: "#ffb35c",
};

export type WeatherLook = {
  skyTop: string;
  skyBottom: string;
  hills: string;
  trees: string;
  light: string;
  lightIntensity: number;
  /** Multiplier on the room's ambient light. */
  ambient: number;
  orb: { color: string; position: [number, number, number]; size: number } | null;
};

export const WEATHER_LOOK: Record<Weather, WeatherLook> = {
  clear: {
    skyTop: "#3f8fd6",
    skyBottom: "#cfe7f6",
    hills: "#79a659",
    trees: "#3c6a39",
    light: "#fff2d8",
    lightIntensity: 2.2,
    ambient: 1,
    orb: { color: "#fff7dc", position: [-4.6, 3.6, -13.5], size: 0.45 },
  },
  rain: {
    skyTop: "#57636f",
    skyBottom: "#9aa6b1",
    hills: "#55684d",
    trees: "#33473a",
    light: "#b9c6d3",
    lightIntensity: 0.7,
    ambient: 0.75,
    orb: null,
  },
  snow: {
    skyTop: "#97a8bb",
    skyBottom: "#e6edf4",
    hills: "#eef2f6",
    trees: "#5d7068",
    light: "#e6eef7",
    lightIntensity: 1.3,
    ambient: 0.95,
    orb: null,
  },
  night: {
    skyTop: "#070d24",
    skyBottom: "#1f2d58",
    hills: "#141c2a",
    trees: "#0b121b",
    light: "#7f95d8",
    lightIntensity: 0.35,
    ambient: 0.45,
    orb: { color: "#f4f0da", position: [-4.0, 3.4, -13.5], size: 0.35 },
  },
  sunset: {
    skyTop: "#3f2d6b",
    skyBottom: "#ff9a5e",
    hills: "#5a4f3a",
    trees: "#2b2426",
    light: "#ffb27a",
    lightIntensity: 1.6,
    ambient: 0.85,
    orb: { color: "#ffd27a", position: [-5.2, 1.5, -13.5], size: 0.8 },
  },
};

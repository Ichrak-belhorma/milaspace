import type { Weather } from "@/stores/room";
import type { SoundFactory } from "./nodes";
import { birds, cafe, crickets, fireplace, layered, rain, wind } from "./procedural/ambience";
import { milaRadio } from "./procedural/radio";

/**
 * Audio registry: the single place sounds are declared. Each entry is either procedural (synthesized)
 * or a file URL; swapping a placeholder for a recording is a one-line change here.
 */
export type SoundSpec = { kind: "procedural"; factory: SoundFactory } | { kind: "file"; src: string };

export const AMBIENT_LAYERS = {
  rain: { label: "Rain", sound: { kind: "procedural", factory: rain } },
  cafe: { label: "Café", sound: { kind: "procedural", factory: cafe } },
  fireplace: { label: "Fireplace", sound: { kind: "procedural", factory: fireplace } },
} as const satisfies Record<string, { label: string; sound: SoundSpec }>;

export type AmbientLayerId = keyof typeof AMBIENT_LAYERS;
export const AMBIENT_LAYER_IDS = Object.keys(AMBIENT_LAYERS) as AmbientLayerId[];

/** What you hear through the window for each weather. */
export const WEATHER_SOUNDS: Record<Weather, SoundSpec> = {
  clear: { kind: "procedural", factory: layered(wind(0.5), birds(1)) },
  rain: { kind: "procedural", factory: rain },
  snow: { kind: "procedural", factory: wind(0.7) },
  night: { kind: "procedural", factory: layered(crickets, wind(0.3)) },
  sunset: { kind: "procedural", factory: layered(wind(0.5), birds(0.5)) },
};

export type MusicTrack = { id: string; title: string; artist?: string; sound: SoundSpec };

/**
 * Built-in music. Add licensed or CC0 lo-fi files under /public/audio/music and list them here, e.g.
 * { id: "rainy-desk", title: "Rainy Desk", artist: "…", sound: { kind: "file", src: "/audio/music/rainy-desk.mp3" } }
 */
export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "mila-radio", title: "Mila Radio", artist: "Generative lo-fi", sound: { kind: "procedural", factory: milaRadio } },
];

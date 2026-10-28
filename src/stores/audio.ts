import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AmbientLayerId } from "@/audio/registry";
import { localJSONStorage } from "@/lib/storage";

export type UserTrack = { id: string; title: string; url: string };

type AudioStore = {
  masterVolume: number;
  muted: boolean;
  /** 0 means the layer is off. */
  layers: Record<AmbientLayerId, number>;
  /** Volume of the weather heard through the window. */
  weatherVolume: number;
  sfxVolume: number;
  music: { playing: boolean; trackId: string; volume: number };
  /** Local files picked this session (object URLs do not survive a reload, so these are not persisted). */
  userTracks: UserTrack[];
  setMaster: (v: number) => void;
  toggleMute: () => void;
  setLayer: (id: AmbientLayerId, v: number) => void;
  setWeatherVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setMusic: (patch: Partial<AudioStore["music"]>) => void;
  addUserTrack: (track: UserTrack) => void;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const useAudioStore = create<AudioStore>()(
  persist(
    (set) => ({
      masterVolume: 0.8,
      muted: false,
      layers: { rain: 0, cafe: 0, fireplace: 0 },
      weatherVolume: 0.5,
      sfxVolume: 0.6,
      music: { playing: false, trackId: "mila-radio", volume: 0.55 },
      userTracks: [],
      setMaster: (v) => set({ masterVolume: clamp01(v) }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setLayer: (id, v) => set((s) => ({ layers: { ...s.layers, [id]: clamp01(v) } })),
      setWeatherVolume: (v) => set({ weatherVolume: clamp01(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
      setMusic: (patch) => set((s) => ({ music: { ...s.music, ...patch } })),
      addUserTrack: (track) => set((s) => ({ userTracks: [...s.userTracks, track] })),
    }),
    {
      name: "mila:audio",
      version: 1,
      storage: localJSONStorage,
      // Never resume playback on load: browsers block autoplay and surprise audio is unkind.
      partialize: (s) => ({
        masterVolume: s.masterVolume,
        muted: s.muted,
        layers: s.layers,
        weatherVolume: s.weatherVolume,
        sfxVolume: s.sfxVolume,
        music: { ...s.music, playing: false },
      }),
    },
  ),
);

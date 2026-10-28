"use client";

import { useEffect } from "react";
import { audioEngine, type AudioSnapshot } from "@/audio/engine";
import { MUSIC_TRACKS } from "@/audio/registry";
import { dismissTop } from "@/stores/actions";
import { useAudioStore } from "@/stores/audio";
import { useRoomStore } from "@/stores/room";
import { useThemeStore } from "@/stores/theme";
import { useTimerStore } from "@/stores/timer";
import { useUiStore } from "@/stores/ui";
import { applyCssVars, THEME_VARS_STORAGE_KEY, themeToCssVars } from "@/theme/cssVars";

/** Writes the active theme to :root and remembers it for the no-flash script. */
export function ThemeApplier() {
  const theme = useThemeStore((s) => s.active);
  useEffect(() => {
    const vars = themeToCssVars(theme);
    applyCssVars(vars);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.tokens.background);
    try {
      localStorage.setItem(THEME_VARS_STORAGE_KEY, JSON.stringify(vars));
    } catch {
      /* storage unavailable: theme still applies for this session */
    }
  }, [theme]);
  return null;
}

/** Mirrors the motion preference onto <html data-motion> for the CSS rules. */
export function MotionApplier() {
  const motion = useUiStore((s) => s.motion);
  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);
  return null;
}

/** Esc closes the innermost open thing (drawer peek → inspector → panel → laptop view). */
export function KeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (dismissTop()) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

function snapshot(): AudioSnapshot {
  const a = useAudioStore.getState();
  const room = useRoomStore.getState();
  const builtIn = MUSIC_TRACKS.find((t) => t.id === a.music.trackId);
  const user = a.userTracks.find((t) => t.id === a.music.trackId);
  const spec = builtIn?.sound ?? (user ? { kind: "file" as const, src: user.url } : null);
  return {
    master: a.masterVolume,
    muted: a.muted,
    layers: a.layers,
    weather: room.window.weather,
    windowOpen: room.window.open,
    curtainsClosed: room.curtainsClosed,
    weatherVolume: a.weatherVolume,
    sfxVolume: a.sfxVolume,
    music: { playing: a.music.playing, volume: a.music.volume, key: a.music.trackId, spec },
  };
}

/** Connects the stores to the audio engine and turns room events into sounds. */
export function AudioBridge() {
  useEffect(() => {
    // Browsers only allow audio after a user gesture.
    const unlock = () => audioEngine.unlock();
    window.addEventListener("pointerdown", unlock, { capture: true });
    window.addEventListener("keydown", unlock, { capture: true });

    const push = () => audioEngine.apply(snapshot());
    push();
    const unsubAudio = useAudioStore.subscribe(push);
    const unsubRoom = useRoomStore.subscribe((s, prev) => {
      if (s.window !== prev.window || s.curtainsClosed !== prev.curtainsClosed) push();
      if (s.lamp.on !== prev.lamp.on) audioEngine.sfx("switch");
      if (s.window.open !== prev.window.open) audioEngine.sfx("window");
      if (s.curtainsClosed !== prev.curtainsClosed) audioEngine.sfx("curtain");
      if (s.drawerOpen !== prev.drawerOpen) audioEngine.sfx("drawer");
      if (s.fidgetClicks !== prev.fidgetClicks) audioEngine.sfx("click");
      if (s.phone.faceDown !== prev.phone.faceDown) audioEngine.sfx("tap");
      if (s.drink.madeAt !== prev.drink.madeAt && s.drink.kind) audioEngine.sfx("pour");
      else if (s.drink.sipsLeft < prev.drink.sipsLeft) audioEngine.sfx("sip");
    });
    const unsubUi = useUiStore.subscribe((s, prev) => {
      if (s.pose !== prev.pose) {
        if (s.pose === "lying") audioEngine.sfx("flop");
        else if (s.pose === "seated") audioEngine.sfx("chair");
        else if (prev.pose === "lying") audioEngine.sfx("rustle");
      }
      if (s.inspect === "phone" && prev.inspect !== "phone") audioEngine.sfx("tap");
    });
    const unsubTimer = useTimerStore.subscribe((s, prev) => {
      if (s.finishedCount > prev.finishedCount && s.settings.chime) audioEngine.sfx("chime");
    });

    // When a file track ends, move to the next track.
    audioEngine.setOnTrackEnded(() => {
      const a = useAudioStore.getState();
      const ids = [...MUSIC_TRACKS.map((t) => t.id), ...a.userTracks.map((t) => t.id)];
      const next = ids[(ids.indexOf(a.music.trackId) + 1) % ids.length];
      if (next) a.setMusic({ trackId: next });
    });

    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      unsubAudio();
      unsubRoom();
      unsubUi();
      unsubTimer();
      audioEngine.setOnTrackEnded(null);
    };
  }, []);
  return null;
}

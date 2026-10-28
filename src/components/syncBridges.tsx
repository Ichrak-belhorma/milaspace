"use client";

import { useEffect } from "react";
import { claimDevice, fullSync, isApplyingRemote, markLocalChange, schedulePush } from "@/lib/sync/engine";
import { getSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useNow } from "@/hooks/useNow";
import { dayKey } from "@/lib/day";
import { useAudioStore } from "@/stores/audio";
import { useAuthStore } from "@/stores/auth";
import { useNotebookStore } from "@/stores/notebook";
import { useRoomStore } from "@/stores/room";
import { useStudyStore } from "@/stores/study";
import { useThemeStore } from "@/stores/theme";
import { useTimerStore } from "@/stores/timer";
import { useUiStore } from "@/stores/ui";

const RESYNC_MS = 5 * 60_000;

/** Session handling and cloud sync triggers. Renders nothing; does nothing when Supabase isn't configured. */
export function AuthBridge() {
  useEffect(() => {
    const auth = useAuthStore.getState();
    const db = getSupabase();
    if (!isSupabaseConfigured || !db) {
      auth.setStatus("unconfigured");
      return;
    }

    // Arriving from an email link.
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("auth");
    if (flag) {
      useUiStore.getState().announce(flag === "signed-in" ? "You're signed in. Syncing your room…" : "That sign-in link didn't work. Try again from the Account panel.");
      params.delete("auth");
      window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
    }

    let currentId: string | null = null;
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
      useAuthStore.getState().setUser(user);
      if (user && user.id !== currentId) {
        currentId = user.id;
        // Defer: Supabase recommends not awaiting other calls inside this callback.
        setTimeout(() => void claimDevice(user.id).then(fullSync), 0);
      }
      if (!user) currentId = null;
    });

    let lastFull = Date.now();
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastFull > 60_000) {
        lastFull = Date.now();
        void fullSync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      lastFull = Date.now();
      void fullSync();
    }, RESYNC_MS);

    // Local edits → debounced push. Settings and room state carry their own change stamps.
    const edits = () => !isApplyingRemote() && schedulePush();
    const profile = () => {
      if (isApplyingRemote()) return;
      markLocalChange("profile");
      schedulePush();
    };
    const unsubs = [
      useStudyStore.subscribe((s, p) => (s.modules !== p.modules || s.nodes !== p.nodes || s.tasks !== p.tasks || s.cards !== p.cards || s.reviewLogs !== p.reviewLogs) && edits()),
      useNotebookStore.subscribe(edits),
      useTimerStore.subscribe((s, p) => {
        if (s.sessions !== p.sessions) edits();
        if (s.settings !== p.settings) profile();
      }),
      useThemeStore.subscribe((s, p) => {
        if (s.custom !== p.custom) edits();
        if (s.active !== p.active) profile();
      }),
      useAudioStore.subscribe((s, p) => {
        if (s.masterVolume !== p.masterVolume || s.layers !== p.layers || s.weatherVolume !== p.weatherVolume || s.sfxVolume !== p.sfxVolume || s.music.volume !== p.music.volume) profile();
      }),
      useUiStore.subscribe((s, p) => s.motion !== p.motion && profile()),
      useRoomStore.subscribe((s, p) => {
        if (isApplyingRemote() || s.fidgetClicks !== p.fidgetClicks || s.drawerOpen !== p.drawerOpen) return;
        markLocalChange("room");
        schedulePush();
      }),
    ];

    return () => {
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      unsubs.forEach((u) => u());
    };
  }, []);
  return null;
}

/** Keeps the study plan current: replans on load and when the day changes. */
export function StudyPlanner() {
  const now = useNow(60_000);
  const today = dayKey(now);
  useEffect(() => {
    if (useStudyStore.getState().plannedFor !== today) useStudyStore.getState().replan();
  }, [today]);
  return null;
}

"use client";

import { useSyncExternalStore } from "react";
import { useUiStore } from "@/stores/ui";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True when motion should be minimized: the user's Mila setting wins, otherwise the OS setting. */
export function useReducedMotion(): boolean {
  const pref = useUiStore((s) => s.motion);
  const system = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  return pref === "reduce" || (pref === "system" && system);
}

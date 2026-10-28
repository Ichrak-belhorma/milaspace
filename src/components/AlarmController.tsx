"use client";

import { useEffect } from "react";
import { audioEngine } from "@/audio/engine";
import { dayKey } from "@/lib/day";
import { useRoomStore } from "@/stores/room";
import { useUiStore } from "@/stores/ui";

let snoozeUntil = 0;
let firedFor = "";

export function snoozeAlarm(minutes = 9) {
  snoozeUntil = Date.now() + minutes * 60_000;
  useUiStore.getState().setAlarmRinging(false);
}

export function stopAlarm() {
  snoozeUntil = 0;
  useUiStore.getState().setAlarmRinging(false);
}

/** Rings the phone's daily alarm (while Mila is open): wakes you if napping, and opens the phone. */
export function AlarmController() {
  useEffect(() => {
    const check = () => {
      const { alarm } = useRoomStore.getState().phone;
      const ui = useUiStore.getState();
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const key = `${dayKey(now.getTime())} ${alarm.time}`;
      const due = (alarm.enabled && hhmm === alarm.time && firedFor !== key) || (snoozeUntil && Date.now() >= snoozeUntil);
      if (due && !ui.alarmRinging) {
        firedFor = key;
        snoozeUntil = 0;
        ui.setAlarmRinging(true);
        if (ui.sleeping) ui.wake();
        ui.setInspect("phone");
        ui.announce(`Alarm: ${alarm.time}`);
      }
    };
    const ring = setInterval(() => useUiStore.getState().alarmRinging && audioEngine.sfx("alarm"), 2500);
    const poll = setInterval(check, 5000);
    check();
    // Ring for at most two minutes.
    const unsub = useUiStore.subscribe((s, p) => {
      if (s.alarmRinging && !p.alarmRinging) setTimeout(() => useUiStore.getState().alarmRinging && stopAlarm(), 120_000);
    });
    return () => {
      clearInterval(ring);
      clearInterval(poll);
      unsub();
    };
  }, []);
  return null;
}

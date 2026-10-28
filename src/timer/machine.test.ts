import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  focusElapsed,
  formatClock,
  initialState,
  pause,
  remainingMs,
  reset,
  skip,
  start,
  tick,
  withSettings,
  type TimerSettings,
} from "./machine";

const MIN = 60_000;
const s: TimerSettings = { ...DEFAULT_SETTINGS, autoStartBreaks: true, autoStartFocus: false };
const T0 = 1_750_000_000_000;

describe("timer machine", () => {
  it("counts down from an absolute end time", () => {
    const running = start(initialState(s), T0);
    expect(running.endsAt).toBe(T0 + 25 * MIN);
    expect(remainingMs(running, T0 + 10 * MIN)).toBe(15 * MIN);
  });

  it("pausing freezes remaining time and excludes paused time from focus", () => {
    let st = start(initialState(s), T0);
    st = pause(st, T0 + 5 * MIN);
    expect(remainingMs(st, T0 + 60 * MIN)).toBe(20 * MIN);
    st = start(st, T0 + 30 * MIN);
    expect(st.endsAt).toBe(T0 + 50 * MIN);
    expect(focusElapsed(st, T0 + 32 * MIN)).toBe(7 * MIN);
  });

  it("completes focus, logs a session and auto-starts the short break", () => {
    const st = start(initialState(s), T0);
    const t = tick(st, s, T0 + 25 * MIN + 500, "a");
    expect(t.finished).toBe("focus");
    expect(t.session).toMatchObject({ minutes: 25, completed: true, startedAt: T0 });
    expect(t.state.phase).toBe("shortBreak");
    expect(t.state.status).toBe("running");
    expect(t.state.cycleCount).toBe(1);
  });

  it("does nothing before the end time", () => {
    const st = start(initialState(s), T0);
    expect(tick(st, s, T0 + MIN, "a").state).toBe(st);
  });

  it("only credits the scheduled focus length when the tab slept past the end", () => {
    const st = start(initialState(s), T0);
    const t = tick(st, s, T0 + 3 * 60 * MIN, "a");
    expect(t.session?.minutes).toBe(25);
    expect(t.session?.endedAt).toBe(T0 + 25 * MIN);
  });

  it("takes a long break after the configured number of focus blocks", () => {
    let st = initialState(s);
    for (let i = 0; i < 3; i++) {
      st = tick(start(st, T0), s, T0 + 25 * MIN, "f").state; // focus → short break
      st = tick(st, s, T0 + 30 * MIN, "b").state; // short break → focus (idle)
      expect(st.phase).toBe("focus");
      expect(st.status).toBe("idle");
    }
    const t = tick(start(st, T0), s, T0 + 25 * MIN, "f");
    expect(t.state.phase).toBe("longBreak");
    expect(t.state.cycleCount).toBe(0);
  });

  it("skip logs a partial focus block of at least a minute", () => {
    const st = start(initialState(s), T0);
    const short = skip(st, s, T0 + 30_000, "x");
    expect(short.session).toBeNull();
    const long = skip(st, s, T0 + 12 * MIN, "x");
    expect(long.session).toMatchObject({ minutes: 12, completed: false });
    expect(long.state.phase).toBe("shortBreak");
    expect(long.state.status).toBe("idle");
  });

  it("reset restarts the current phase and keeps the cycle", () => {
    const st = start(initialState(s), T0);
    const r = reset(st, s, T0 + 3 * MIN, "x");
    expect(r.state.phase).toBe("focus");
    expect(r.state.remainingMs).toBe(25 * MIN);
    expect(r.session?.minutes).toBe(3);
  });

  it("picks up new lengths only while untouched", () => {
    const next = { ...s, focusMin: 50 };
    expect(withSettings(initialState(s), s, next).remainingMs).toBe(50 * MIN);
    const paused = pause(start(initialState(s), T0), T0 + MIN);
    expect(withSettings(paused, s, next).remainingMs).toBe(24 * MIN);
  });

  it("formats the clock", () => {
    expect(formatClock(25 * MIN)).toBe("25:00");
    expect(formatClock(61_001)).toBe("01:02");
    expect(formatClock(0)).toBe("00:00");
  });
});

import { idleFocus, startFor } from "./machine";
describe("custom-length runs", () => {
  it("starts a 5-minute starter and returns to an idle focus phase", () => {
    const s5 = startFor(initialState(s), s, T0, 5 * MIN);
    expect(remainingMs(s5, T0)).toBe(5 * MIN);
    const done = tick(s5, s, T0 + 5 * MIN, "x");
    expect(done.session?.minutes).toBe(5);
    expect(idleFocus(done.state, s)).toMatchObject({ phase: "focus", status: "idle", remainingMs: 25 * MIN });
  });
});

/**
 * Pomodoro state machine. Pure functions over plain data so it is testable and persistable.
 * Running timers store an absolute end timestamp, so throttled background tabs and reloads stay accurate.
 */
export type Phase = "focus" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";

export type TimerSettings = {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  longBreakEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  chime: boolean;
};

export type TimerState = {
  phase: Phase;
  status: TimerStatus;
  /** Epoch ms when the running phase ends. Only meaningful while running. */
  endsAt: number | null;
  /** Remaining ms while idle or paused. */
  remainingMs: number;
  /** Start of the current focus block, for session logging. */
  focusStartedAt: number | null;
  /** Focus time accumulated before the current running segment (excludes pauses). */
  focusElapsedMs: number;
  /** Start of the current running segment. */
  segmentStartedAt: number | null;
  /** Focus blocks completed in the current long-break cycle. */
  cycleCount: number;
};

export type FocusSession = {
  id: string;
  startedAt: number;
  endedAt: number;
  minutes: number;
  completed: boolean;
};

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  chime: true,
};

/** Partial focus blocks shorter than this are not logged. */
export const MIN_LOGGED_FOCUS_MS = 60_000;

const MINUTE = 60_000;

export function durationMs(phase: Phase, s: TimerSettings): number {
  const min = phase === "focus" ? s.focusMin : phase === "shortBreak" ? s.shortBreakMin : s.longBreakMin;
  return Math.round(min * MINUTE);
}

export function initialState(s: TimerSettings): TimerState {
  return {
    phase: "focus",
    status: "idle",
    endsAt: null,
    remainingMs: durationMs("focus", s),
    focusStartedAt: null,
    focusElapsedMs: 0,
    segmentStartedAt: null,
    cycleCount: 0,
  };
}

export function remainingMs(state: TimerState, now: number): number {
  if (state.status === "running" && state.endsAt !== null) {
    // A display clock can lag behind the moment the run started; never show more than was left then.
    const t = Math.max(now, state.segmentStartedAt ?? now);
    return Math.max(0, state.endsAt - t);
  }
  return state.remainingMs;
}

/** Focus time spent in the current block, excluding paused time. */
export function focusElapsed(state: TimerState, now: number): number {
  if (state.phase !== "focus") return 0;
  const running = state.status === "running" && state.segmentStartedAt !== null ? now - state.segmentStartedAt : 0;
  return state.focusElapsedMs + Math.max(0, running);
}

export function start(state: TimerState, now: number): TimerState {
  if (state.status === "running") return state;
  return {
    ...state,
    status: "running",
    endsAt: now + state.remainingMs,
    segmentStartedAt: now,
    focusStartedAt: state.phase === "focus" ? (state.focusStartedAt ?? now) : state.focusStartedAt,
  };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== "running") return state;
  return {
    ...state,
    status: "paused",
    remainingMs: remainingMs(state, now),
    endsAt: null,
    focusElapsedMs: focusElapsed(state, now),
    segmentStartedAt: null,
  };
}

function nextPhase(state: TimerState, s: TimerSettings): { phase: Phase; cycleCount: number } {
  if (state.phase !== "focus") return { phase: "focus", cycleCount: state.cycleCount };
  const done = state.cycleCount + 1;
  return done >= s.longBreakEvery ? { phase: "longBreak", cycleCount: 0 } : { phase: "shortBreak", cycleCount: done };
}

function enter(phase: Phase, cycleCount: number, s: TimerSettings, now: number, autoStart: boolean): TimerState {
  const idle: TimerState = { ...initialState(s), phase, cycleCount, remainingMs: durationMs(phase, s) };
  return autoStart ? start(idle, now) : idle;
}

function sessionFrom(state: TimerState, now: number, completed: boolean, id: string): FocusSession | null {
  if (state.phase !== "focus") return null;
  const elapsed = focusElapsed(state, now);
  if (!completed && elapsed < MIN_LOGGED_FOCUS_MS) return null;
  return {
    id,
    startedAt: state.focusStartedAt ?? now - elapsed,
    endedAt: now,
    minutes: Math.round((elapsed / MINUTE) * 10) / 10,
    completed,
  };
}

export type Transition = { state: TimerState; session: FocusSession | null; finished: Phase | null };

/** Advance a running timer whose end time has passed. No-op otherwise. */
export function tick(state: TimerState, s: TimerSettings, now: number, id: string): Transition {
  if (state.status !== "running" || state.endsAt === null || now < state.endsAt) {
    return { state, session: null, finished: null };
  }
  // Credit focus time only up to the scheduled end, even if the tab was asleep for longer.
  const end = state.endsAt;
  const session = sessionFrom(state, end, true, id);
  const next = nextPhase(state, s);
  const auto = next.phase === "focus" ? s.autoStartFocus : s.autoStartBreaks;
  return { state: enter(next.phase, next.cycleCount, s, now, auto), session, finished: state.phase };
}

/** Jump to the next phase now. A partial focus block of at least a minute is still logged. */
export function skip(state: TimerState, s: TimerSettings, now: number, id: string): Transition {
  const session = sessionFrom(state, now, false, id);
  const next = nextPhase(state, s);
  return { state: enter(next.phase, next.cycleCount, s, now, false), session, finished: null };
}

/** Restart the current phase from its full length. */
export function reset(state: TimerState, s: TimerSettings, now: number, id: string): Transition {
  const session = sessionFrom(state, now, false, id);
  return { state: enter(state.phase, state.cycleCount, s, now, false), session, finished: null };
}

/** Apply new settings: an untouched idle phase picks up its new length immediately. */
export function withSettings(state: TimerState, prev: TimerSettings, s: TimerSettings): TimerState {
  if (state.status === "idle" && state.remainingMs === durationMs(state.phase, prev)) {
    return { ...state, remainingMs: durationMs(state.phase, s) };
  }
  return state;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

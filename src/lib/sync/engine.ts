"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteImage, getImage, PAINTING_KEY, putImage } from "@/lib/media";
import { getSupabase } from "@/lib/supabase/client";
import { IMAGES_BUCKET } from "@/lib/supabase/config";
import { useAudioStore } from "@/stores/audio";
import { useAuthStore } from "@/stores/auth";
import { useNotebookStore } from "@/stores/notebook";
import { useRoomStore } from "@/stores/room";
import { useScheduleStore } from "@/stores/schedule";
import { useStudyStore } from "@/stores/study";
import { useThemeStore } from "@/stores/theme";
import { useTimerStore } from "@/stores/timer";
import { useUiStore } from "@/stores/ui";
import { isValidAvailability } from "@/study/availability";
import { safeTheme } from "@/theme/io";
import { getPreset } from "@/theme/presets";
import { changesSince, reconcile, type Keyed } from "./reconcile";
import { cardRows, logRows, moduleRows, nodeRows, sessionRows, taskRows, themeRows, todoRows, type Mapper } from "./rows";

/**
 * Local-first cloud sync. The device is the source of truth while you use it; the server mirrors it
 * and merges other devices in. Full syncs run on sign-in, when the tab regains focus and every few
 * minutes; small pushes run a couple of seconds after each change.
 */

type Collection<T> = Mapper<T> &
  Keyed<T> & {
    local: () => T[];
    apply: (items: T[]) => void;
  };

function collection<T>(c: Collection<T>): Collection<unknown> {
  return c as Collection<unknown>;
}

const study = () => useStudyStore.getState();

const COLLECTIONS: Collection<unknown>[] = [
  // Order matters for foreign keys: modules before what references them.
  collection({ ...moduleRows, key: (m) => m.id, stamp: (m) => m.updatedAt, local: () => study().modules, apply: (modules) => useStudyStore.setState({ modules }) }),
  collection({ ...nodeRows, key: (n) => n.id, stamp: (n) => n.updatedAt, local: () => study().nodes, apply: (nodes) => useStudyStore.setState({ nodes }) }),
  collection({
    ...taskRows,
    key: (t) => t.id,
    stamp: (t) => t.updatedAt ?? t.completedAt ?? 0,
    // Generated plan tasks are re-derived on each device; only history and your own tasks sync.
    local: () => study().tasks.filter((t) => t.source === "manual" || t.status !== "todo"),
    apply: (history) => useStudyStore.setState((s) => ({ tasks: [...s.tasks.filter((t) => t.source === "auto" && t.status === "todo"), ...history] })),
  }),
  collection({ ...cardRows, key: (c) => c.id, stamp: (c) => c.updatedAt, local: () => study().cards, apply: (cards) => useStudyStore.setState({ cards }) }),
  collection({ ...logRows, key: (l) => l.id, stamp: (l) => Date.parse(l.reviewedAt), local: () => study().reviewLogs, apply: (reviewLogs) => useStudyStore.setState({ reviewLogs }) }),
  collection({
    ...sessionRows,
    key: (s) => s.id,
    stamp: (s) => s.endedAt,
    local: () => useTimerStore.getState().sessions,
    apply: (sessions) => useTimerStore.setState({ sessions: [...sessions].sort((a, b) => a.startedAt - b.startedAt).slice(-1000) }),
  }),
  collection({ ...todoRows, key: (t) => t.id, stamp: (t) => t.updatedAt, local: () => useNotebookStore.getState().todos, apply: (todos) => useNotebookStore.getState().replaceAll(todos) }),
  collection({
    ...themeRows,
    key: (t) => t.id,
    stamp: (t) => t.updatedAt ?? 0,
    local: () => useThemeStore.getState().custom,
    apply: (custom) => useThemeStore.setState({ custom }),
  }),
];

// ---------- local bookkeeping (per user, in localStorage) ----------

const metaKey = (userId: string, name: string) => `mila:sync:${userId}:${name}`;

function readMeta<T>(userId: string, name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(metaKey(userId, name));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeMeta(userId: string, name: string, value: unknown) {
  try {
    localStorage.setItem(metaKey(userId, name), JSON.stringify(value));
  } catch {
    /* storage full: the next full sync re-derives this */
  }
}

/** True while remote data is being written into the stores, so those writes don't count as local edits. */
let applyingRemote = false;
export const isApplyingRemote = () => applyingRemote;

function asRemote(fn: () => void) {
  applyingRemote = true;
  try {
    fn();
  } finally {
    applyingRemote = false;
  }
}

/** Singletons (settings, room) carry one "last changed here" stamp each. */
export function markLocalChange(scope: "profile" | "room") {
  const user = useAuthStore.getState().user;
  if (user && !applyingRemote) writeMeta(user.id, `${scope}-stamp`, Date.now());
}

// ---------- errors ----------

class SetupNeeded extends Error {}

function check<T>(res: { data: T; error: { code?: string; message: string } | null }): T {
  if (res.error) {
    // Missing tables (0001 not run) or missing columns (a newer migration not run yet).
    if (["PGRST205", "PGRST204", "42P01", "42703"].includes(res.error.code ?? "") || /does not exist|Could not find the table|Could not find the '.+' column/i.test(res.error.message)) {
      throw new SetupNeeded(res.error.message);
    }
    throw new Error(res.error.message);
  }
  return res.data;
}

async function selectAll(db: SupabaseClient, table: string): Promise<unknown[]> {
  const page = 1000;
  const out: unknown[] = [];
  for (let from = 0; ; from += page) {
    const rows = check(await db.from(table).select("*").range(from, from + page - 1)) as unknown[];
    out.push(...rows);
    if (rows.length < page) return out;
  }
}

async function upsert(db: SupabaseClient, table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) check(await db.from(table).upsert(rows.slice(i, i + 500), { onConflict: "user_id,id" }));
}

async function remove(db: SupabaseClient, table: string, ids: string[]) {
  for (let i = 0; i < ids.length; i += 200) check(await db.from(table).delete().in("id", ids.slice(i, i + 200)));
}

// ---------- singletons ----------

function profilePayload() {
  return {
    active_theme: useThemeStore.getState().active,
    settings: {
      timer: useTimerStore.getState().settings,
      audio: (({ masterVolume, layers, weatherVolume, sfxVolume, music }) => ({ masterVolume, layers, weatherVolume, sfxVolume, musicVolume: music.volume, trackId: music.trackId }))(useAudioStore.getState()),
      motion: useUiStore.getState().motion,
      schedule: (({ dailyBudget, availability, pace }) => ({ dailyBudget, availability, pace }))(useScheduleStore.getState()),
    },
  };
}

function applyProfile(row: { active_theme: unknown; settings: Record<string, unknown> | null }) {
  const theme = safeTheme(row.active_theme);
  const settings = row.settings ?? {};
  asRemote(() => {
    if (theme) useThemeStore.setState({ active: theme, dirty: false });
    const timer = settings.timer as Partial<ReturnType<typeof useTimerStore.getState>["settings"]> | undefined;
    if (timer && typeof timer === "object") useTimerStore.getState().updateSettings(timer);
    const audio = settings.audio as Record<string, unknown> | undefined;
    if (audio && typeof audio === "object") {
      const a = useAudioStore.getState();
      useAudioStore.setState({
        masterVolume: typeof audio.masterVolume === "number" ? audio.masterVolume : a.masterVolume,
        weatherVolume: typeof audio.weatherVolume === "number" ? audio.weatherVolume : a.weatherVolume,
        sfxVolume: typeof audio.sfxVolume === "number" ? audio.sfxVolume : a.sfxVolume,
        layers: { ...a.layers, ...(audio.layers as object) },
        music: { ...a.music, volume: typeof audio.musicVolume === "number" ? audio.musicVolume : a.music.volume },
      });
    }
    if (settings.motion === "system" || settings.motion === "reduce" || settings.motion === "full") useUiStore.getState().setMotion(settings.motion);
    const schedule = settings.schedule as Record<string, unknown> | undefined;
    if (schedule && typeof schedule === "object") {
      const sc = useScheduleStore.getState();
      const pace = schedule.pace as { factor?: unknown; samples?: unknown } | undefined;
      useScheduleStore.setState({
        dailyBudget: typeof schedule.dailyBudget === "number" ? Math.min(600, Math.max(15, schedule.dailyBudget)) : sc.dailyBudget,
        availability: isValidAvailability(schedule.availability) ? schedule.availability : sc.availability,
        pace: pace && typeof pace.factor === "number" && typeof pace.samples === "number" ? { factor: Math.min(2, Math.max(0.6, pace.factor)), samples: pace.samples } : sc.pace,
      });
    }
  });
}

function roomPayload() {
  const r = useRoomStore.getState();
  return { lamp: r.lamp, window: r.window, curtainsClosed: r.curtainsClosed, drink: r.drink, phone: r.phone, buddy: r.buddy, painting: { custom: r.painting.custom } };
}

async function syncSingletons(db: SupabaseClient, userId: string) {
  // Profile: settings and the active theme.
  const profile = check(await db.from("profiles").select("active_theme, settings, settings_updated_at").eq("id", userId).maybeSingle()) as {
    active_theme: unknown;
    settings: Record<string, unknown> | null;
    settings_updated_at: string | null;
  } | null;
  const localProfile = readMeta(userId, "profile-stamp", 0);
  const remoteProfile = profile?.settings_updated_at ? Date.parse(profile.settings_updated_at) : 0;
  if (profile && remoteProfile > localProfile) {
    applyProfile(profile);
    writeMeta(userId, "profile-stamp", remoteProfile);
  } else if (localProfile > remoteProfile || !profile) {
    const stamp = localProfile || Date.now();
    check(await db.from("profiles").upsert({ id: userId, ...profilePayload(), settings_updated_at: new Date(stamp).toISOString() }));
    writeMeta(userId, "profile-stamp", stamp);
  }

  // Room: object states and the painting picture.
  const room = check(await db.from("room_state").select("state, painting_path, updated_at").eq("user_id", userId).maybeSingle()) as {
    state: Record<string, unknown>;
    painting_path: string | null;
    updated_at: string;
  } | null;
  const localRoom = readMeta(userId, "room-stamp", 0);
  const remoteRoom = room ? Date.parse(room.updated_at) : 0;
  if (room && remoteRoom > localRoom) {
    await applyRoom(db, room);
    writeMeta(userId, "room-stamp", remoteRoom);
  } else if (localRoom > remoteRoom || !room) {
    const stamp = localRoom || Date.now();
    const paintingPath = await pushPainting(db, userId);
    check(await db.from("room_state").upsert({ user_id: userId, state: roomPayload(), painting_path: paintingPath, updated_at: new Date(stamp).toISOString() }));
    writeMeta(userId, "room-stamp", stamp);
  }
}

async function pushPainting(db: SupabaseClient, userId: string): Promise<string | null> {
  const path = `${userId}/painting.jpg`;
  if (!useRoomStore.getState().painting.custom) {
    await db.storage.from(IMAGES_BUCKET).remove([path]);
    return null;
  }
  const blob = await getImage(PAINTING_KEY);
  if (!blob) return null;
  const { error } = await db.storage.from(IMAGES_BUCKET).upload(path, blob, { upsert: true, contentType: "image/jpeg" });
  if (error) throw new Error(`Painting upload failed: ${error.message}`);
  return path;
}

async function applyRoom(db: SupabaseClient, room: { state: Record<string, unknown>; painting_path: string | null }) {
  const s = room.state ?? {};
  const r = useRoomStore.getState();
  let picture: Blob | null = null;
  if (room.painting_path) {
    const { data } = await db.storage.from(IMAGES_BUCKET).download(room.painting_path);
    picture = data;
  }
  if (picture) await putImage(PAINTING_KEY, picture);
  else if (!room.painting_path) await deleteImage(PAINTING_KEY).catch(() => undefined);
  asRemote(() => {
    useRoomStore.setState({
      lamp: { ...r.lamp, ...(s.lamp as object) },
      window: { ...r.window, ...(s.window as object) },
      curtainsClosed: typeof s.curtainsClosed === "boolean" ? s.curtainsClosed : r.curtainsClosed,
      drink: { ...r.drink, ...(s.drink as object) },
      phone: { ...r.phone, ...(s.phone as object), alarm: { ...r.phone.alarm, ...((s.phone as { alarm?: object } | undefined)?.alarm ?? {}) } },
      buddy: typeof (s.buddy as { visible?: unknown } | undefined)?.visible === "boolean" ? (s.buddy as { visible: boolean }) : r.buddy,
      painting: { custom: Boolean(picture), version: r.painting.version + 1 },
    });
  });
}

// ---------- full sync and pushes ----------

let running: Promise<void> | null = null;

function fail(e: unknown) {
  const setSync = useAuthStore.getState().setSync;
  if (e instanceof SetupNeeded) setSync({ state: "setup-needed", message: "Cloud tables aren't up to date. Run the SQL files in supabase/migrations (0001, 0002, 0003) in your Supabase project." });
  else setSync({ state: "error", message: e instanceof Error ? e.message : "Sync failed" });
}

/** Pull everything, merge, push the differences. Safe to call often; concurrent calls share one run. */
export function fullSync(): Promise<void> {
  running ??= (async () => {
    const db = getSupabase();
    const user = useAuthStore.getState().user;
    if (!db || !user) return;
    const setSync = useAuthStore.getState().setSync;
    setSync({ state: "syncing", message: null });
    try {
      for (const c of COLLECTIONS) {
        const remote = (await selectAll(db, c.table)).map(c.fromRow).filter((x): x is NonNullable<typeof x> => x !== null);
        const known = readMeta<Record<string, number>>(user.id, c.table, {});
        const result = reconcile(c.local(), remote, known, c);
        asRemote(() => c.apply(result.merged));
        await upsert(db, c.table, result.upload.map((x) => c.toRow(x, user.id)));
        await remove(db, c.table, result.remove);
        writeMeta(user.id, c.table, result.known);
      }
      await syncSingletons(db, user.id);
      asRemote(() => useStudyStore.getState().replan());
      setSync({ state: "idle", lastSyncedAt: Date.now() });
    } catch (e) {
      fail(e);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Push local changes made since the last sync (no pull). */
async function pushChanges(): Promise<void> {
  const db = getSupabase();
  const user = useAuthStore.getState().user;
  if (!db || !user || running) return;
  const setSync = useAuthStore.getState().setSync;
  try {
    for (const c of COLLECTIONS) {
      const known = readMeta<Record<string, number>>(user.id, c.table, {});
      const { upload, remove: gone } = changesSince(c.local(), known, c);
      if (!upload.length && !gone.length) continue;
      await upsert(db, c.table, upload.map((x) => c.toRow(x, user.id)));
      await remove(db, c.table, gone);
      const next: Record<string, number> = {};
      for (const item of c.local()) next[c.key(item)] = c.stamp(item);
      writeMeta(user.id, c.table, next);
    }
    await syncSingletons(db, user.id);
    setSync({ state: "idle", lastSyncedAt: Date.now(), message: null });
  } catch (e) {
    fail(e);
  }
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced push after local edits. */
export function schedulePush(delayMs = 2500) {
  if (applyingRemote || !useAuthStore.getState().user) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushChanges();
  }, delayMs);
}

// ---------- device ownership ----------

const OWNER_KEY = "mila:owner";

/**
 * Before syncing a signed-in user: if this device's local data belongs to a different account,
 * clear it so one person's notes never merge into another's account. Data made while signed out
 * (no owner yet) is merged into the first account that signs in.
 */
export async function claimDevice(userId: string) {
  let owner: string | null = null;
  try {
    owner = localStorage.getItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
  if (owner && owner !== userId) await clearPersonalData();
  try {
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* ignore */
  }
}

/** Remove personal study data from this device (on sign-out, or when another account signs in). */
export async function clearPersonalData() {
  asRemote(() => {
    useStudyStore.setState({ modules: [], nodes: [], tasks: [], cards: [], reviewLogs: [], plans: {} });
    useNotebookStore.getState().replaceAll([]);
    useTimerStore.setState({ sessions: [] });
    const theme = useThemeStore.getState();
    const fallback = theme.active.basedOn ? getPreset(theme.active.basedOn) : undefined;
    useThemeStore.setState({ custom: [], ...(getPreset(theme.active.id) ? {} : { active: fallback ?? theme.active, dirty: false }) });
  });
  await deleteImage(PAINTING_KEY).catch(() => undefined);
  asRemote(() => useRoomStore.getState().setPainting(false));
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
}

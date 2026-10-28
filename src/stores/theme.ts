import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localJSONStorage } from "@/lib/storage";
import { importTheme, newThemeId, safeTheme, themeListSchema } from "@/theme/io";
import { DEFAULT_PRESET, getPreset } from "@/theme/presets";
import type { RoomTheme, Theme, ThemeTokens } from "@/theme/schema";

type ThemeState = {
  /** The theme currently applied (a preset, a saved custom theme, or either with live edits). */
  active: Theme;
  /** Saved custom themes. */
  custom: Theme[];
  /** True when `active` has edits that are not saved to a preset or custom theme. */
  dirty: boolean;
  selectTheme: (id: string) => void;
  setTokens: (patch: Partial<ThemeTokens>) => void;
  setRoom: (patch: Partial<RoomTheme>) => void;
  /** Discard edits and return to the saved version of the active theme (or its base preset). */
  revert: () => void;
  /** Save the active theme. Custom themes are updated in place; presets are saved as a new custom theme. */
  save: (name?: string) => Theme;
  saveAsNew: (name: string) => Theme;
  deleteCustom: (id: string) => void;
  importFromJson: (text: string) => { ok: true; theme: Theme } | { ok: false; error: string };
};

function findSaved(id: string, custom: Theme[]): Theme | undefined {
  return getPreset(id) ?? custom.find((t) => t.id === id);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      active: DEFAULT_PRESET,
      custom: [],
      dirty: false,

      selectTheme: (id) => {
        const theme = findSaved(id, get().custom);
        if (theme) set({ active: theme, dirty: false });
      },

      setTokens: (patch) => set((s) => ({ active: { ...s.active, tokens: { ...s.active.tokens, ...patch } }, dirty: true })),

      setRoom: (patch) => set((s) => ({ active: { ...s.active, room: { ...s.active.room, ...patch } }, dirty: true })),

      revert: () => {
        const { active, custom } = get();
        const saved = findSaved(active.id, custom) ?? (active.basedOn ? findSaved(active.basedOn, custom) : undefined);
        set({ active: saved ?? DEFAULT_PRESET, dirty: false });
      },

      save: (name) => {
        const { active, custom } = get();
        if (getPreset(active.id)) return get().saveAsNew(name ?? `${active.name} (mine)`);
        const updated = { ...active, name: name?.trim() || active.name, updatedAt: Date.now() };
        set({ active: updated, custom: custom.map((t) => (t.id === updated.id ? updated : t)), dirty: false });
        return updated;
      },

      saveAsNew: (name) => {
        const { active, custom } = get();
        const theme: Theme = {
          ...active,
          id: newThemeId(),
          name: name.trim().slice(0, 48) || "My theme",
          basedOn: getPreset(active.id) ? active.id : active.basedOn,
          updatedAt: Date.now(),
        };
        set({ active: theme, custom: [...custom, theme], dirty: false });
        return theme;
      },

      deleteCustom: (id) => {
        const { active, custom } = get();
        const remaining = custom.filter((t) => t.id !== id);
        const fallback = active.basedOn ? getPreset(active.basedOn) : undefined;
        set({ custom: remaining, ...(active.id === id ? { active: fallback ?? DEFAULT_PRESET, dirty: false } : {}) });
      },

      importFromJson: (text) => {
        const result = importTheme(text);
        if (result.ok) set((s) => ({ custom: [...s.custom, result.theme], active: result.theme, dirty: false }));
        return result;
      },
    }),
    {
      name: "mila:theme",
      version: 1,
      storage: localJSONStorage,
      partialize: (s) => ({ active: s.active, custom: s.custom, dirty: s.dirty }),
      // Never trust storage blindly: a corrupt or outdated theme falls back to the default preset.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ThemeState>;
        const custom = themeListSchema.safeParse(p.custom).success ? (p.custom as Theme[]) : [];
        const active = safeTheme(p.active) ?? current.active;
        return { ...current, custom, active, dirty: Boolean(p.dirty) && active !== current.active };
      },
    },
  ),
);

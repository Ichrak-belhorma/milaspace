import { createJSONStorage } from "zustand/middleware";

/**
 * localStorage that degrades to a no-op (private mode, blocked storage, SSR) instead of throwing.
 * Phase 2 adds a Supabase sync layer on top of these local stores.
 */
const safeLocalStorage = {
  getItem(name: string): string | null {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem(name: string, value: string): void {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  },
  removeItem(name: string): void {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const localJSONStorage = createJSONStorage(() => safeLocalStorage);

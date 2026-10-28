import { create } from "zustand";

export type SyncState = "idle" | "syncing" | "error" | "setup-needed";

type AuthStore = {
  status: "unconfigured" | "loading" | "signed-out" | "signed-in";
  user: { id: string; email: string | null } | null;
  sync: { state: SyncState; lastSyncedAt: number | null; message: string | null };
  setUser: (user: AuthStore["user"]) => void;
  setStatus: (status: AuthStore["status"]) => void;
  setSync: (patch: Partial<AuthStore["sync"]>) => void;
};

/** Session and cloud-sync status. Not persisted: Supabase keeps the session itself. */
export const useAuthStore = create<AuthStore>()((set) => ({
  status: "loading",
  user: null,
  sync: { state: "idle", lastSyncedAt: null, message: null },
  setUser: (user) => set({ user, status: user ? "signed-in" : "signed-out" }),
  setStatus: (status) => set({ status }),
  setSync: (patch) => set((s) => ({ sync: { ...s.sync, ...patch } })),
}));

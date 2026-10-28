/**
 * Pure merge logic for local-first sync. `known` maps each id to the stamp it had when it was last
 * seen on the server, which is how deletions are told apart from new rows:
 * - local only + known  → deleted on another device → drop locally
 * - local only + new    → created here → upload
 * - remote only + known → deleted here → delete remotely
 * - remote only + new   → created elsewhere → add locally
 * - both                → newest stamp wins (ties go to the server)
 */
export type Keyed<T> = { key: (item: T) => string; stamp: (item: T) => number };

export type ReconcileResult<T> = {
  merged: T[];
  upload: T[];
  remove: string[];
  /** The new "last seen on the server" record. */
  known: Record<string, number>;
};

export function reconcile<T>(local: T[], remote: T[], known: Record<string, number>, { key, stamp }: Keyed<T>): ReconcileResult<T> {
  const localById = new Map(local.map((l) => [key(l), l]));
  const remoteById = new Map(remote.map((r) => [key(r), r]));
  const merged: T[] = [];
  const upload: T[] = [];
  const remove: string[] = [];

  for (const [id, l] of localById) {
    const r = remoteById.get(id);
    if (r) {
      if (stamp(l) > stamp(r)) {
        merged.push(l);
        upload.push(l);
      } else merged.push(r);
    } else if (!(id in known)) {
      merged.push(l);
      upload.push(l);
    }
  }
  for (const [id, r] of remoteById) {
    if (localById.has(id)) continue;
    if (id in known) remove.push(id);
    else merged.push(r);
  }
  const next: Record<string, number> = {};
  for (const m of merged) next[key(m)] = stamp(m);
  return { merged, upload, remove, known: next };
}

/** Changes since the last successful sync, for cheap pushes between full syncs. */
export function changesSince<T>(local: T[], known: Record<string, number>, { key, stamp }: Keyed<T>): { upload: T[]; remove: string[] } {
  const ids = new Set(local.map(key));
  return {
    upload: local.filter((l) => !(key(l) in known) || stamp(l) > known[key(l)]!),
    remove: Object.keys(known).filter((id) => !ids.has(id)),
  };
}

/**
 * Local image storage (IndexedDB) for user pictures such as the room painting. Images are
 * downscaled and cover-cropped in the browser before storing, so they stay small.
 * When signed in, src/lib/sync mirrors them to Supabase Storage.
 */
const DB_NAME = "mila-media";
const STORE = "images";
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export function putImage(key: string, blob: Blob): Promise<IDBValidKey> {
  return tx("readwrite", (s) => s.put(blob, key));
}

export async function getImage(key: string): Promise<Blob | undefined> {
  try {
    return (await tx<Blob | undefined>("readonly", (s) => s.get(key))) ?? undefined;
  } catch {
    return undefined;
  }
}

export function deleteImage(key: string): Promise<undefined> {
  return tx("readwrite", (s) => s.delete(key));
}

export type PrepareResult = { ok: true; blob: Blob } | { ok: false; error: string };

/** Validate, cover-crop to `aspect` (width / height) and downscale to at most `maxWidth` wide. */
export async function prepareImage(file: File, aspect: number, maxWidth = 720): Promise<PrepareResult> {
  if (!file.type.startsWith("image/")) return { ok: false, error: "That file isn't an image." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That image is over 15 MB. Try a smaller one." };
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "Couldn't read that image." };
  }
  const srcAspect = bitmap.width / bitmap.height;
  const sw = srcAspect > aspect ? bitmap.height * aspect : bitmap.width;
  const sh = srcAspect > aspect ? bitmap.height : bitmap.width / aspect;
  const width = Math.min(maxWidth, Math.round(sw));
  const height = Math.round(width / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, width, height);
  bitmap.close();
  // Encode synchronously: toBlob's callback can wait a long time behind a busy render loop.
  const blob = dataUrlToBlob(canvas.toDataURL("image/jpeg", 0.86));
  return blob ? { ok: true, blob } : { ok: false, error: "Couldn't process that image." };
}

function dataUrlToBlob(url: string): Blob | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(url);
  if (!match) return null;
  const bytes = Uint8Array.from(atob(match[2]!), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

export const PAINTING_KEY = "painting";
/** The painting's visible canvas inside its frame (width / height). */
export const PAINTING_ASPECT = 0.44 / 0.58;

"use client";

import { useEffect, useState } from "react";
import type { AiError, AiStatus } from "./contracts";

let statusPromise: Promise<boolean> | null = null;

function fetchEnabled(): Promise<boolean> {
  statusPromise ??= fetch("/api/ai/status")
    .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : { enabled: false }))
    .then((s) => s.enabled)
    .catch(() => false);
  return statusPromise;
}

/** Whether the server has AI switched on. `null` while checking. */
export function useAiEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    fetchEnabled().then((e) => live && setEnabled(e));
    return () => {
      live = false;
    };
  }, []);
  return enabled;
}

export type AiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** POST to an AI route; errors come back as a friendly message, never a throw. */
export async function postAi<T>(path: string, body: unknown, signal?: AbortSignal): Promise<AiResult<T>> {
  try {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    const err = (await res.json().catch(() => null)) as AiError | null;
    return { ok: false, message: err?.message ?? `Something went wrong (${res.status}).` };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { ok: false, message: "Cancelled." };
    return { ok: false, message: "Couldn't reach Mila's server. Check your connection." };
  }
}

/** File → base64 (no data: prefix). */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

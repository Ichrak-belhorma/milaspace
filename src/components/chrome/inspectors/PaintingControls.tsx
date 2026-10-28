"use client";

import { useRef, useState } from "react";
import { ImageIcon, ResetIcon } from "@/components/icons";
import { deleteImage, PAINTING_ASPECT, PAINTING_KEY, prepareImage, putImage } from "@/lib/media";
import { useRoomStore } from "@/stores/room";

/** Hang your own picture in the frame above the desk (cropped to fit). */
export function PaintingControls() {
  const custom = useRoomStore((s) => s.painting.custom);
  const setPainting = useRoomStore((s) => s.setPainting);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "busy" | "error" | "ok"; text: string } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ kind: "busy", text: "Framing your picture…" });
    const prepared = await prepareImage(file, PAINTING_ASPECT);
    if (!prepared.ok) {
      setStatus({ kind: "error", text: prepared.error });
      return;
    }
    try {
      await putImage(PAINTING_KEY, prepared.blob);
    } catch {
      setStatus({ kind: "error", text: "Couldn't save the picture in this browser." });
      return;
    }
    // Signed in, the room change also uploads the picture to your account.
    setPainting(true);
    setStatus({ kind: "ok", text: "Hung on the wall." });
  };

  return (
    <>
      <p className="text-sm text-ink-muted">Put your own picture in the frame above your desk. It&rsquo;s cropped to fit.</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose a picture"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-accent text-sm" onClick={() => fileRef.current?.click()} disabled={status?.kind === "busy"}>
          <ImageIcon size={16} /> Choose a picture
        </button>
        <button
          type="button"
          className="btn btn-soft text-sm"
          disabled={!custom}
          onClick={async () => {
            await deleteImage(PAINTING_KEY).catch(() => undefined);
            setPainting(false);
            setStatus({ kind: "ok", text: "Back to the original print." });
          }}
        >
          <ResetIcon size={16} /> Original print
        </button>
      </div>
      {status && (
        <p role={status.kind === "error" ? "alert" : "status"} className="text-sm">
          {status.text}
        </p>
      )}
    </>
  );
}

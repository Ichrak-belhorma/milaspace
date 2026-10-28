"use client";

import { useEffect, useState } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { useUiStore } from "@/stores/ui";

/** Brief visual confirmation of room actions; the same text goes to screen readers. */
export function Toast() {
  const announcement = useUiStore((s) => s.announcement);
  const [expiredId, setExpiredId] = useState<number | null>(null);

  useEffect(() => {
    if (!announcement) return;
    const t = setTimeout(() => setExpiredId(announcement.id), 2200);
    return () => clearTimeout(t);
  }, [announcement]);

  const visible = announcement && announcement.id !== expiredId ? announcement : null;
  return (
    <>
      <div aria-live="polite" className="sr-only">
        {announcement?.text}
      </div>
      {visible && (
        <GlassSurface key={visible.id} aria-hidden edges={[]} className="anim-rise pointer-events-none" contentClassName="px-3 py-1.5 text-sm font-semibold">
          {visible.text}
        </GlassSurface>
      )}
    </>
  );
}

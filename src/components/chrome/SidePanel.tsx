"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { CloseIcon } from "@/components/icons";
import { useUiStore } from "@/stores/ui";

/**
 * Non-modal side panel. The room, timer and object bar stay visible and usable while it is open
 * (decorating must never block studying). Focus moves into the panel on open and back on close.
 */
export function SidePanel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  const close = useUiStore((s) => s.closePanel);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = headingRef.current?.closest(".glass");
    // Respect a child that already took focus (e.g. the notebook's input); otherwise focus the heading.
    if (!panel?.contains(document.activeElement)) headingRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <GlassSurface
      as="aside"
      aria-label={title}
      edges={["top"]}
      ornamentScale={0.8}
      className="anim-slide-in pointer-events-auto flex max-h-full w-full flex-col sm:w-[22rem]"
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-2 font-display text-lg outline-none">
          {icon}
          {title}
        </h2>
        <button type="button" className="btn btn-icon" onClick={close} aria-label={`Close ${title}`}>
          <CloseIcon size={18} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </GlassSurface>
  );
}

"use client";

import type { ReactNode } from "react";
import { SparkleIcon } from "@/components/icons";
import type { TaskKind } from "@/study/types";

export const KIND_LABEL: Record<TaskKind, string> = {
  learn: "Learn",
  review: "Review",
  practice: "Practice",
  flashcards: "Cards",
  buffer: "Buffer",
};

export function KindBadge({ kind }: { kind: TaskKind }) {
  return <span className="well shrink-0 px-1.5 py-0.5 text-[0.7rem] font-semibold tracking-wide text-ink-muted uppercase">{KIND_LABEL[kind]}</span>;
}

export function minutesLabel(m: number): string {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`;
}

/** A clearly-labelled placeholder for features that are designed but not switched on yet. */
export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="well flex gap-3 p-4">
      <SparkleIcon size={20} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex flex-col gap-1">
        <h3 className="font-display">{title}</h3>
        <p className="text-sm text-ink-muted">{children}</p>
      </div>
    </div>
  );
}

/**
 * Button for an AI action. Disabled (with the reason) while the server check runs or when AI isn't
 * switched on; shows a working label while busy.
 */
export function AiButton({ label, busyLabel, enabled, busy = false, disabled = false, onClick }: { label: string; busyLabel?: string; enabled: boolean | null; busy?: boolean; disabled?: boolean; onClick?: () => void }) {
  const off = enabled === false;
  return (
    <button
      type="button"
      className="btn btn-soft text-sm"
      disabled={!enabled || busy || disabled}
      aria-busy={busy || undefined}
      title={off ? "AI isn't switched on for this Mila (the server needs an Anthropic key)" : undefined}
      onClick={onClick}
    >
      <SparkleIcon size={16} className={busy ? "anim-pulse" : undefined} /> {busy ? (busyLabel ?? "Working…") : label}
      {off && <span className="well px-1.5 text-[0.7rem]">off</span>}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
}

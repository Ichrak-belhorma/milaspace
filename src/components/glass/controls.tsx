"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format,
  hideLabel,
  className,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  const shown = format ? format(value) : String(value);
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className={cn("flex items-baseline justify-between gap-2 text-sm", hideLabel && "sr-only")}>
        <label htmlFor={id}>{label}</label>
        <span className="text-ink-muted tabular-nums text-xs">{shown}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-glass-sm py-1.5 text-left text-sm"
    >
      <span className="flex flex-col">
        <span>{label}</span>
        {description && <span className="text-xs text-ink-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-ink/20",
        )}
      >
        <span
          className={cn(
            "absolute top-1 left-1 h-4 w-4 rounded-full transition-transform",
            checked ? "translate-x-5 bg-on-accent" : "bg-ink/70",
          )}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("well flex flex-wrap gap-1 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          data-active={o.value === value}
          onClick={() => onChange(o.value)}
          className="btn min-h-8 flex-1 px-2 py-1 text-sm"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <label htmlFor={id}>{label}</label>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs text-ink-muted">{value}</span>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 rounded-glass-sm border border-ink/20 bg-transparent p-0.5"
        />
      </span>
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="field w-auto max-w-[60%] py-1">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Section({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group well px-3 py-2">
      <summary className="label flex list-none items-center justify-between py-1 [&::-webkit-details-marker]:hidden">
        {title}
        <span aria-hidden className="transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-3 pt-2 pb-1">{children}</div>
    </details>
  );
}

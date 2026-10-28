"use client";

import type { ReactNode } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { LaptopIcon, MilaMark, MusicIcon, NotebookIcon, PaletteIcon, PauseIcon, PlayIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { useTimerStore } from "@/stores/timer";
import { useUiStore, type PanelId } from "@/stores/ui";
import { formatClock, remainingMs } from "@/timer/machine";

function NavButton({ icon, label, ...rest }: { icon: ReactNode; label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="btn px-2.5 sm:px-3" {...rest}>
      {icon}
      <span className="hidden md:inline">{label}</span>
      <span className="sr-only md:hidden">{label}</span>
    </button>
  );
}

function TimerChip() {
  const timer = useTimerStore((s) => s.timer);
  const toggle = useTimerStore((s) => s.toggle);
  const now = useNow(timer.status === "running" ? 500 : 30_000);
  const running = timer.status === "running";
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-soft gap-1.5 px-2.5 font-display tabular-nums"
      aria-label={`${running ? "Pause" : "Start"} timer, ${formatClock(remainingMs(timer, now))} left`}
    >
      {running ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
      {formatClock(remainingMs(timer, now))}
    </button>
  );
}

/** The floating glass navbar with the theme's ornamental edge. */
export function Navbar() {
  const panel = useUiStore((s) => s.panel);
  const view = useUiStore((s) => s.view);
  const { togglePanel, openLaptop, closeLaptop } = useUiStore.getState();
  const panelButton = (id: PanelId) => ({ "aria-expanded": panel === id, onClick: () => togglePanel(id) });

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-3">
      <GlassSurface as="nav" aria-label="Main" className="pointer-events-auto w-full max-w-3xl" contentClassName="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3">
        <a href="#object-bar" className="sr-only-focusable btn btn-soft absolute left-2 z-10 text-sm">
          Skip to room objects
        </a>
        <span className="flex items-center gap-2 pr-1">
          <MilaMark />
          <span className="font-display text-xl tracking-wide">Mila</span>
        </span>
        <div className="flex flex-1 items-center justify-center gap-0.5 sm:gap-1">
          <NavButton icon={<LaptopIcon size={18} />} label="Study" aria-pressed={view === "laptop"} onClick={() => (view === "laptop" ? closeLaptop() : openLaptop())} />
          <NavButton icon={<NotebookIcon size={18} />} label="Today" {...panelButton("notebook")} />
          <NavButton icon={<MusicIcon size={18} />} label="Ambience" {...panelButton("ambience")} />
          <NavButton icon={<PaletteIcon size={18} />} label="Theme" {...panelButton("theme")} />
        </div>
        <TimerChip />
      </GlassSurface>
    </header>
  );
}

"use client";

import type { ReactNode } from "react";
import { GlassSurface } from "@/components/glass/GlassSurface";
import { LaptopIcon, MilaMark, MusicIcon, NotebookIcon, PaletteIcon, PauseIcon, PlayIcon, UserIcon } from "@/components/icons";
import { useAuthStore } from "@/stores/auth";
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

function AccountButton({ expanded, onClick }: { expanded: boolean; onClick: () => void }) {
  const status = useAuthStore((s) => s.status);
  const sync = useAuthStore((s) => s.sync.state);
  const signedIn = status === "signed-in";
  const label = signedIn ? (sync === "error" || sync === "setup-needed" ? "Account (sync needs attention)" : "Account (signed in)") : "Account and sync";
  return (
    <button type="button" className="btn btn-icon relative" aria-expanded={expanded} onClick={onClick} aria-label={label} title={label}>
      <UserIcon size={18} />
      {signedIn && <span aria-hidden className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${sync === "error" || sync === "setup-needed" ? "bg-accent-2" : "bg-accent"}`} />}
    </button>
  );
}

/** The floating glass navbar with the theme's ornamental edge. */
export function Navbar() {
  const panel = useUiStore((s) => s.panel);
  const studying = useUiStore((s) => s.focus === "laptop");
  const { togglePanel, openLaptop, closeLaptop } = useUiStore.getState();
  const panelButton = (id: PanelId) => ({ "aria-expanded": panel === id, onClick: () => togglePanel(id) });

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-3">
      <GlassSurface as="nav" aria-label="Main" className="pointer-events-auto w-full max-w-3xl" contentClassName="flex items-center gap-1 px-2 py-1.5 sm:gap-2 sm:px-3">
        <a href="#object-bar" className="sr-only-focusable btn btn-soft absolute left-2 z-10 text-sm">
          Skip to room objects
        </a>
        <span className="flex items-center gap-2 pr-1" aria-label="Mila">
          <MilaMark />
          <span className="hidden font-display text-xl tracking-wide min-[440px]:inline">Mila</span>
        </span>
        <div className="flex flex-1 items-center justify-center gap-0.5 sm:gap-1">
          <NavButton icon={<LaptopIcon size={18} />} label="Study" aria-pressed={studying} onClick={() => (studying ? closeLaptop() : openLaptop())} />
          <NavButton icon={<NotebookIcon size={18} />} label="Today" {...panelButton("notebook")} />
          <NavButton icon={<MusicIcon size={18} />} label="Ambience" {...panelButton("ambience")} />
          <NavButton icon={<PaletteIcon size={18} />} label="Theme" {...panelButton("theme")} />
        </div>
        <TimerChip />
        <AccountButton expanded={panel === "account"} onClick={() => togglePanel("account")} />
      </GlassSurface>
    </header>
  );
}

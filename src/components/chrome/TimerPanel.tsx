"use client";

import { Section, Slider, Switch } from "@/components/glass/controls";
import { TimerIcon } from "@/components/icons";
import { useTimerStore } from "@/stores/timer";
import { SidePanel } from "./SidePanel";

const timeFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

export function TimerPanel() {
  const settings = useTimerStore((s) => s.settings);
  const sessions = useTimerStore((s) => s.sessions);
  const update = useTimerStore((s) => s.updateSettings);
  const recent = sessions.slice(-8).reverse();
  const minutes = (v: number) => `${v} min`;

  return (
    <SidePanel title="Focus timer" icon={<TimerIcon size={18} />}>
      <div className="flex flex-col gap-3">
        <Section title="Lengths" defaultOpen>
          <Slider label="Focus" min={5} max={90} step={5} value={settings.focusMin} format={minutes} onChange={(v) => update({ focusMin: v })} />
          <Slider label="Short break" min={1} max={30} step={1} value={settings.shortBreakMin} format={minutes} onChange={(v) => update({ shortBreakMin: v })} />
          <Slider label="Long break" min={5} max={60} step={5} value={settings.longBreakMin} format={minutes} onChange={(v) => update({ longBreakMin: v })} />
          <Slider
            label="Long break after"
            min={2}
            max={8}
            step={1}
            value={settings.longBreakEvery}
            format={(v) => `${v} focus blocks`}
            onChange={(v) => update({ longBreakEvery: v })}
          />
        </Section>
        <Section title="Flow" defaultOpen>
          <Switch label="Start breaks automatically" checked={settings.autoStartBreaks} onChange={(v) => update({ autoStartBreaks: v })} />
          <Switch
            label="Start focus automatically"
            description="Off by default so a break never ends with a surprise"
            checked={settings.autoStartFocus}
            onChange={(v) => update({ autoStartFocus: v })}
          />
          <Switch label="Chime when a phase ends" checked={settings.chime} onChange={(v) => update({ chime: v })} />
        </Section>
        <Section title="Recent focus" defaultOpen>
          {recent.length === 0 ? (
            <p className="text-sm text-ink-muted">Your focus sessions will show up here. Even 5 minutes counts.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {recent.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span>{timeFmt.format(s.startedAt)}</span>
                  <span className="tabular-nums text-ink-muted">
                    {s.minutes} min{s.completed ? "" : " (partial)"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </SidePanel>
  );
}

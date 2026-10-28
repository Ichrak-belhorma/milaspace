"use client";

import type { ComponentType } from "react";
import { Slider, Switch } from "@/components/glass/controls";
import { MoonIcon, NotebookIcon, RainIcon, SnowIcon, SparkleIcon, SunIcon, SunsetIcon } from "@/components/icons";
import { useRoomStore, WEATHERS, type Weather } from "@/stores/room";
import { useUiStore } from "@/stores/ui";

const WEATHER_META: Record<Weather, { label: string; icon: ComponentType<{ size?: number }> }> = {
  clear: { label: "Clear", icon: SunIcon },
  rain: { label: "Rain", icon: RainIcon },
  snow: { label: "Snow", icon: SnowIcon },
  night: { label: "Night", icon: MoonIcon },
  sunset: { label: "Sunset", icon: SunsetIcon },
};

const warmthLabel = (v: number) => (v < 0.34 ? "Cool" : v < 0.67 ? "Neutral" : "Warm");

export function LampControls() {
  const lamp = useRoomStore((s) => s.lamp);
  const setLamp = useRoomStore((s) => s.setLamp);
  return (
    <>
      <Switch label="Lamp" checked={lamp.on} onChange={(on) => setLamp({ on })} />
      <Slider label="Warmth" value={lamp.warmth} onChange={(warmth) => setLamp({ warmth })} format={warmthLabel} />
      <Slider label="Brightness" value={lamp.brightness} min={0.1} onChange={(brightness) => setLamp({ brightness })} format={(v) => `${Math.round(v * 100)}%`} />
    </>
  );
}

export function WindowControls() {
  const win = useRoomStore((s) => s.window);
  const curtainsClosed = useRoomStore((s) => s.curtainsClosed);
  const { toggleWindow, setWeather, toggleCurtains } = useRoomStore.getState();
  return (
    <>
      <Switch label="Window open" description="Open windows let the weather sound in" checked={win.open} onChange={toggleWindow} />
      <Switch label="Curtains drawn" description="Dims the daylight and muffles the outside" checked={curtainsClosed} onChange={toggleCurtains} />
      <div role="radiogroup" aria-label="Weather" className="grid grid-cols-5 gap-1">
        {WEATHERS.map((w) => {
          const { label, icon: Icon } = WEATHER_META[w];
          return (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={win.weather === w}
              data-active={win.weather === w}
              onClick={() => setWeather(w)}
              className="btn flex-col gap-1 px-1 py-2 text-xs font-normal"
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}

export function DrawerContents() {
  const { openLaptop, openPanel } = useUiStore.getState();
  return (
    <>
      <p className="text-sm text-ink-muted">Your notebook and a stack of flashcards are inside.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn btn-soft text-sm" onClick={() => openLaptop("flashcards")}>
          <SparkleIcon size={16} /> Flashcards
        </button>
        <button type="button" className="btn btn-soft text-sm" onClick={() => openPanel("notebook")}>
          <NotebookIcon size={16} /> Notebook
        </button>
      </div>
    </>
  );
}

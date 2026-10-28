"use client";

import { useRef } from "react";
import { Section, Slider } from "@/components/glass/controls";
import { MusicIcon, MuteIcon, PauseIcon, PlayIcon, PlusIcon, SkipIcon, VolumeIcon } from "@/components/icons";
import { AMBIENT_LAYERS, AMBIENT_LAYER_IDS, MUSIC_TRACKS } from "@/audio/registry";
import { uid } from "@/lib/id";
import { useAudioStore } from "@/stores/audio";
import { useRoomStore } from "@/stores/room";
import { SidePanel } from "./SidePanel";

const pct = (v: number) => (v === 0 ? "Off" : `${Math.round(v * 100)}%`);

export function useTrackList() {
  const userTracks = useAudioStore((s) => s.userTracks);
  return [
    ...MUSIC_TRACKS.map((t) => ({ id: t.id, title: t.title, artist: t.artist })),
    ...userTracks.map((t) => ({ id: t.id, title: t.title, artist: "Your file" })),
  ];
}

export function AmbiencePanel() {
  const a = useAudioStore();
  const weather = useRoomStore((s) => s.window);
  const tracks = useTrackList();
  const fileRef = useRef<HTMLInputElement>(null);
  const current = tracks.find((t) => t.id === a.music.trackId) ?? tracks[0];

  const nextTrack = () => {
    const i = tracks.findIndex((t) => t.id === a.music.trackId);
    const next = tracks[(i + 1) % tracks.length];
    if (next) a.setMusic({ trackId: next.id, playing: true });
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    let last: string | null = null;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) continue;
      const id = uid("ut_");
      a.addUserTrack({ id, title: file.name.replace(/\.[^.]+$/, ""), url: URL.createObjectURL(file) });
      last = id;
    }
    if (last) a.setMusic({ trackId: last, playing: true });
  };

  return (
    <SidePanel title="Ambience" icon={<MusicIcon size={18} />}>
      <div className="flex flex-col gap-3">
        <div className="well flex items-center gap-3 px-3 py-2">
          <button type="button" className="btn btn-icon" onClick={a.toggleMute} aria-pressed={a.muted} aria-label={a.muted ? "Unmute" : "Mute"}>
            {a.muted ? <MuteIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
          <Slider label="Master volume" hideLabel value={a.masterVolume} onChange={a.setMaster} format={pct} className="flex-1" />
        </div>

        <Section title="Music" defaultOpen>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-accent btn-icon"
              onClick={() => a.setMusic({ playing: !a.music.playing })}
              aria-label={a.music.playing ? "Pause music" : "Play music"}
            >
              {a.music.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{current?.title}</p>
              <p className="truncate text-xs text-ink-muted">{current?.artist}</p>
            </div>
            <button type="button" className="btn btn-icon" onClick={nextTrack} aria-label="Next track" disabled={tracks.length < 2}>
              <SkipIcon size={16} />
            </button>
          </div>
          <Slider label="Music volume" value={a.music.volume} onChange={(v) => a.setMusic({ volume: v })} format={pct} />
          <ul className="flex flex-col gap-1" aria-label="Tracks">
            {tracks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className="btn w-full justify-start px-2 py-1 text-sm font-normal"
                  data-active={t.id === a.music.trackId}
                  onClick={() => a.setMusic({ trackId: t.id, playing: true })}
                >
                  <MusicIcon size={14} /> <span className="truncate">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <input ref={fileRef} type="file" accept="audio/*" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} tabIndex={-1} />
          <button type="button" className="btn btn-soft text-sm" onClick={() => fileRef.current?.click()}>
            <PlusIcon size={16} /> Play your own music file
          </button>
          <p className="text-xs text-ink-muted">Your files stay on this device and are forgotten when you close the tab.</p>
        </Section>

        <Section title="Sound layers" defaultOpen>
          {AMBIENT_LAYER_IDS.map((id) => (
            <Slider key={id} label={AMBIENT_LAYERS[id].label} value={a.layers[id]} onChange={(v) => a.setLayer(id, v)} format={pct} />
          ))}
          <Slider
            label={`Outside (${weather.weather}, window ${weather.open ? "open" : "closed"})`}
            value={a.weatherVolume}
            onChange={a.setWeatherVolume}
            format={pct}
          />
          <Slider label="Room sounds (clicks, coffee, drawer)" value={a.sfxVolume} onChange={a.setSfxVolume} format={pct} />
        </Section>
      </div>
    </SidePanel>
  );
}

"use client";

import { Switch } from "@/components/glass/controls";
import { FlameIcon, PauseIcon, PlayIcon, SkipIcon } from "@/components/icons";
import { useNow } from "@/hooks/useNow";
import { dayKey } from "@/lib/day";
import { useAudioStore } from "@/stores/audio";
import { useRoomStore } from "@/stores/room";
import { useTimerStore } from "@/stores/timer";
import { currentStreak, minutesOn } from "@/timer/stats";
import { useTrackList } from "../AmbiencePanel";

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });

/**
 * The phone: clock, music controls and today's focus. No feeds, no notifications. The main
 * feature is flipping it face-down while you study.
 */
export function PhoneScreen() {
  const now = useNow(15_000);
  const faceDown = useRoomStore((s) => s.phone.faceDown);
  const setFaceDown = useRoomStore((s) => s.setPhoneFaceDown);
  const music = useAudioStore((s) => s.music);
  const setMusic = useAudioStore((s) => s.setMusic);
  const sessions = useTimerStore((s) => s.sessions);
  const tracks = useTrackList();
  const track = tracks.find((t) => t.id === music.trackId) ?? tracks[0];

  if (faceDown) {
    return (
      <>
        <p className="text-sm">Your phone is face-down. Out of sight, out of mind.</p>
        <button type="button" className="btn btn-soft text-sm" onClick={() => setFaceDown(false)}>
          Flip it over
        </button>
      </>
    );
  }

  const next = () => {
    const i = tracks.findIndex((t) => t.id === music.trackId);
    const n = tracks[(i + 1) % tracks.length];
    if (n) setMusic({ trackId: n.id, playing: true });
  };

  return (
    <>
      <div className="text-center">
        <p className="font-display text-5xl leading-none tabular-nums">{timeFmt.format(now)}</p>
        <p className="mt-1 text-sm text-ink-muted">{dateFmt.format(now)}</p>
      </div>
      <div className="well flex items-center gap-2 px-3 py-2">
        <button type="button" className="btn btn-icon btn-accent" onClick={() => setMusic({ playing: !music.playing })} aria-label={music.playing ? "Pause music" : "Play music"}>
          {music.playing ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm">{track?.title}</span>
        <button type="button" className="btn btn-icon" onClick={next} aria-label="Next track" disabled={tracks.length < 2}>
          <SkipIcon size={16} />
        </button>
      </div>
      <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
        <FlameIcon size={14} /> {Math.round(minutesOn(sessions, dayKey(now)))} min today ·{" "}
        {currentStreak(sessions, now) > 0 ? `${currentStreak(sessions, now)}-day streak` : "no streak yet"}
      </p>
      <Switch label="Flip face-down" description="Put it out of sight while you study" checked={faceDown} onChange={setFaceDown} />
    </>
  );
}

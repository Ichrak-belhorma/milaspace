import type { Weather } from "@/stores/room";
import { gain, type SoundSource } from "./nodes";
import { AMBIENT_LAYERS, AMBIENT_LAYER_IDS, WEATHER_SOUNDS, type AmbientLayerId, type SoundSpec } from "./registry";
import { playSfx, type SfxId } from "./sfx";

export type AudioSnapshot = {
  master: number;
  muted: boolean;
  layers: Record<AmbientLayerId, number>;
  weather: Weather;
  windowOpen: boolean;
  curtainsClosed: boolean;
  weatherVolume: number;
  sfxVolume: number;
  music: { playing: boolean; volume: number; key: string; spec: SoundSpec | null };
};

type Slot = { out: AudioNode; gain: GainNode; source: SoundSource | null; key: string | null };

/** Perceptual volume curve: sliders feel linear to the ear. */
const curve = (v: number) => v * v;

/**
 * Singleton audio graph: master → { ambience layers, weather (window-filtered), music, sfx }.
 * The AudioContext is created on the first user gesture (browser autoplay rules); until then
 * `apply` just remembers the latest snapshot.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private weatherFilter!: BiquadFilterNode;
  private layers = new Map<string, Slot>();
  private weatherSlot!: Slot;
  private musicSlot!: Slot;
  private pending: AudioSnapshot | null = null;
  private onTrackEnded: (() => void) | null = null;

  get unlocked(): boolean {
    return this.ctx !== null;
  }

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = gain(ctx, 0);
    this.master.connect(ctx.destination);
    this.sfxBus = gain(ctx, 0.6);
    this.sfxBus.connect(this.master);
    this.weatherFilter = ctx.createBiquadFilter();
    this.weatherFilter.type = "lowpass";
    this.weatherFilter.frequency.value = 900;
    this.weatherFilter.connect(this.master);
    this.weatherSlot = this.makeSlot(this.weatherFilter);
    this.musicSlot = this.makeSlot(this.master);
    for (const id of AMBIENT_LAYER_IDS) this.layers.set(id, this.makeSlot(this.master));
    if (this.pending) this.apply(this.pending);
  }

  setOnTrackEnded(fn: (() => void) | null): void {
    this.onTrackEnded = fn;
  }

  apply(s: AudioSnapshot): void {
    this.pending = s;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.master.gain.setTargetAtTime(s.muted ? 0 : curve(s.master), now, 0.08);
    this.sfxBus.gain.setTargetAtTime(curve(s.sfxVolume), now, 0.05);

    for (const id of AMBIENT_LAYER_IDS) {
      const v = s.layers[id] ?? 0;
      this.drive(this.layers.get(id)!, v > 0 ? id : null, AMBIENT_LAYERS[id].sound, curve(v));
    }

    // Closed window: quieter and muffled. Open: full and bright. Drawn curtains soften either.
    const cutoff = s.windowOpen ? (s.curtainsClosed ? 3500 : 14000) : s.curtainsClosed ? 650 : 900;
    this.weatherFilter.frequency.setTargetAtTime(cutoff, now, 0.25);
    const weatherLevel = curve(s.weatherVolume) * (s.windowOpen ? 1 : 0.45) * (s.curtainsClosed ? 0.65 : 1);
    this.drive(this.weatherSlot, s.weatherVolume > 0 ? s.weather : null, WEATHER_SOUNDS[s.weather], weatherLevel);

    const m = s.music;
    this.drive(this.musicSlot, m.playing && m.spec ? m.key : null, m.spec, curve(m.volume));
  }

  sfx(id: SfxId): void {
    if (this.ctx && this.ctx.state === "running") playSfx(this.ctx, this.sfxBus, id);
  }

  private makeSlot(out: AudioNode): Slot {
    const g = gain(this.ctx!, 0);
    g.connect(out);
    return { out, gain: g, source: null, key: null };
  }

  /**
   * Make a slot play `key` at `level`. A new key fades the old source out on its own gain node
   * while the new one fades in; a null key just fades out.
   */
  private drive(slot: Slot, key: string | null, spec: SoundSpec | null, level: number): void {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (key && spec && slot.key === key && slot.source) {
      slot.gain.gain.setTargetAtTime(level, now, 0.15);
      return;
    }
    if (slot.source) {
      const { source, gain: g } = slot;
      g.gain.setTargetAtTime(0, now, 0.25);
      setTimeout(() => {
        source.stop();
        g.disconnect();
      }, 1200);
      slot.source = null;
      slot.key = null;
      slot.gain = gain(ctx, 0);
      slot.gain.connect(slot.out);
    }
    if (!key || !spec) return;
    slot.source = this.createSource(spec, slot.gain);
    slot.key = key;
    slot.gain.gain.setValueAtTime(0, now);
    slot.gain.gain.setTargetAtTime(level, now, 0.4);
  }

  private createSource(spec: SoundSpec, out: AudioNode): SoundSource {
    const ctx = this.ctx!;
    if (spec.kind === "procedural") return spec.factory(ctx, out);
    const el = new Audio(spec.src);
    el.crossOrigin = "anonymous";
    el.loop = false;
    const node = ctx.createMediaElementSource(el);
    node.connect(out);
    el.addEventListener("ended", () => this.onTrackEnded?.());
    void el.play().catch(() => this.onTrackEnded?.());
    return {
      stop: () => {
        el.pause();
        node.disconnect();
        el.src = "";
      },
    };
  }
}

export const audioEngine = new AudioEngine();

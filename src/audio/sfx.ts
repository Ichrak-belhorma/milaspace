import { filter, gain, noiseBurst, noiseBuffer, rand, tone } from "./nodes";

/** A soft swell of filtered noise: sheets, fabric, curtains. */
function swish(ctx: AudioContext, out: AudioNode, opts: { t?: number; from: number; to: number; peak: number; attack: number; length: number; color?: "white" | "pink" | "brown" }) {
  const t = opts.t ?? ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, opts.color ?? "pink");
  const bp = filter(ctx, "bandpass", opts.from, 0.9);
  bp.frequency.setValueAtTime(opts.from, t);
  bp.frequency.exponentialRampToValueAtTime(opts.to, t + opts.length);
  const g = gain(ctx, 0);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(opts.peak, t + opts.attack);
  g.gain.linearRampToValueAtTime(0, t + opts.length);
  const p = ctx.createStereoPanner();
  p.pan.value = rand(-0.5, 0.5);
  src.connect(bp).connect(g).connect(p).connect(out);
  src.start(t, Math.random() * 3);
  src.stop(t + opts.length + 0.05);
}

export const SFX = ["click", "switch", "chime", "pour", "sip", "drawer", "window", "rustle", "flop", "curtain", "tap", "chair", "alarm"] as const;
export type SfxId = (typeof SFX)[number];

/** One-shot UI and room sounds, synthesized so Phase 1 ships without audio files. */
export function playSfx(ctx: AudioContext, out: AudioNode, id: SfxId): void {
  const t = ctx.currentTime;
  switch (id) {
    case "click":
      noiseBurst(ctx, out, { type: "highpass", freq: 3200, peak: 0.5, decay: 0.012 });
      tone(ctx, out, { freq: rand(1750, 2050), peak: 0.18, decay: 0.03 });
      break;
    case "switch":
      noiseBurst(ctx, out, { type: "highpass", freq: 2000, peak: 0.4, decay: 0.01 });
      tone(ctx, out, { freq: 1150, peak: 0.12, decay: 0.03 });
      noiseBurst(ctx, out, { t: t + 0.05, type: "highpass", freq: 2400, peak: 0.25, decay: 0.01 });
      break;
    case "chime":
      // Two soft bell notes (G5 → C6) with inharmonic partials.
      [784, 1046.5].forEach((f, i) => {
        const at = t + i * 0.28;
        tone(ctx, out, { t: at, freq: f, peak: 0.22, attack: 0.008, decay: 2.2 });
        tone(ctx, out, { t: at, freq: f * 2.76, peak: 0.05, attack: 0.008, decay: 0.9 });
        tone(ctx, out, { t: at, freq: f * 5.4, peak: 0.015, attack: 0.008, decay: 0.4 });
      });
      break;
    case "pour": {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, "white");
      const bp = filter(ctx, "bandpass", 450, 4);
      bp.frequency.setValueAtTime(450, t);
      bp.frequency.exponentialRampToValueAtTime(1500, t + 1.3);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.25, t + 0.08);
      g.gain.setValueAtTime(0.25, t + 1.1);
      g.gain.linearRampToValueAtTime(0, t + 1.4);
      src.connect(bp).connect(g).connect(out);
      src.start(t);
      src.stop(t + 1.5);
      break;
    }
    case "sip":
      noiseBurst(ctx, out, { freq: 1300, q: 2, peak: 0.12, decay: 0.22 });
      break;
    case "drawer": {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, "brown");
      const bp = filter(ctx, "bandpass", 260, 1.5);
      bp.frequency.linearRampToValueAtTime(420, t + 0.3);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(0.5, t + 0.04);
      g.gain.linearRampToValueAtTime(0, t + 0.32);
      src.connect(bp).connect(g).connect(out);
      src.start(t);
      src.stop(t + 0.4);
      tone(ctx, out, { t: t + 0.3, freq: 95, peak: 0.3, decay: 0.12 });
      break;
    }
    case "alarm":
      // A gentle marimba-like arpeggio, not a klaxon.
      [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25].forEach((f, i) => {
        tone(ctx, out, { t: t + i * 0.16, freq: f, peak: 0.2, attack: 0.005, decay: 0.45 });
        tone(ctx, out, { t: t + i * 0.16, freq: f * 4, peak: 0.03, attack: 0.005, decay: 0.12 });
      });
      break;
    case "rustle":
      swish(ctx, out, { from: rand(1500, 2400), to: rand(2400, 3600), peak: rand(0.05, 0.1), attack: 0.09, length: rand(0.3, 0.5) });
      break;
    case "flop":
      noiseBurst(ctx, out, { type: "lowpass", freq: 260, peak: 0.5, decay: 0.25, color: "brown" });
      swish(ctx, out, { t: t + 0.05, from: 1200, to: 3000, peak: 0.14, attack: 0.12, length: 0.8 });
      swish(ctx, out, { t: t + 0.6, from: 2200, to: 1600, peak: 0.07, attack: 0.1, length: 0.5 });
      break;
    case "curtain":
      swish(ctx, out, { from: 700, to: 2600, peak: 0.12, attack: 0.15, length: 0.7, color: "white" });
      for (let i = 0; i < 4; i++) tone(ctx, out, { t: t + 0.05 + i * 0.09, freq: rand(2800, 3400), peak: 0.03, decay: 0.05 });
      break;
    case "tap":
      tone(ctx, out, { freq: 2600, peak: 0.05, decay: 0.03 });
      tone(ctx, out, { t: t + 0.06, freq: 3300, peak: 0.04, decay: 0.05 });
      break;
    case "chair": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.linearRampToValueAtTime(150, t + 0.22);
      const bp = filter(ctx, "bandpass", 600, 5);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(0.04, t + 0.04);
      g.gain.linearRampToValueAtTime(0, t + 0.25);
      osc.connect(bp).connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.3);
      noiseBurst(ctx, out, { t: t + 0.22, type: "lowpass", freq: 300, peak: 0.25, decay: 0.12, color: "brown" });
      break;
    }
    case "window": {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(170, t);
      osc.frequency.linearRampToValueAtTime(240, t + 0.35);
      const bp = filter(ctx, "bandpass", 900, 6);
      const g = gain(ctx, 0);
      g.gain.linearRampToValueAtTime(0.05, t + 0.05);
      g.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.connect(bp).connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.45);
      break;
    }
  }
}

import { filter, gain, noiseBurst, noiseBuffer, rand, tone } from "./nodes";

export const SFX = ["click", "switch", "chime", "pour", "sip", "drawer", "window"] as const;
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

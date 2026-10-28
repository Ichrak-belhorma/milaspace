/** Small Web Audio helpers shared by the procedural sounds. */

export type SoundSource = { stop: () => void };
export type SoundFactory = (ctx: AudioContext, out: AudioNode) => SoundSource;
export type NoiseColor = "white" | "pink" | "brown";

const noiseCache = new WeakMap<AudioContext, Partial<Record<NoiseColor, AudioBuffer>>>();

/** A cached 4-second stereo noise buffer per context and color. */
export function noiseBuffer(ctx: AudioContext, color: NoiseColor): AudioBuffer {
  const cache = noiseCache.get(ctx) ?? {};
  noiseCache.set(ctx, cache);
  const hit = cache[color];
  if (hit) return hit;

  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (color === "white") {
        data[i] = white * 0.5;
      } else if (color === "pink") {
        // Paul Kellet's refined pink noise filter.
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    }
  }
  cache[color] = buffer;
  return buffer;
}

export function loopNoise(ctx: AudioContext, color: NoiseColor): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, color);
  src.loop = true;
  src.start(0, Math.random() * 3.5);
  return src;
}

export function filter(ctx: AudioContext, type: BiquadFilterType, frequency: number, Q = 0.7): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

export function gain(ctx: AudioContext, value: number): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Call `fn` repeatedly at random intervals until cancelled. */
export function every(minMs: number, maxMs: number, fn: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let live = true;
  const loop = () => {
    timer = setTimeout(() => {
      if (!live) return;
      fn();
      loop();
    }, rand(minMs, maxMs));
  };
  loop();
  return () => {
    live = false;
    if (timer) clearTimeout(timer);
  };
}

/** A short enveloped noise burst (drops, crackles, hats). */
export function noiseBurst(
  ctx: AudioContext,
  out: AudioNode,
  opts: { t?: number; type?: BiquadFilterType; freq: number; q?: number; peak: number; decay: number; pan?: number; color?: NoiseColor },
): void {
  const t = opts.t ?? ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, opts.color ?? "white");
  const f = filter(ctx, opts.type ?? "bandpass", opts.freq, opts.q ?? 1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.peak), t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
  const p = ctx.createStereoPanner();
  p.pan.value = opts.pan ?? 0;
  src.connect(f).connect(g).connect(p).connect(out);
  src.start(t, Math.random() * 3);
  src.stop(t + opts.decay + 0.05);
}

/** A sine/triangle blip with an exponential decay and optional pitch sweep. */
export function tone(
  ctx: AudioContext,
  out: AudioNode,
  opts: { t?: number; freq: number; to?: number; type?: OscillatorType; peak: number; attack?: number; decay: number; pan?: number },
): void {
  const t = opts.t ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + opts.decay * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.peak), t + (opts.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.decay);
  const p = ctx.createStereoPanner();
  p.pan.value = opts.pan ?? 0;
  osc.connect(g).connect(p).connect(out);
  osc.start(t);
  osc.stop(t + opts.decay + 0.05);
}

/** Stop sources and disconnect a bus after a short tail. */
export function teardown(bus: AudioNode, sources: AudioScheduledSourceNode[], cancels: (() => void)[]): SoundSource {
  return {
    stop: () => {
      cancels.forEach((c) => c());
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      setTimeout(() => bus.disconnect(), 200);
    },
  };
}

import { every, filter, gain, loopNoise, noiseBurst, rand, teardown, tone, type SoundFactory } from "../nodes";

/** Rain: a pink-noise wash, a low rumble and scattered droplets. */
export const rain: SoundFactory = (ctx, out) => {
  const bus = gain(ctx, 1);
  bus.connect(out);
  const wash = loopNoise(ctx, "pink");
  wash.connect(filter(ctx, "highpass", 400)).connect(filter(ctx, "lowpass", 5200)).connect(gain(ctx, 0.6)).connect(bus);
  const rumble = loopNoise(ctx, "brown");
  rumble.connect(filter(ctx, "lowpass", 380)).connect(gain(ctx, 0.35)).connect(bus);
  const drops = every(20, 90, () =>
    noiseBurst(ctx, bus, { freq: rand(2200, 7000), q: 3, peak: rand(0.03, 0.12), decay: rand(0.02, 0.06), pan: rand(-0.9, 0.9) }),
  );
  return teardown(bus, [wash, rumble], [drops]);
};

/** Fireplace: low roar plus clustered crackles and the occasional pop. */
export const fireplace: SoundFactory = (ctx, out) => {
  const bus = gain(ctx, 1);
  bus.connect(out);
  const roar = loopNoise(ctx, "brown");
  roar.connect(filter(ctx, "lowpass", 260)).connect(gain(ctx, 0.55)).connect(bus);
  const breath = loopNoise(ctx, "pink");
  const breathGain = gain(ctx, 0.05);
  breath.connect(filter(ctx, "bandpass", 650, 0.7)).connect(breathGain).connect(bus);
  const flicker = every(250, 700, () => breathGain.gain.setTargetAtTime(rand(0.02, 0.09), ctx.currentTime, 0.2));
  const crackles = every(40, 260, () => {
    const n = 1 + Math.floor(Math.random() * 4);
    const pan = rand(-0.5, 0.5);
    for (let i = 0; i < n; i++) {
      noiseBurst(ctx, bus, { t: ctx.currentTime + i * rand(0.008, 0.04), type: "highpass", freq: rand(1800, 5000), peak: rand(0.05, 0.35), decay: rand(0.004, 0.02), pan });
    }
  });
  const pops = every(1500, 5000, () => noiseBurst(ctx, bus, { freq: rand(300, 800), q: 2, peak: rand(0.15, 0.4), decay: 0.09, pan: rand(-0.4, 0.4) }));
  return teardown(bus, [roar, breath], [flicker, crackles, pops]);
};

/** Café: overlapping voice-band murmurs, room tone and cups clinking. */
export const cafe: SoundFactory = (ctx, out) => {
  const bus = gain(ctx, 2.2);
  bus.connect(out);
  const sources: AudioBufferSourceNode[] = [];
  const cancels: (() => void)[] = [];
  for (let i = 0; i < 5; i++) {
    const src = loopNoise(ctx, "pink");
    const g = gain(ctx, 0);
    const p = ctx.createStereoPanner();
    p.pan.value = rand(-0.8, 0.8);
    src.connect(filter(ctx, "bandpass", rand(280, 1100), rand(1.6, 3))).connect(g).connect(p).connect(bus);
    sources.push(src);
    // Syllable-like amplitude: random targets every 100–320 ms, with pauses.
    cancels.push(every(100, 320, () => g.gain.setTargetAtTime(Math.random() < 0.25 ? 0 : rand(0.08, 0.3), ctx.currentTime, 0.05)));
  }
  const tone0 = loopNoise(ctx, "brown");
  tone0.connect(filter(ctx, "lowpass", 220)).connect(gain(ctx, 0.18)).connect(bus);
  sources.push(tone0);
  cancels.push(
    every(2500, 7000, () => {
      const f = rand(2200, 4200);
      const pan = rand(-0.7, 0.7);
      tone(ctx, bus, { freq: f, peak: rand(0.03, 0.07), decay: 0.45, pan });
      tone(ctx, bus, { freq: f * 2.71, peak: 0.02, decay: 0.25, pan });
      if (Math.random() < 0.4) tone(ctx, bus, { t: ctx.currentTime + 0.12, freq: f * 1.06, peak: 0.04, decay: 0.35, pan });
    }),
  );
  return teardown(bus, sources, cancels);
};

/** Wind: band-passed noise with a slowly wandering center and level. */
export function wind(strength: number): SoundFactory {
  return (ctx, out) => {
    const bus = gain(ctx, 1);
    bus.connect(out);
    const src = loopNoise(ctx, "pink");
    const bp = filter(ctx, "bandpass", 500, 0.8);
    const g = gain(ctx, 0.2 * strength);
    src.connect(bp).connect(g).connect(bus);
    const drift = every(1800, 4000, () => {
      bp.frequency.setTargetAtTime(rand(280, 950), ctx.currentTime, 1.2);
      g.gain.setTargetAtTime(rand(0.1, 0.4) * strength, ctx.currentTime, 1.5);
    });
    return teardown(bus, [src], [drift]);
  };
}

/** Birdsong: short phrases of pitch-swept chirps. */
export function birds(density: number): SoundFactory {
  return (ctx, out) => {
    const bus = gain(ctx, 1);
    bus.connect(out);
    const phrases = every(2500 / density, 9000 / density, () => {
      const base = rand(2600, 4200);
      const pan = rand(-0.8, 0.8);
      let t = ctx.currentTime;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const len = rand(0.06, 0.12);
        tone(ctx, bus, { t, freq: base * rand(0.9, 1.1), to: base * rand(0.7, 1.4), peak: rand(0.02, 0.05), decay: len, pan });
        t += len + rand(0.05, 0.14);
      }
    });
    return teardown(bus, [], [phrases]);
  };
}

/** Crickets: two insects pulsing in groups at slightly different pitches. */
export const crickets: SoundFactory = (ctx, out) => {
  const bus = gain(ctx, 1);
  bus.connect(out);
  const cricket = (freq: number, pan: number) =>
    every(650, 1100, () => {
      const t0 = ctx.currentTime;
      for (let i = 0; i < 3; i++) tone(ctx, bus, { t: t0 + i * 0.045, freq, peak: 0.025, attack: 0.003, decay: 0.022, pan });
    });
  return teardown(bus, [], [cricket(4400, -0.5), cricket(4750, 0.6)]);
};

/** Layer several factories into one source. */
export function layered(...factories: SoundFactory[]): SoundFactory {
  return (ctx, out) => {
    const parts = factories.map((f) => f(ctx, out));
    return { stop: () => parts.forEach((p) => p.stop()) };
  };
}

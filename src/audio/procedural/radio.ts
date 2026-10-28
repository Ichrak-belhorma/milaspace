import { every, filter, gain, loopNoise, noiseBurst, rand, type SoundFactory } from "../nodes";

/**
 * "Mila Radio": an endless generative lo-fi loop (keys, bass, soft drums, vinyl crackle) scheduled
 * on the audio clock with a lookahead timer. A placeholder until licensed tracks are added.
 */
type Chord = { notes: number[]; bass: number };

const PROGRESSIONS: Chord[][] = [
  [
    { notes: [53, 57, 60, 64, 67], bass: 41 }, // Fmaj9
    { notes: [52, 55, 59, 62, 66], bass: 40 }, // Em9
    { notes: [50, 53, 57, 60, 64], bass: 38 }, // Dm9
    { notes: [48, 52, 55, 59, 62], bass: 36 }, // Cmaj9
  ],
  [
    { notes: [55, 60, 64, 71], bass: 45 }, // Am9
    { notes: [53, 57, 60, 64], bass: 38 }, // Dm9
    { notes: [53, 59, 64], bass: 43 }, // G13
    { notes: [52, 55, 59, 64], bass: 36 }, // Cmaj7
  ],
];

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

function keys(ctx: AudioContext, out: AudioNode, midi: number, t: number, dur: number, vel: number) {
  const f = midiHz(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vel, t + 0.015);
  g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 1.2);
  g.gain.setValueAtTime(vel * 0.35, t + dur);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
  const lp = filter(ctx, "lowpass", 1700);
  g.connect(lp).connect(out);
  for (const [type, ratio, level] of [["sine", 1, 1], ["triangle", 1.0015, 0.5], ["sine", 2, 0.12]] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = f * ratio;
    const og = gain(ctx, level);
    osc.connect(og).connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.6);
  }
}

function bass(ctx: AudioContext, out: AudioNode, midi: number, t: number, dur: number) {
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = midiHz(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter(ctx, "lowpass", 420)).connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function kick(ctx: AudioContext, out: AudioNode, t: number, vel: number) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(130, t);
  osc.frequency.exponentialRampToValueAtTime(46, t + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.75 * vel, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.4);
}

export const milaRadio: SoundFactory = (ctx, out) => {
  const bus = gain(ctx, 2.2);
  const warmth = filter(ctx, "lowpass", 3600);
  bus.connect(warmth).connect(out);

  // Vinyl: faint hiss plus sparse crackle.
  const hiss = loopNoise(ctx, "pink");
  hiss.connect(filter(ctx, "highpass", 1200)).connect(gain(ctx, 0.025)).connect(bus);
  const crackle = every(60, 500, () => noiseBurst(ctx, bus, { type: "highpass", freq: 2500, peak: rand(0.01, 0.06), decay: 0.006 }));

  const bpm = 74;
  const step = 60 / bpm / 4;
  let nextTime = ctx.currentTime + 0.1;
  let stepIndex = 0;
  let bar = 0;
  let progression = PROGRESSIONS[0]!;
  let melodySteps = new Set<number>();

  const playStep = (s: number, t: number) => {
    const chord = progression[bar % progression.length]!;
    const breakdown = bar % 16 >= 14; // two bars without drums every 16
    if (s === 0) {
      chord.notes.forEach((n, i) => keys(ctx, bus, n, t + i * 0.012, step * 15, 0.05));
      melodySteps = new Set([2, 6, 8, 11, 14].filter(() => Math.random() < 0.35));
    }
    if (s === 0 || s === 10) bass(ctx, bus, chord.bass, t, step * (s === 0 ? 9 : 5));
    if (melodySteps.has(s)) {
      const n = chord.notes[Math.floor(Math.random() * chord.notes.length)]! + 12;
      keys(ctx, bus, n, t, step * 3, 0.035);
    }
    if (breakdown) return;
    if (s === 0 || s === 10 || (s === 7 && Math.random() < 0.3)) kick(ctx, bus, t, s === 0 ? 1 : 0.8);
    if (s === 4 || s === 12) {
      noiseBurst(ctx, bus, { t, freq: 1700, q: 0.8, peak: 0.16, decay: 0.17 });
      noiseBurst(ctx, bus, { t, type: "lowpass", freq: 400, peak: 0.08, decay: 0.07, color: "brown" });
    }
    if (s % 2 === 0) {
      const swing = s % 4 === 2 ? step * 0.3 : 0;
      noiseBurst(ctx, bus, { t: t + swing, type: "highpass", freq: 7000, peak: rand(0.03, 0.07), decay: 0.035, pan: 0.25 });
    }
  };

  const timer = setInterval(() => {
    while (nextTime < ctx.currentTime + 0.15) {
      playStep(stepIndex, nextTime);
      nextTime += step;
      stepIndex = (stepIndex + 1) % 16;
      if (stepIndex === 0) {
        bar += 1;
        if (bar % 8 === 0) progression = PROGRESSIONS[Math.floor(Math.random() * PROGRESSIONS.length)]!;
      }
    }
  }, 30);

  return {
    stop: () => {
      clearInterval(timer);
      crackle();
      try {
        hiss.stop();
      } catch {
        /* already stopped */
      }
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      setTimeout(() => bus.disconnect(), 1500);
    },
  };
};

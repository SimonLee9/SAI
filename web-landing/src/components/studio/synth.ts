// Web Audio synthesis voices for the Studio multi-track sequencer.
// All voices are pure synthesis — no audio samples, no external assets.
// Each `play*` function schedules its complete envelope at `time` and is
// safe to call multiple times in advance from a look-ahead scheduler.

export type DrumKind = "kick" | "snare" | "hat" | "clap";

export type MelodyOsc = "sine" | "triangle" | "square";

// ---------------------------------------------------------------------------
// Drums — synthesised, no samples
// ---------------------------------------------------------------------------

/**
 * Kick: short low sine sweep (110 Hz → 40 Hz over ~80 ms) with a fast
 * amplitude attack and a 250 ms exponential tail. The pitch sweep gives
 * the "thump → boom" character without needing a sample.
 */
export function playKick(ctx: AudioContext, time: number, dest: AudioNode) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.85, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

  osc.connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.3);
}

/**
 * Snare: highpass-filtered white-noise burst (the "snap") layered with a
 * 200 Hz body tone (the "thwack"). 150 ms total length.
 */
export function playSnare(ctx: AudioContext, time: number, dest: AudioNode) {
  // Noise component
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; ++i) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "highpass";
  noiseFilter.frequency.value = 1000;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, time);
  noiseGain.gain.linearRampToValueAtTime(0.5, time + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

  noise.connect(noiseFilter).connect(noiseGain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.2);

  // Body tone
  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.value = 200;
  const bodyGain = ctx.createGain();
  bodyGain.gain.setValueAtTime(0, time);
  bodyGain.gain.linearRampToValueAtTime(0.35, time + 0.005);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

  body.connect(bodyGain).connect(dest);
  body.start(time);
  body.stop(time + 0.12);
}

/**
 * Hat: very short highpass-filtered noise burst, ~40 ms.
 */
export function playHat(ctx: AudioContext, time: number, dest: AudioNode) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; ++i) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7000;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.28, time + 0.001);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.06);
}

/**
 * Clap: classic "stacked taps" — four very short bandpass-filtered noise
 * bursts at ~1.5 kHz with small offsets, sounds like two hands meeting.
 */
export function playClap(ctx: AudioContext, time: number, dest: AudioNode) {
  for (const offset of [0, 0.012, 0.022, 0.034]) {
    playClapHit(ctx, time + offset, dest);
  }
}

function playClapHit(ctx: AudioContext, time: number, dest: AudioNode) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; ++i) data[i] = Math.random() * 2 - 1;
  noise.buffer = buf;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1500;
  filter.Q.value = 1.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.3, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

  noise.connect(filter).connect(gain).connect(dest);
  noise.start(time);
  noise.stop(time + 0.06);
}

const DRUM_FNS: Record<DrumKind, (ctx: AudioContext, time: number, dest: AudioNode) => void> = {
  kick:  playKick,
  snare: playSnare,
  hat:   playHat,
  clap:  playClap,
};

export function playDrum(kind: DrumKind, ctx: AudioContext, time: number, dest: AudioNode) {
  DRUM_FNS[kind](ctx, time, dest);
}

// ---------------------------------------------------------------------------
// Bass — saw oscillator into a lowpass with a quick filter envelope.
// The cutoff sweeps from open to closed, giving each note the
// "punchy → mellow" bass synth signature.
// ---------------------------------------------------------------------------
export function playBass(ctx: AudioContext, time: number, freq: number, dest: AudioNode) {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 6;
  // Cutoff envelope: opens to ~freq*8, closes to ~freq*2 over 200 ms.
  filter.frequency.setValueAtTime(freq * 8, time);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 2), time + 0.2);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.35, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

  osc.connect(filter).connect(gain).connect(dest);
  osc.start(time);
  osc.stop(time + 0.36);
}

// ---------------------------------------------------------------------------
// Melody — selectable oscillator with a simple ADSR-style envelope.
// 5 ms attack, exponential 280 ms release. Multiple notes per step
// stack polyphonically because each call creates its own osc + gain.
// ---------------------------------------------------------------------------
export function playMelody(
  ctx: AudioContext,
  time: number,
  freq: number,
  dest: AudioNode,
  osc: MelodyOsc,
) {
  const o = ctx.createOscillator();
  o.type = osc;
  o.frequency.value = freq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.22, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

  o.connect(gain).connect(dest);
  o.start(time);
  o.stop(time + 0.32);
}

// ---------------------------------------------------------------------------
// Pad — chord stab with long exponential release. Each freq gets its own
// sawtooth+triangle pair through a shared lowpass for a warm cluster.
// All voices in `freqs` start at `time` and ring for ~1.5 s.
// ---------------------------------------------------------------------------
export function playPad(
  ctx: AudioContext, time: number, freqs: number[], dest: AudioNode,
) {
  if (freqs.length === 0) return;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;

  const gain = ctx.createGain();
  // Voice-count-normalised so 3-note chords aren't 3× louder than 1-note.
  const peak = 0.16 / Math.sqrt(freqs.length);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

  filter.connect(gain).connect(dest);

  for (const f of freqs) {
    const a = ctx.createOscillator();
    a.type = "sawtooth";
    a.frequency.value = f;
    const b = ctx.createOscillator();
    b.type = "triangle";
    b.frequency.value = f * 1.005;       // slight detune
    a.connect(filter);
    b.connect(filter);
    // Stop 100 ms past the envelope tail to avoid clicks (matches playKick/playBass).
    a.start(time); a.stop(time + 1.6);
    b.start(time); b.stop(time + 1.6);
  }
}

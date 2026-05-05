// Master-bus audio effects. Reverb is a synthesised IR through a
// ConvolverNode (no audio assets). Master filter is a single lowpass
// for the XY pad to drive in real time.

export const FILTER_DEFAULTS = { cutoff: 8000, q: 0.5 };

/**
 * Synthesise a stereo reverb impulse — exponential noise decay.
 *
 * `decay` higher = faster fade-out. 3 ≈ a "small room" tail at 1.5 s.
 */
export function makeReverbIR(
  ctx: AudioContext, durationSec: number, decay: number,
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(durationSec * sampleRate);
  const ir = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ++ch) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; ++i) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return ir;
}

export function makeMasterFilter(ctx: AudioContext): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = FILTER_DEFAULTS.cutoff;
  filter.Q.value = FILTER_DEFAULTS.q;
  return filter;
}

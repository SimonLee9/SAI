import { describe, it, expect } from "vitest";
import { MockAudioContext } from "../../test/audio-mock";
import { makeReverbIR, makeMasterFilter, FILTER_DEFAULTS } from "./audioFx";

describe("audioFx — makeReverbIR", () => {
  it("returns a stereo buffer of the requested length", () => {
    const ctx = new MockAudioContext() as unknown as AudioContext;
    const ir = makeReverbIR(ctx, 1.5, 3);
    expect(ir.length).toBe(Math.floor(1.5 * 48000));
  });
});

describe("audioFx — makeMasterFilter", () => {
  it("creates a lowpass biquad with the documented defaults", () => {
    const ctx = new MockAudioContext() as unknown as AudioContext;
    const filter = makeMasterFilter(ctx);
    expect(filter.type).toBe("lowpass");
    expect(filter.frequency.value).toBe(FILTER_DEFAULTS.cutoff);
    expect(filter.Q.value).toBe(FILTER_DEFAULTS.q);
  });
});

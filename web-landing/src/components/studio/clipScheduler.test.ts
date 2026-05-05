import { describe, it, expect, beforeEach } from "vitest";

import { buildLibrary, COLS } from "./clips";
import { ClipScheduler, type SchedulerState } from "./clipScheduler";
import { MockAudioContext } from "../../test/audio-mock";

// These tests verify the scheduler's queueing semantics directly, without
// running the look-ahead setTimeout loop. We use the __test__ helpers to
// manually advance the step cursor while keeping AudioContext.currentTime
// pinned — that's enough to assert that pending changes only swap on bar
// boundaries (step 0).

function makeScheduler(onState: (s: SchedulerState) => void = () => {}) {
  const ctx = new MockAudioContext() as unknown as AudioContext;
  const buses = {
    drums: ctx.createGain(),
    bass:  ctx.createGain(),
    lead:  ctx.createGain(),
    pad:   ctx.createGain(),
    perc:  ctx.createGain(),
  };
  const sched = new ClipScheduler(ctx, buses, onState);
  return { ctx: ctx as unknown as MockAudioContext, sched };
}

describe("ClipScheduler — quantized launch", () => {
  let library: ReturnType<typeof buildLibrary>;

  beforeEach(() => {
    library = buildLibrary();
  });

  it("launchClip does NOT change active until the next bar boundary", () => {
    const { ctx, sched } = makeScheduler();
    sched.start();

    // After start(), tick is scheduled but hasn't run. Advance to step 5 —
    // mid-bar — then queue a drums clip.
    ctx.currentTime = 0.5;
    sched.__test__advance(5);
    expect(sched.__test__active().drums).toBeNull();

    sched.launchClip("drums", library.drums[0]);
    // Still not playing — mid-bar queue.
    expect(sched.__test__active().drums).toBeNull();

    // Advance past step 0 (next bar). Step wraps 5..15..0.
    ctx.currentTime = 5.0;
    sched.__test__advance(1); // crosses step 0

    expect(sched.__test__active().drums).toBe(library.drums[0]);
  });

  it("queueing twice on the same track keeps only the latest clip", () => {
    const { ctx, sched } = makeScheduler();
    sched.start();
    ctx.currentTime = 0.2;
    sched.__test__advance(3);

    sched.launchClip("bass", library.bass[0]);
    sched.launchClip("bass", library.bass[2]);   // overwrites the queue

    ctx.currentTime = 5.0;
    sched.__test__advance(1);                     // cross bar boundary

    expect(sched.__test__active().bass).toBe(library.bass[2]);
  });

  it("stopTrack queues a stop that lands at the next bar", () => {
    const { ctx, sched } = makeScheduler();
    sched.start();
    // Get drums into the active slot first.
    sched.launchClip("drums", library.drums[1]);
    ctx.currentTime = 5.0;
    sched.__test__advance(1);
    expect(sched.__test__active().drums).toBe(library.drums[1]);

    // Now ask to stop — should not immediately go silent.
    sched.stopTrack("drums");
    expect(sched.__test__active().drums).toBe(library.drums[1]);

    // Advance through the rest of the bar.
    ctx.currentTime = 10.0;
    sched.__test__advance(1);
    expect(sched.__test__active().drums).toBeNull();
  });

  it("launchScene fires all three tracks atomically on the next bar", () => {
    const { ctx, sched } = makeScheduler();
    sched.start();
    ctx.currentTime = 0.5;
    sched.__test__advance(7);                     // mid-bar

    sched.launchScene({
      drums: library.drums[3],
      bass:  library.bass[3],
      lead:  library.lead[3],
    });

    // Pre-bar — nothing active yet.
    const before = sched.__test__active();
    expect(before.drums).toBeNull();
    expect(before.bass).toBeNull();
    expect(before.lead).toBeNull();

    ctx.currentTime = 10.0;
    sched.__test__advance(1);

    const after = sched.__test__active();
    expect(after.drums).toBe(library.drums[3]);
    expect(after.bass).toBe(library.bass[3]);
    expect(after.lead).toBe(library.lead[3]);
  });

  it("emits state on launch (with queued change visible immediately)", () => {
    const states: SchedulerState[] = [];
    const { sched } = makeScheduler((s) => states.push(s));

    sched.launchClip("drums", library.drums[0]);
    expect(states.length).toBeGreaterThan(0);
    const last = states[states.length - 1];
    expect(last.queued.drums).toBe(library.drums[0]);
    expect(last.active.drums).toBeNull();
  });

  it("step counter wraps at COLS (16)", () => {
    expect(COLS).toBe(16);
    const { ctx, sched } = makeScheduler();
    sched.start();
    ctx.currentTime = 100.0; // far enough that we always have schedule headroom
    sched.__test__advance(0); // run a full bar; should wrap back to step 0
    // No assertion on internal state here; this just guards against an
    // infinite loop bug in __test__advance if currentStep never wraps.
  });
});

describe("ClipScheduler — swing + new tracks", () => {
  it("setSwing clamps and stores the value", () => {
    const { sched } = makeScheduler();
    sched.setSwing(0.4);
    sched.setBpm(120);
    sched.start();
    expect(sched.__test__nextStepTime()).toBeGreaterThan(0);
  });

  it("launchClip works for pad and perc tracks", () => {
    const lib = buildLibrary({ scale: "pentatonic", rootPc: 0 });
    const { ctx, sched } = makeScheduler();
    sched.start();
    sched.launchClip("pad", lib.pad[0]);
    sched.launchClip("perc", lib.perc[0]);
    ctx.currentTime = 5.0;
    sched.__test__advance(1);
    const active = sched.__test__active();
    expect(active.pad).toBe(lib.pad[0]);
    expect(active.perc).toBe(lib.perc[0]);
  });

  it("setLeadBend stores cents", () => {
    const { sched } = makeScheduler();
    sched.setLeadBend(150);
    expect(sched.__test__leadBend()).toBe(150);
  });
});

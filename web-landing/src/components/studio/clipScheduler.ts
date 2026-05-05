// Web Audio look-ahead scheduler for the Launchpad-style pad grid.
//
// One scheduler instance owns the transport. Each track holds an "active"
// clip (currently playing) and an optional "queued" change that swaps in
// at the next bar boundary. This gives the user the snappy-but-musical
// "tap → starts on the next downbeat" feel that defines clip launchers.
//
// Uses the same look-ahead pattern as Sequencer.tsx: a setTimeout loop
// runs every 25 ms and schedules every step that falls within the next
// 100 ms of audio context time. Audio events are placed in advance so
// timing is sample-accurate even when the JS thread stalls briefly.

import { COLS, TRACKS, type Clip, type Track } from "./clips";
import { BASS_ROWS, LEAD_ROWS } from "./clips";
import { playBass, playDrum, playMelody, type DrumKind } from "./synth";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

const DRUM_LANES: ReadonlyArray<DrumKind> = ["kick", "snare", "hat", "clap"];

export type SchedulerState = {
  step: number;                                // 0..15, -1 when stopped
  active: Record<Track, Clip | null>;
  queued: Record<Track, Clip | "stop" | null>; // null = no pending change
};

type PendingChange = Clip | "stop" | null;

export type ClipSchedulerBuses = {
  drums: AudioNode;
  bass: AudioNode;
  lead: AudioNode;
};

export class ClipScheduler {
  private readonly ctx: AudioContext;
  private readonly buses: ClipSchedulerBuses;
  private readonly onState: (s: SchedulerState) => void;

  private active: Record<Track, Clip | null> = { drums: null, bass: null, lead: null, pad: null, perc: null };
  private pending: Record<Track, PendingChange> = { drums: null, bass: null, lead: null, pad: null, perc: null };

  private currentStep = 0;
  private nextStepTime = 0;
  private timer: number | null = null;
  private bpm = 108;

  constructor(
    ctx: AudioContext,
    buses: ClipSchedulerBuses,
    onState: (s: SchedulerState) => void,
  ) {
    this.ctx = ctx;
    this.buses = buses;
    this.onState = onState;
  }

  // ------------------------------------------------------------------- transport
  start() {
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    // Apply any pending changes immediately on start so the first bar
    // already includes whatever the user queued before pressing play.
    this.applyPending();
    this.tick();
  }

  stop() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit(-1);
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  // ------------------------------------------------------------------- launch API
  /** Queue a clip — swaps in at the next bar boundary. */
  launchClip(track: Track, clip: Clip) {
    this.pending[track] = clip;
    this.emit(this.currentStep);
  }

  /** Queue a stop — track goes silent at the next bar boundary. */
  stopTrack(track: Track) {
    this.pending[track] = "stop";
    this.emit(this.currentStep);
  }

  /** Cancel any pending change for a track without affecting active clip. */
  cancelPending(track: Track) {
    this.pending[track] = null;
    this.emit(this.currentStep);
  }

  /** Launch (or stop) several tracks at once — atomic on the next bar. */
  launchScene(scene: Partial<Record<Track, Clip | "stop">>) {
    for (const t of TRACKS) {
      const v = scene[t];
      if (v !== undefined) this.pending[t] = v;
    }
    this.emit(this.currentStep);
  }

  // ------------------------------------------------------------------- internals
  private tick = () => {
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      // Bar boundary: swap pending → active before scheduling step 0.
      if (this.currentStep === 0) this.applyPending();

      const step = this.currentStep;
      const time = this.nextStepTime;
      this.scheduleStep(step, time);

      // UI step indicator — fires when audio actually plays.
      const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
      window.setTimeout(() => this.emit(step), delayMs);

      const secondsPerStep = 60 / this.bpm / 4;       // 16ths
      this.nextStepTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % COLS;
    }
    this.timer = window.setTimeout(this.tick, LOOKAHEAD_MS);
  };

  private applyPending() {
    let changed = false;
    for (const t of TRACKS) {
      const p = this.pending[t];
      if (p === null) continue;
      this.active[t] = p === "stop" ? null : p;
      this.pending[t] = null;
      changed = true;
    }
    if (changed) this.emit(this.currentStep);
  }

  private scheduleStep(step: number, time: number) {
    const drumsClip = this.active.drums;
    if (drumsClip && drumsClip.kind === "drums") {
      DRUM_LANES.forEach((kind, lane) => {
        if (drumsClip.steps[lane]?.[step]) {
          playDrum(kind, this.ctx, time, this.buses.drums);
        }
      });
    }

    // Bass — monophonic (top-row hit wins) to keep the low end clean.
    const bassClip = this.active.bass;
    if (bassClip && bassClip.kind === "bass") {
      for (let row = 0; row < bassClip.steps.length; ++row) {
        if (bassClip.steps[row][step]) {
          playBass(this.ctx, time, BASS_ROWS[row].freq, this.buses.bass);
          break;
        }
      }
    }

    // Lead — polyphonic, all hits at this step ring together.
    const leadClip = this.active.lead;
    if (leadClip && leadClip.kind === "lead") {
      for (let row = 0; row < leadClip.steps.length; ++row) {
        if (leadClip.steps[row][step]) {
          void playMelody(this.ctx, time, LEAD_ROWS[row].freq, this.buses.lead, "triangle");
        }
      }
    }
  }

  private emit(step: number) {
    this.onState({
      step,
      active: { ...this.active },
      queued: { ...this.pending },
    });
  }

  // ------------------------------------------------------------------- test access
  /** @internal — exposed for tests; do not use from UI code. */
  __test__advance(toStep: number) {
    // Drive the loop forward without waiting on real timers — used in unit
    // tests that fake AudioContext.currentTime.
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      if (this.currentStep === 0) this.applyPending();
      this.scheduleStep(this.currentStep, this.nextStepTime);
      const secondsPerStep = 60 / this.bpm / 4;
      this.nextStepTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % COLS;
      if (this.currentStep === toStep) break;
    }
    this.emit(this.currentStep);
  }

  /** @internal — read-only snapshot for tests. */
  __test__active(): Record<Track, Clip | null> {
    return { ...this.active };
  }
}

// Web Audio look-ahead scheduler for the Launchpad-style pad grid.
//
// Five tracks (drums, bass, lead, pad, perc). Each track holds an
// "active" clip and an optional pending change that swaps in at the
// next bar boundary. Swing offsets odd 16ths to give shuffle feel.
// Lead pitch-bend modulates both the next-scheduled and the currently
// ringing oscillators in real time.

import { COLS, TRACKS, type Clip, type Track } from "./clips";
import { rowsFor, type LibraryOptions } from "./clips";
import {
  playBass, playDrum, playMelody, playPad, playPerc,
  type DrumKind, type PercKind,
} from "./synth";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;

const DRUM_LANES: ReadonlyArray<DrumKind> = ["kick", "snare", "hat", "clap"];
const PERC_LANES: ReadonlyArray<PercKind> = ["shaker", "rim", "tom", "cowbell"];

export type SchedulerState = {
  step: number;
  active: Record<Track, Clip | null>;
  queued: Record<Track, Clip | "stop" | null>;
};

type PendingChange = Clip | "stop" | null;

export type ClipSchedulerBuses = Record<Track, AudioNode>;

export class ClipScheduler {
  private readonly ctx: AudioContext;
  private readonly buses: ClipSchedulerBuses;
  private readonly onState: (s: SchedulerState) => void;

  private active: Record<Track, Clip | null> = {
    drums: null, bass: null, lead: null, pad: null, perc: null,
  };
  private pending: Record<Track, PendingChange> = {
    drums: null, bass: null, lead: null, pad: null, perc: null,
  };

  private currentStep = 0;
  private nextStepTime = 0;
  private timer: number | null = null;
  private bpm = 108;
  private swing = 0;
  private leadDetuneCents = 0;
  private libraryOpts: LibraryOptions = { scale: "pentatonic", rootPc: 0 };
  private activeLeadOscs = new Set<OscillatorNode>();

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
    this.applyPending();
    this.tick();
  }

  stop() {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    this.emit(-1);
  }

  setBpm(bpm: number) { this.bpm = bpm; }
  setSwing(swing: number) { this.swing = Math.max(0, Math.min(0.6, swing)); }
  setLibraryOpts(opts: LibraryOptions) { this.libraryOpts = opts; }

  setLeadBend(cents: number) {
    this.leadDetuneCents = cents;
    for (const osc of this.activeLeadOscs) {
      osc.detune.value = cents;
    }
  }

  // ------------------------------------------------------------------- launch API
  launchClip(track: Track, clip: Clip) {
    this.pending[track] = clip;
    this.emit(this.currentStep);
  }
  stopTrack(track: Track) {
    this.pending[track] = "stop";
    this.emit(this.currentStep);
  }
  cancelPending(track: Track) {
    this.pending[track] = null;
    this.emit(this.currentStep);
  }
  launchScene(scene: Partial<Record<Track, Clip | "stop">>) {
    for (const t of TRACKS) {
      const v = scene[t];
      if (v !== undefined) this.pending[t] = v;
    }
    this.emit(this.currentStep);
  }

  // ------------------------------------------------------------------- internals
  private stepDur(): number { return 60 / this.bpm / 4; }

  private tick = () => {
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      if (this.currentStep === 0) this.applyPending();
      const step = this.currentStep;
      const time = this.nextStepTime;
      this.scheduleStep(step, time);

      const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
      window.setTimeout(() => this.emit(step), delayMs);

      // Swing: every odd 16th is delayed by swing × halfStep relative to the
      // baseline grid. We compute the *next* step time accounting for this.
      const dur = this.stepDur();
      const swingShift = this.swing * (dur / 2);
      const nextStep = (this.currentStep + 1) % COLS;
      const enteringOdd = nextStep % 2 === 1;
      const leavingOdd = step % 2 === 1;
      const delta = dur + (enteringOdd ? swingShift : 0) - (leavingOdd ? swingShift : 0);
      this.nextStepTime += delta;
      this.currentStep = nextStep;
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

    const bassClip = this.active.bass;
    if (bassClip && bassClip.kind === "bass") {
      const { bass: bassRows } = rowsFor(this.libraryOpts);
      for (let row = 0; row < bassClip.steps.length; ++row) {
        if (bassClip.steps[row][step]) {
          playBass(this.ctx, time, bassRows[row].freq, this.buses.bass);
          break;
        }
      }
    }

    const leadClip = this.active.lead;
    if (leadClip && leadClip.kind === "lead") {
      const { lead: leadRows } = rowsFor(this.libraryOpts);
      for (let row = 0; row < leadClip.steps.length; ++row) {
        if (leadClip.steps[row][step]) {
          const osc = playMelody(
            this.ctx, time, leadRows[row].freq, this.buses.lead,
            "triangle", this.leadDetuneCents,
          );
          this.activeLeadOscs.add(osc);
          osc.onended = () => this.activeLeadOscs.delete(osc);
        }
      }
    }

    const padClip = this.active.pad;
    if (padClip && padClip.kind === "pad" && padClip.stabs.includes(step)) {
      const { lead: leadRows } = rowsFor(this.libraryOpts);
      // Compute chord tones from progression at this step.
      const stepsPerChord = COLS / padClip.progression.degrees.length;
      const chordIdx = Math.floor(step / stepsPerChord);
      const degree = padClip.progression.degrees[chordIdx];
      // Use chord-tone-rows logic inline: degree / +2 / +4 within scale.
      const scaleSize = leadRows.length / 2; // 2-octave melody → scaleSize per octave
      const freqs: number[] = [];
      for (const interval of [0, 2, 4]) {
        const toneDegree = ((degree - 1 + interval) % scaleSize) + 1;
        const row = leadRows.length - 1 - (toneDegree - 1);
        if (row >= 0) freqs.push(leadRows[row].freq);
      }
      playPad(this.ctx, time, freqs, this.buses.pad);
    }

    const percClip = this.active.perc;
    if (percClip && percClip.kind === "perc") {
      PERC_LANES.forEach((kind, lane) => {
        if (percClip.steps[lane]?.[step]) {
          playPerc(kind, this.ctx, time, this.buses.perc);
        }
      });
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
  __test__advance(toStep: number) {
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_S) {
      if (this.currentStep === 0) this.applyPending();
      this.scheduleStep(this.currentStep, this.nextStepTime);
      const dur = this.stepDur();
      const swingShift = this.swing * (dur / 2);
      const nextStep = (this.currentStep + 1) % COLS;
      const enteringOdd = nextStep % 2 === 1;
      const leavingOdd = this.currentStep % 2 === 1;
      const delta = dur + (enteringOdd ? swingShift : 0) - (leavingOdd ? swingShift : 0);
      this.nextStepTime += delta;
      this.currentStep = nextStep;
      if (this.currentStep === toStep) break;
    }
    this.emit(this.currentStep);
  }

  __test__active(): Record<Track, Clip | null> { return { ...this.active }; }
  __test__nextStepTime(): number { return this.nextStepTime; }
  __test__leadBend(): number { return this.leadDetuneCents; }
}

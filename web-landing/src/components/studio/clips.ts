// Clip data model + scene library for the Launchpad-style pad grid.
//
// Library is parametrised by {scale, rootPc, seed?} so the user can pick
// a key signature and re-roll individual cells. All scale-relative
// frequency lookup happens here so the scheduler can stay scale-agnostic.

import {
  DRUM_PRESETS,
  drumGridFromPreset,
  generateBass,
  generateMelody,
  makeRng,
  PROGRESSIONS,
  type ChordProgression,
} from "./generators";
import { buildScaleRows, SCALES, type ScaleId } from "./scales";

export const COLS = 16;
export const TRACKS = ["drums", "bass", "lead", "pad", "perc"] as const;
export type Track = (typeof TRACKS)[number];
export const SCENES = 8;

// Bass octave anchors at C2 (MIDI 36); melody at C4 (60). rootPc shifts both.
const BASS_ROOT_BASE   = 36;
const MELODY_ROOT_BASE = 60;
const BASS_OCTAVES     = 1;
const MELODY_OCTAVES   = 2;

// ---------------------------------------------------------------------------
// Clip types
// ---------------------------------------------------------------------------
export type DrumClip = {
  kind: "drums"; name: string;
  steps: boolean[][];                 // [4 lanes][16] — kick/snare/hat/clap
};

export type BassClip = {
  kind: "bass"; name: string;
  steps: boolean[][];                 // [bass rows][16]
  progression: ChordProgression;
};

export type LeadClip = {
  kind: "lead"; name: string;
  steps: boolean[][];                 // [lead rows][16]
};

export type PadClip = {
  kind: "pad"; name: string;
  progression: ChordProgression;
  stabs: number[];                    // 0..15 step indices where chord fires
};

export type PercClip = {
  kind: "perc"; name: string;
  steps: boolean[][];                 // [4 lanes][16] — shaker/rim/tom/cowbell
};

export type Clip = DrumClip | BassClip | LeadClip | PadClip | PercClip;

export type LibraryOptions = {
  scale: ScaleId;
  rootPc: number;                     // 0..11
  seed?: number;
};

export type SceneLibrary = Record<Track, Clip[]>;

// ---------------------------------------------------------------------------
// Scale-driven row tables
// ---------------------------------------------------------------------------
export function rowsFor(opts: LibraryOptions) {
  const scale = SCALES.find((s) => s.id === opts.scale)!;
  const bassRoot   = BASS_ROOT_BASE   + opts.rootPc;
  const melodyRoot = MELODY_ROOT_BASE + opts.rootPc;
  return {
    bass: buildScaleRows(scale, bassRoot,   BASS_OCTAVES),
    lead: buildScaleRows(scale, melodyRoot, MELODY_OCTAVES),
  };
}

// ---------------------------------------------------------------------------
// Per-cell generators
// ---------------------------------------------------------------------------
function makeDrumClip(sceneIdx: number, _opts: LibraryOptions, rng: () => number): DrumClip {
  // Deterministic preset rotation, with chance of a small variant on each beat.
  const preset = DRUM_PRESETS[Math.floor(rng() * DRUM_PRESETS.length) % DRUM_PRESETS.length];
  const steps = drumGridFromPreset(preset);
  // 30% chance to drop one snare hit (variation).
  if (rng() < 0.3) {
    const lane = 1; // snare
    const hits = steps[lane].map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
    if (hits.length > 0) {
      const dropIdx = hits[Math.floor(rng() * hits.length)];
      steps[lane][dropIdx] = false;
    }
  }
  void sceneIdx;
  return { kind: "drums", name: preset.label, steps };
}

function makeBassClip(_sceneIdx: number, opts: LibraryOptions, rng: () => number): BassClip {
  const { bass: bassRows } = rowsFor(opts);
  const scale = SCALES.find((s) => s.id === opts.scale)!;
  const result = generateBass(bassRows.length, scale.intervals.length, rng);
  return {
    kind: "bass",
    name: `${result.progression.label} · ${result.density}`,
    steps: result.grid,
    progression: result.progression,
  };
}

function makeLeadClip(_sceneIdx: number, opts: LibraryOptions, rng: () => number, prog?: ChordProgression): LeadClip {
  const { lead: leadRows } = rowsFor(opts);
  const scale = SCALES.find((s) => s.id === opts.scale)!;
  const grid = generateMelody(leadRows.length, rng, prog, scale.intervals.length);
  return { kind: "lead", name: `Lead`, steps: grid };
}

function makePadClip(sceneIdx: number, opts: LibraryOptions, rng: () => number, prog?: ChordProgression): PadClip {
  const scale = SCALES.find((s) => s.id === opts.scale)!;
  const candidates = PROGRESSIONS.filter((p) =>
    p.degrees.every((d) => d <= scale.intervals.length),
  );
  const progression = prog ?? candidates[sceneIdx % candidates.length];
  const stepsPerChord = COLS / progression.degrees.length;

  // Stab style varies by scene: half-note pulse / quarter-note pulse / syncopated.
  const styles = [
    [0],            // single stab per chord
    [0, stepsPerChord / 2],   // two
    [0, stepsPerChord / 2 + 1],  // syncopated
  ];
  const style = styles[Math.floor(rng() * styles.length)];
  const stabs: number[] = [];
  for (let c = 0; c < progression.degrees.length; ++c) {
    for (const offset of style) {
      stabs.push(c * stepsPerChord + Math.floor(offset));
    }
  }
  return {
    kind: "pad",
    name: `${progression.label}`,
    progression,
    stabs: stabs.filter((s) => s < COLS),
  };
}

function makePercClip(_sceneIdx: number, _opts: LibraryOptions, rng: () => number): PercClip {
  const empty = (): boolean[] => Array<boolean>(COLS).fill(false);
  const shaker = empty();
  // Shaker on every off-8th — recognisable groove anchor.
  for (let i = 2; i < COLS; i += 4) shaker[i] = true;
  const rim = empty();
  // Rim hits on bars 6 and 14 (off-beat accents) with chance to skip.
  if (rng() < 0.7) rim[6] = true;
  if (rng() < 0.7) rim[14] = true;
  const tom = empty();
  if (rng() < 0.4) tom[12] = true;
  const cowbell = empty();
  if (rng() < 0.3) {
    cowbell[0] = true; cowbell[8] = true;
  }
  return { kind: "perc", name: "Aux", steps: [shaker, rim, tom, cowbell] };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
const SEED_OFFSET: Record<Track, number> = {
  drums: 0xd000, bass: 0xb000, lead: 0x1e00, pad: 0xa000, perc: 0xc000,
};

function seedFor(track: Track, sceneIdx: number, opts: LibraryOptions): number {
  const base = opts.seed ?? 0xBADCAFE;
  return base ^ SEED_OFFSET[track] ^ (sceneIdx * 17);
}

export function regenerateClip(
  track: Track, sceneIdx: number, opts: LibraryOptions, seed?: number,
): Clip {
  const rng = makeRng(seed ?? seedFor(track, sceneIdx, opts));
  switch (track) {
    case "drums": return makeDrumClip(sceneIdx, opts, rng);
    case "bass":  return makeBassClip (sceneIdx, opts, rng);
    case "lead":  return makeLeadClip (sceneIdx, opts, rng);
    case "pad":   return makePadClip  (sceneIdx, opts, rng);
    case "perc":  return makePercClip (sceneIdx, opts, rng);
  }
}

const DEFAULT_OPTS: LibraryOptions = { scale: "pentatonic", rootPc: 0 };

export function buildLibrary(opts: LibraryOptions = DEFAULT_OPTS): SceneLibrary {
  const lib = { drums: [] as Clip[], bass: [] as Clip[], lead: [] as Clip[], pad: [] as Clip[], perc: [] as Clip[] };
  for (let i = 0; i < SCENES; ++i) {
    const bass = makeBassClip(i, opts, makeRng(seedFor("bass", i, opts))) as BassClip;
    lib.drums.push(makeDrumClip(i, opts, makeRng(seedFor("drums", i, opts))));
    lib.bass.push(bass);
    // Pair lead and pad with the bass progression for harmony.
    lib.lead.push(makeLeadClip(i, opts, makeRng(seedFor("lead", i, opts)), bass.progression));
    lib.pad.push (makePadClip (i, opts, makeRng(seedFor("pad",  i, opts)), bass.progression));
    lib.perc.push(makePercClip(i, opts, makeRng(seedFor("perc", i, opts))));
  }
  return lib as SceneLibrary;
}
